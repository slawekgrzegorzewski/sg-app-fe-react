import React, {JSX, useContext, useState} from "react";
import {useMutation, useQuery} from "@apollo/client/react";
import {
    BankTransactionsToImport,
    BankTransactionsToImportQuery,
    CreateExpense,
    CreateExpenseMutation,
    CreateIncome,
    CreateIncomeMutation, CreateTransfer, CreateTransferMutation
} from "../types";
import Button from "@mui/material/Button";
import {
    GQLAccount,
    GQLBankTransactionToImport,
    GQLBillingElementType,
    GQLCurrencyInfo,
    GQLExpense,
    mapAccount,
    mapBankTransactionToImport,
    mapBillingCategory,
    mapPiggyBank
} from "./model/types";
import {Dialog, DialogContent, DialogTitle, Stack, useTheme} from "@mui/material";
import Typography from "@mui/material/Typography";
import Grid from "@mui/material/Grid";
import {formatCurrency, notEmpty, trimDateToDay} from "../utils/functions";
import dayjs, {Dayjs} from "dayjs";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";
import {ComparatorBuilder} from "../utils/comparator-builder";
import Form from "../utils/forms/Form";
import {BILLING_ELEMENT_FORM_PROPERTIES, BillingElementDTO} from "./CreateBillingElementForm";
import {DebugDisplayObject} from "../utils/DebugDisplayObject";
import {ShowBackdropContext} from "../utils/DrawerAppBar";
import Decimal from "decimal.js";
import {TRANSFER_FORM_PROPERTIES, TransferDTO} from "./CreateTransferForm";

export interface BankTransactionsImporterProps {
    onRefetch: () => Promise<void>
}

