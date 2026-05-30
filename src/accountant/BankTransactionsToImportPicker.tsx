import React, {JSX, useState} from "react";
import {
    GQLAccount,
    GQLBankTransactionToImport,
    GQLBillingElementType,
    GQLCurrencyInfo,
    GQLMonetaryAmount
} from "./model/types";
import {Dialog, DialogContent, DialogTitle, Stack, useTheme} from "@mui/material";
import Typography from "@mui/material/Typography";
import Grid from "@mui/material/Grid";
import {formatCurrency, minDate, notEmpty, trimDateToDay} from "../utils/functions";
import dayjs, {Dayjs} from "dayjs";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";
import {ComparatorBuilder} from "../utils/comparator-builder";
import {DebugDisplayObject} from "../utils/DebugDisplayObject";
import Decimal from "decimal.js";
import {BillingElementDTO} from "./CreateBillingElementForm";
import {TransferDTO} from "./CreateTransferForm";

export type ElementToCreate = BillingElementDTO | TransferDTO & { possibleDays: Dayjs[] } | string[]

export type PickOption = {
    selectedBankTransactions: GQLBankTransactionToImport[],
    elementToCreate: ElementToCreate
}

export function isBillingElementToCreate(elementToCreate: ElementToCreate): elementToCreate is BillingElementDTO {
    return !Array.isArray(elementToCreate) && 'billingElementType' in elementToCreate;
}

export function isTransferToCreate(elementToCreate: ElementToCreate): elementToCreate is TransferDTO & {
    possibleDays: Dayjs[]
} {
    return !Array.isArray(elementToCreate) && 'possibleDays' in elementToCreate;
}

export function isTransactionsToMutuallyCancel(elementToCreate: ElementToCreate): elementToCreate is  string[] {
    return Array.isArray(elementToCreate);
}

export interface BankTransactionsToImportPickerProps {
    accounts: GQLAccount[];
    bankTransactions: GQLBankTransactionToImport[];
    onClose: (pickOption: PickOption | null) => void;
}

export type BillingElementToImport = {
    description: string,
    amount: Decimal,
    currency: GQLCurrencyInfo,
    accountPublicId: string,
    date: Dayjs,
};

export type TransferToImport = {
    description: string,
    currency: GQLCurrencyInfo,
    possibleDates: Dayjs[],
    fromAccountPublicId?: string,
    toAccountPublicId?: string,
    fromAccountDebit: Decimal,
    toAccountCredit: Decimal
};

export type TransactionsToIgnore = {
    balance: GQLMonetaryAmount
};

export type ImportType = 'debit' | 'credit' | 'transfer' | 'ignore';

export type PossibleImports = Record<Extract<ImportType, 'debit' | 'credit'>, BillingElementToImport | null>
    & Record<Extract<ImportType, 'transfer'>, TransferToImport | null>
    & Record<Extract<ImportType, 'ignore'>, TransactionsToIgnore | null>;

export function BankTransactionsToImportPicker({
                                                   accounts,
                                                   bankTransactions,
                                                   onClose
                                               }: BankTransactionsToImportPickerProps): JSX.Element {

    const [selectedBankAccountTransactionsToImport, setSelectedBankAccountTransactionsToImport] = useState<GQLBankTransactionToImport[]>([]);
    const [possibleImports, setPossibleImports] = useState<PossibleImports>({
        debit: null,
        credit: null,
        transfer: null,
        ignore: null,
    });
    const theme = useTheme();

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
                if (billingElement.accountPublicId === accountPublicId) {
                    billingElement = {
                        accountPublicId: accountPublicId,
                        description: transaction.description + '\n' + billingElement.description,
                        amount: billingElement.amount.plus(amount),
                        currency: billingElement.currency,
                        date: minDate([billingElement.date, dayjs(trimDateToDay(transaction.timeOfTransaction))])
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

            const transactionDate = dayjs(transaction.timeOfTransaction)
                .startOf('day')
                .add(12, 'hours');
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
                    && (!transfer.toAccountPublicId || !transaction.destinationAccountPublicId || transfer.toAccountPublicId === transaction.destinationAccountPublicId)
                    && ((transfer.toAccountPublicId || transaction.sourceAccountPublicId) !== (transfer.fromAccountPublicId || transaction.sourceAccountPublicId))
                ) {
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

        const addTransactionToIgnore = (ignore: TransactionsToIgnore | "not possible" | null, transaction: GQLBankTransactionToImport) => {
            if (transaction.destinationAccountPublicId && transaction.sourceAccountPublicId) {
                ignore = "not possible";
            } else if (!transaction.destinationAccountPublicId && !transaction.sourceAccountPublicId) {
                ignore = "not possible";
            } else if (ignore !== "not possible") {
                const amount = transaction.destinationAccountPublicId ? transaction.credit : transaction.debit.negated();
                const currency = accounts
                    .filter(ba => ba.publicId === (transaction.destinationAccountPublicId || transaction.sourceAccountPublicId))
                    .map(ba => ba.currentBalance.currency)[0];
                if (!ignore) {
                    ignore = {
                        balance: {
                            amount: amount,
                            currency: {
                                code: currency.code,
                                description: currency.description,
                            }
                        },
                    };
                } else if (currency.code === ignore.balance.currency.code) {
                    ignore = {
                        balance: {
                            amount: ignore.balance.amount.plus(amount),
                            currency: ignore.balance.currency,
                        }
                    }
                } else {
                    ignore = "not possible";
                }
            }
            return ignore;
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
        let ignore: TransactionsToIgnore | 'not possible' | null = null;

        newBankTransactionsToImport.forEach((transaction) => {
            const sourceAccount = transaction.sourceAccountPublicId ? findAccount(accounts, transaction.sourceAccountPublicId) : null;
            const destinationAccount = transaction.destinationAccountPublicId ? findAccount(accounts, transaction.destinationAccountPublicId) : null;
            const currency = isDebit(transaction)
                ? sourceAccount!.currentBalance.currency
                : destinationAccount!.currentBalance.currency;
            income = addTransactionToBillingElement('Income', income, transaction, currency);
            expense = addTransactionToBillingElement('Expense', expense, transaction, currency);
            transfer = addTransactionToTransfer(transfer, transaction);
            ignore = addTransactionToIgnore(ignore, transaction);
        })
        setSelectedBankAccountTransactionsToImport([...newBankTransactionsToImport]);
        setPossibleImports({
            credit: (income === "not possible" || income === null || (income as BillingElementToImport).amount.lessThanOrEqualTo(new Decimal(0))) ? null : income,
            debit: (expense === "not possible" || expense === null || (expense as BillingElementToImport).amount.lessThanOrEqualTo(new Decimal(0))) ? null : expense,
            transfer: (transfer === 'not possible' || transfer === null) || !(transfer as TransferToImport).toAccountCredit.equals((transfer as TransferToImport).fromAccountDebit) ? null : transfer,
            ignore: (ignore === "not possible" || ignore === null || !(ignore as TransactionsToIgnore).balance.amount.equals(new Decimal(0))) ? null : ignore,
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

    return <Dialog onClose={() => onClose(null)}
                   open={true}
                   fullScreen={true}>
        <DialogTitle onClick={e => e.stopPropagation()}>
            <Stack direction={'row'} justifyContent={'space-between'}>
                <Typography variant={"h4"}>Wybierz transakcja do zaimportowania</Typography>
                <IconButton onClick={() => onClose(null)}>
                    <CloseIcon/>
                </IconButton>
            </Stack>
        </DialogTitle>
        <DialogContent onClick={e => e.stopPropagation()}>
            <Stack>
                {
                    (bankTransactions
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
                            onClose({
                                selectedBankTransactions: selectedBankAccountTransactionsToImport,
                                elementToCreate: {
                                    billingElementType: 'Income',
                                    publicId: '',
                                    affectedAccountPublicId: possibleImports.credit!.accountPublicId,
                                    amount: possibleImports.credit!.amount,
                                    category: null,
                                    date: possibleImports.credit!.date,
                                    description: possibleImports.credit!.description,
                                    piggyBank: null,
                                }
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
                            onClose({
                                selectedBankTransactions: selectedBankAccountTransactionsToImport,
                                elementToCreate: {
                                    billingElementType: 'Expense',
                                    publicId: '',
                                    affectedAccountPublicId: possibleImports.debit!.accountPublicId,
                                    amount: possibleImports.debit!.amount,
                                    category: null,
                                    date: possibleImports.debit!.date,
                                    description: possibleImports.debit!.description,
                                    piggyBank: null,
                                }
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
                            onClose({
                                selectedBankTransactions: selectedBankAccountTransactionsToImport,
                                elementToCreate: {
                                    fromAccountPublicId: possibleImports.transfer!.fromAccountPublicId,
                                    toAccountPublicId: possibleImports.transfer!.toAccountPublicId,
                                    day: possibleImports.transfer!.possibleDates.length === 1 ? possibleImports.transfer!.possibleDates[0] : null,
                                    amount: possibleImports.transfer!.fromAccountDebit,
                                    description: possibleImports.transfer!.description,
                                    possibleDays: possibleImports.transfer!.possibleDates,
                                }
                            })
                        }}>
                            Transfer bez wymiany walut
                        </Typography>
                        <DebugDisplayObject object={possibleImports.transfer}/>
                    </Stack>
                }
                {
                    possibleImports.ignore && <Stack direction={'column'}>
                        <Typography onClick={() => {
                            onClose({
                                selectedBankTransactions: selectedBankAccountTransactionsToImport,
                                elementToCreate: selectedBankAccountTransactionsToImport.map(t => t.transactionPublicId)
                            })
                        }}>
                            Wzajemnie ignoruj
                        </Typography>
                        <DebugDisplayObject object={possibleImports.ignore}/>
                    </Stack>
                }
            </Stack>
        </DialogContent>
    </Dialog>
}