export function BankTransactionsImporter({onRefetch}: BankTransactionsImporterProps): JSX.Element {

    type BillingElementToImport = Omit<GQLExpense, 'publicId' | 'category' | 'date'> & {
        accountPublicId: string
        date: Dayjs,
    };

    type TransferToImport = Omit<BillingElementToImport, 'accountPublicId' | 'amount' | 'date'> & {
        fromAccountPublicId?: string,
        toAccountPublicId?: string,
        fromAccountDebit: Decimal,
        toAccountCredit: Decimal,
        possibleDates: Dayjs[],
    };
    type ImportType = 'debit' | 'credit' | 'transfer';

    type PossibleImports = Record<Exclude<ImportType, 'transfer'>, BillingElementToImport | null>
        & Record<Extract<ImportType, 'transfer'>, TransferToImport | null>;

    const [possibleImports, setPossibleImports] = useState<PossibleImports>({
        debit: null,
        credit: null,
        transfer: null,
    });
    const {loading, error, data} = useQuery<BankTransactionsToImportQuery>(BankTransactionsToImport);
    const [showDialog, setShowDialog] = useState(false);
    const [selectedBankAccountTransactionsToImport, setSelectedBankAccountTransactionsToImport] = useState<GQLBankTransactionToImport[]>([]);
    const [createExpenseMutation] = useMutation<CreateExpenseMutation>(CreateExpense);
    const [createIncomeMutation] = useMutation<CreateIncomeMutation>(CreateIncome);
    const [createTransferMutation] = useMutation<CreateTransferMutation>(CreateTransfer);
    const [billingElementToCreate, setBillingElementToCreate] = useState<BillingElementDTO | null>(null);
    const [transferToCreate, setTransferToCreate] = useState<TransferDTO & { possibleDays: Dayjs[] } | null>(null);
    const {setShowBackdrop} = useContext(ShowBackdropContext);
    const theme = useTheme();
    const reset = () => {
        setShowDialog(false);
        setSelectedBankAccountTransactionsToImport([]);
    }

    function transactionsToImportButtonText(transactionsCount: number) {
        return transactionsCount === 1
            ? "1 transakcja do zaimportowania"
            : transactionsCount + " transakcji do zaimportowania";
    }

    function onBankTransactionToImportClicked(accounts: GQLAccount[], bankTransactionToImport: GQLBankTransactionToImport) {
        const addTransactionToBillingElement = (
            billingElementType: GQLBillingElementType,
            billingElement: BillingElementToImport | "not possible" | null,
            transaction: GQLBankTransactionToImport,
            currency: GQLCurrencyInfo) => {
            if (billingElement === 'not possible') {
                return billingElement;
            }
            const transactionIsCredit = isCredit(transaction);
            const transactionIdDebit = isDebit(transaction);
            if (!transactionIsCredit && !transactionIdDebit) {
                return 'not possible';
            }
            const amount = transactionIsCredit
                ? (billingElementType === 'Income' ? transaction.credit : transaction.credit.negated())
                : (billingElementType === 'Expense' ? transaction.debit : transaction.debit.negated());
            const accountPublicId = transactionIdDebit ? transaction.sourceAccountPublicId : transaction.destinationAccountPublicId;
            if (!billingElement) {
                billingElement = {
                    accountPublicId: accountPublicId,
                    description: transaction.description,
                    amount: amount,
                    currency: currency,
                    date: dayjs(transaction.timeOfTransaction)
                } as BillingElementToImport;
            } else {
                const dayOfExpense = trimDateToDay(billingElement.date);
                const dayOfTransaction = trimDateToDay(transaction.timeOfTransaction);
                if (dayOfExpense.getTime() === dayOfTransaction.getTime() && billingElement.accountPublicId === accountPublicId) {
                    billingElement = {
                        accountPublicId: accountPublicId,
                        description: transaction.description + '\n' + billingElement.description,
                        amount: billingElement.amount.plus(amount),
                        currency: billingElement.currency,
                        date: billingElement.date
                    } as BillingElementToImport;
                } else {
                    billingElement = "not possible";
                }
            }
            return billingElement;
        }
        const addTransactionToTransfer = (
            transfer: TransferToImport | "not possible" | null,
            transaction: GQLBankTransactionToImport) => {

            if (transfer === 'not possible') {
                return transfer;
            }

            const currencies = [
                transaction.sourceAccountPublicId,
                transaction.destinationAccountPublicId,
                (transfer as TransferToImport)?.fromAccountPublicId,
                (transfer as TransferToImport)?.toAccountPublicId,
            ]
                .filter(notEmpty)
                .map((accountPublicId) => accounts.find(account => account.publicId === accountPublicId))
                .filter(notEmpty)
                .map(account => account.currentBalance.currency)
                .filter((value, index, self) => self.indexOf(value) === index);

            if (currencies.length === 0) {
                return 'not possible';
            }

            let currency = currencies[0];
            for (let i = 1; i < currencies.length; i++) {
                if (currencies[i].code !== currency.code) {
                    return 'not possible';
                }
            }

            const transactionDate = dayjs(transaction.timeOfTransaction).startOf('day').add(12, 'hours');
            if (!transfer) {
                transfer = {
                    fromAccountPublicId: transaction.sourceAccountPublicId,
                    toAccountPublicId: transaction.destinationAccountPublicId,
                    description: transaction.description,
                    fromAccountDebit: transaction.debit,
                    toAccountCredit: transaction.credit,
                    currency: currency,
                    possibleDates: [transactionDate]
                } as TransferToImport;
            } else {
                if ((!transfer.fromAccountPublicId || !transaction.sourceAccountPublicId || transfer.fromAccountPublicId === transaction.sourceAccountPublicId)
                    && (!transfer.toAccountPublicId || !transaction.destinationAccountPublicId || transfer.toAccountPublicId === transaction.destinationAccountPublicId)) {
                    if (transfer.possibleDates.filter(date => date.isSame(transactionDate)).length === 0) {
                        transfer.possibleDates.push(transactionDate);
                    }

                    transfer = {
                        fromAccountPublicId: transfer.fromAccountPublicId || transaction.sourceAccountPublicId,
                        toAccountPublicId: transfer.toAccountPublicId || transaction.destinationAccountPublicId,
                        description: transaction.description + '\n' + transfer.description,
                        fromAccountDebit: transaction.debit.plus(transfer.fromAccountDebit),
                        toAccountCredit: transaction.credit.plus(transfer.toAccountCredit),
                        currency: transfer.currency,
                        possibleDates: transfer.possibleDates,
                    } as TransferToImport;
                } else {
                    transfer = "not possible";
                }
            }
            return transfer;
        }


        let newBankTransactionsToImport;
        if (selectedBankAccountTransactionsToImport?.find(t => t.id === bankTransactionToImport.id)) {
            newBankTransactionsToImport = selectedBankAccountTransactionsToImport?.filter(t => t.id !== bankTransactionToImport.id);
        } else {
            newBankTransactionsToImport = selectedBankAccountTransactionsToImport;
            newBankTransactionsToImport.push(bankTransactionToImport);
        }
        let income: BillingElementToImport | 'not possible' | null = null;
        let expense: BillingElementToImport | 'not possible' | null = null;
        let transfer: TransferToImport | 'not possible' | null = null;
        newBankTransactionsToImport.forEach((transaction) => {
            const sourceAccount = transaction.sourceAccountPublicId ? findAccount(accounts, transaction.sourceAccountPublicId) : null;
            const destinationAccount = transaction.destinationAccountPublicId ? findAccount(accounts, transaction.destinationAccountPublicId) : null;
            const currency = isDebit(transaction)
                ? sourceAccount!.currentBalance.currency
                : destinationAccount!.currentBalance.currency;
            income = addTransactionToBillingElement('Income', income, transaction, currency);
            expense = addTransactionToBillingElement('Expense', expense, transaction, currency);
            transfer = addTransactionToTransfer(transfer, transaction);
        })
        setSelectedBankAccountTransactionsToImport([...newBankTransactionsToImport]);
        setPossibleImports({
            credit: (income === "not possible" || income === null || (income as BillingElementToImport).amount.lessThanOrEqualTo(new Decimal(0))) ? null : income,
            debit: (expense === "not possible" || expense === null || (expense as BillingElementToImport).amount.lessThanOrEqualTo(new Decimal(0))) ? null : expense,
            transfer: (transfer === 'not possible' || transfer === null) || !(transfer as TransferToImport).toAccountCredit.equals((transfer as TransferToImport).fromAccountDebit) ? null : transfer,
        });
    }

    function isDebit(bankTransactionToImport: GQLBankTransactionToImport) {
        return bankTransactionToImport.credit.toNumber() === 0 && bankTransactionToImport.debit.toNumber() > 0;
    }


    function isCredit(bankTransactionToImport: GQLBankTransactionToImport) {
        return bankTransactionToImport.credit.toNumber() > 0 && bankTransactionToImport.debit.toNumber() === 0;
    }

    function findAccount(accounts: GQLAccount[], accountPublicId: string) {
        return accounts.find(account => accountPublicId === account.publicId);
    }

    if (loading || error || !data || data.bankTransactionsToImport.length <= 0) {
        return <></>
    } else {
        if (!showDialog) {
            return <Button
                onClick={() => setShowDialog(true)}>
                {transactionsToImportButtonText(data.bankTransactionsToImport.length)}
            </Button>;
        } else if (showDialog) {
            const accounts = data.financeManagement.accounts.map(mapAccount);
            if (!billingElementToCreate && !transferToCreate) {
                return <Dialog onClose={() => reset()}
                               open={true}
                               fullScreen={true}>
                    <DialogTitle onClick={e => e.stopPropagation()}>
                        <Stack direction={'row'} justifyContent={'space-between'}>
                            <Typography variant={"h4"}>Wybierz transakcja do zaimportowania</Typography>
                            <IconButton onClick={() => reset()}>
                                <CloseIcon/>
                            </IconButton>
                        </Stack>
                    </DialogTitle>
                    <DialogContent onClick={e => e.stopPropagation()}>
                        <Stack>
                            {
                                (data.bankTransactionsToImport
                                    .map(mapBankTransactionToImport)
                                    .sort(ComparatorBuilder.comparingByDate<GQLBankTransactionToImport>(t => t.timeOfTransaction).build())
                                    .map(bankTransactionToImport => {
                                        const sourceAccount = findAccount(accounts, bankTransactionToImport.sourceAccountPublicId);
                                        const destinationAccount = findAccount(accounts, bankTransactionToImport.destinationAccountPublicId);
                                        return (<Grid container
                                                      key={bankTransactionToImport.id}
                                                      sx={{
                                                          padding: '3px',
                                                          marginBottom: '20px',
                                                          border: '1px solid gray',
                                                          ...(selectedBankAccountTransactionsToImport?.find(t => t.id === bankTransactionToImport.id)
                                                              ? {
                                                                  color: theme.palette.primary.contrastText,
                                                                  backgroundColor: theme.palette.primary.main,
                                                              }
                                                              : {})
                                                      }}
                                                      onClick={() => onBankTransactionToImportClicked(accounts, bankTransactionToImport)}>
                                            <Grid size={5}>
                                                <Typography>Od: {sourceAccount?.name}</Typography>
                                            </Grid>
                                            <Grid
                                                size={2}><Typography>{sourceAccount ? formatCurrency(sourceAccount.currentBalance.currency.code, bankTransactionToImport.debit) : ''}</Typography>
                                            </Grid>
                                            <Grid size={5}>
                                                <Typography>Data:</Typography>
                                            </Grid>
                                            <Grid size={5}>
                                                <Typography>Do: {destinationAccount?.name}</Typography>
                                            </Grid>
                                            <Grid size={2}>
                                                <Typography>{destinationAccount ? formatCurrency(destinationAccount.currentBalance.currency.code, bankTransactionToImport.credit) : ''}</Typography>
                                            </Grid>
                                            <Grid size={5}>
                                                <Typography>{dayjs(bankTransactionToImport.timeOfTransaction).locale('pl').format('DD MMMM')}</Typography>
                                            </Grid>
                                            <Grid size={12}>
                                                <Typography>{bankTransactionToImport.description}</Typography>
                                            </Grid>
                                        </Grid>);
                                    }))
                            }
                            {
                                possibleImports.credit && <Stack direction={'column'}>
                                    <Typography onClick={() => {
                                        setBillingElementToCreate({
                                            billingElementType: 'Income',
                                            publicId: '',
                                            affectedAccountPublicId: possibleImports.credit!.accountPublicId,
                                            amount: possibleImports.credit!.amount,
                                            category: null,
                                            date: possibleImports.credit!.date,
                                            description: possibleImports.credit!.description,
                                            piggyBank: null,
                                        })
                                    }}>
                                        Przychód
                                    </Typography>
                                    <DebugDisplayObject object={possibleImports.credit}/>
                                </Stack>
                            }
                            {
                                possibleImports.debit && <Stack direction={'column'}>
                                    <Typography onClick={() => {
                                        setBillingElementToCreate({
                                            billingElementType: 'Expense',
                                            publicId: '',
                                            affectedAccountPublicId: possibleImports.debit!.accountPublicId,
                                            amount: possibleImports.debit!.amount,
                                            category: null,
                                            date: possibleImports.debit!.date,
                                            description: possibleImports.debit!.description,
                                            piggyBank: null,
                                        })
                                    }}>
                                        Wydatek
                                    </Typography>
                                    <DebugDisplayObject object={possibleImports.debit}/>
                                </Stack>
                            }
                            {
                                possibleImports.transfer && <Stack direction={'column'}>
                                    <Typography onClick={() => {
                                        setTransferToCreate({
                                            fromAccountPublicId: possibleImports.transfer!.fromAccountPublicId,
                                            toAccountPublicId: possibleImports.transfer!.toAccountPublicId,
                                            day: possibleImports.transfer!.possibleDates.length === 1 ? possibleImports.transfer!.possibleDates[0] : null,
                                            amount: possibleImports.transfer!.fromAccountDebit,
                                            description: possibleImports.transfer!.description,
                                            possibleDays: possibleImports.transfer!.possibleDates,
                                        })
                                    }}>
                                        Transfer bez wymiany walut
                                    </Typography>
                                    <DebugDisplayObject object={possibleImports.transfer}/>
                                </Stack>
                            }
                        </Stack>
                    </DialogContent>
                </Dialog>
            } else if (billingElementToCreate) {
                const billingCategories = data.financeManagement.billingCategories.map(mapBillingCategory);
                const piggyBanks = data.financeManagement.piggyBanks.map(mapPiggyBank);
                return <Form
                    onSave={(billingElementDTO) => {
                        const variables = {
                            variables: {
                                accountPublicId: billingElementDTO.affectedAccountPublicId!,
                                description: billingElementDTO.description!,
                                amount: billingElementDTO.amount!,
                                currency: accounts.find(account => account.publicId === billingElementDTO.affectedAccountPublicId!)!.currentBalance.currency.code,
                                categoryPublicId: billingElementDTO.category!.publicId,
                                date: billingElementDTO.date!.format("YYYY-MM-DD"),
                                piggyBankPublicId: billingElementDTO.piggyBank?.publicId ? billingElementDTO.piggyBank!.publicId : null,
                                bankTransactionPublicIds: selectedBankAccountTransactionsToImport.map(bankTransaction => bankTransaction.transactionPublicId)
                            }
                        };
                        setShowBackdrop(true);
                        (billingElementDTO.billingElementType === 'Income'
                            ? createIncomeMutation(variables)
                            : createExpenseMutation(variables))
                            .then(() => onRefetch())
                            .finally(() => setShowBackdrop(false));
                    }}
                    onCancel={() => {
                    }}
                    {...BILLING_ELEMENT_FORM_PROPERTIES(
                        billingElementToCreate,
                        accounts,
                        billingCategories,
                        piggyBanks,
                    )}
                />;
            } else if (transferToCreate) {
                return <Form
                    onSave={(transferDTO) => {
                        const variables = {
                            variables: {
                                fromAccountPublicId: transferDTO.fromAccountPublicId!,
                                toAccountPublicId: transferDTO.toAccountPublicId!,
                                amount: transferDTO.amount!,
                                description: transferDTO.description!,
                                date: transferDTO.day!.format('YYYY-MM-DD'),
                                bankTransactionPublicIds: selectedBankAccountTransactionsToImport.map(bankTransaction => bankTransaction.transactionPublicId!),
                            }
                        };
                        setShowBackdrop(true);
                        createTransferMutation(variables)
                            .then(() => onRefetch())
                            .finally(() => setShowBackdrop(false));
                    }}
                    onCancel={() => {
                    }}
                    {...TRANSFER_FORM_PROPERTIES(
                        transferToCreate,
                        accounts,
                        transferToCreate.possibleDays
                    )}
                />;
            } else {
                return <Typography>WTF?</Typography>;
            }
        } else {
            return <Typography>WTF2?</Typography>;
        }
    }
}