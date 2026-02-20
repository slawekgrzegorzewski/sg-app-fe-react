import React, {useState} from "react";
import {useQuery} from "@apollo/client/react";
import {BankTransactionsToImport, BankTransactionsToImportQuery} from "../types";
import Button from "@mui/material/Button";
import {
    GQLAccount,
    GQLBankTransactionToImport,
    GQLCurrencyInfo,
    GQLExpense,
    mapAccount,
    mapBankTransactionToImport,
    mapBillingCategory,
    mapPiggyBank
} from "./model/types";
import {Box, Dialog, DialogContent, DialogTitle, Stack, useTheme} from "@mui/material";
import Typography from "@mui/material/Typography";
import Grid from "@mui/material/Grid";
import {formatCurrency, trimDateToDay} from "../utils/functions";
import dayjs, {Dayjs} from "dayjs";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";
import {ComparatorBuilder} from "../utils/comparator-builder";
import Form from "../utils/forms/Form";
import {BILLING_ELEMENT_FORM_PROPERTIES} from "./CreateBillingElementForm";
import Decimal from "decimal.js";

type ExpenseToCreate = {
    sourceAccount: GQLAccount,
    amount: number,
    category: { publicId: string, name: string },
    date: Dayjs,
    description: string,
    piggyBank: { publicId: string, name: string },
}

type ExpenseToCreateDTO = Omit<ExpenseToCreate, "sourceAccount"> & {
    sourceAccount: string
}

export function BankTransactionsImporter() {

    type GQLExpenseToImport = Omit<GQLExpense, 'publicId' | 'category' | 'date'> & {
        accountPublicId: string
        date: Dayjs,
    };
    type ImportType = 'debit';
    const [possibleImports, setPossibleImports] = useState<Record<ImportType, GQLExpenseToImport | null>>({debit: null});
    const {loading, error, data, client} = useQuery<BankTransactionsToImportQuery>(BankTransactionsToImport);
    const [showDialog, setShowDialog] = useState(false);
    const [selectedBankAccountTransactionsToImport, setSelectedBankAccountTransactionsToImport] = useState<GQLBankTransactionToImport[]>([]);
    const [expenseToCreate, setExpenseToCreate] = useState<ExpenseToCreate | null>(null);
    const [expenseToCreateDTO, setExpenseToCreateDTO] = useState<ExpenseToCreateDTO | null>(null)
    const theme = useTheme();
    const reset = () => {
        client.clearStore();
        setShowDialog(false);
        setSelectedBankAccountTransactionsToImport([]);
    }

    function transactionsToImportButtonText(transactionsCount: number) {
        return transactionsCount === 1
            ? "1 transakcja do zaimportowania"
            : transactionsCount + " transakcji do zaimportowania";
    }

    function onBankTransactionToImportClicked(accounts: GQLAccount[], bankTransactionToImport: GQLBankTransactionToImport) {
        const addDebit = (expense: GQLExpenseToImport | "not possible" | null,
                          transaction: GQLBankTransactionToImport,
                          currency: GQLCurrencyInfo) => {
            if (expense === 'not possible') {
                return expense;
            }
            const transactionIsCredit = isCredit(transaction);
            const transactionIdDebit = isDebit(transaction);
            if (!transactionIsCredit && !transactionIdDebit) {
                return 'not possible';
            }
            if (!expense) {
                expense = {
                    accountPublicId: transaction.sourceAccountPublicId,
                    description: transaction.description,
                    amount: transaction.debit,
                    currency: currency,
                    date: dayjs(transaction.timeOfTransaction)
                } as GQLExpenseToImport;
            } else {
                const dayOfExpense = trimDateToDay(expense.date);
                const dayOfTransaction = trimDateToDay(transaction.timeOfTransaction);
                if (dayOfExpense.getTime() === dayOfTransaction.getTime()
                    && expense.accountPublicId === (transactionIdDebit ? transaction.sourceAccountPublicId : transaction.destinationAccountPublicId)) {
                    expense = {
                        accountPublicId: expense.accountPublicId,
                        description: transaction.description + '\n' + expense.description,
                        amount: transactionIdDebit
                            ? expense.amount.plus(transaction.debit)
                            : expense.amount.minus(transaction.credit),
                        currency: expense.currency,
                        date: expense.date
                    } as GQLExpenseToImport;
                } else {
                    expense = "not possible";
                }
            }
            return expense;
        }


        let newBankTransactionsToImport;
        if (selectedBankAccountTransactionsToImport?.find(t => t.id === bankTransactionToImport.id)) {
            newBankTransactionsToImport = selectedBankAccountTransactionsToImport?.filter(t => t.id !== bankTransactionToImport.id);
        } else {
            newBankTransactionsToImport = selectedBankAccountTransactionsToImport;
            newBankTransactionsToImport.push(bankTransactionToImport);
        }
        let debitExpense: GQLExpenseToImport | 'not possible' | null = null;
        newBankTransactionsToImport.forEach((transaction) => {
            const sourceAccount = transaction.sourceAccountPublicId ? findAccount(accounts, transaction.sourceAccountPublicId) : null;
            const destinationAccount = transaction.destinationAccountPublicId ? findAccount(accounts, transaction.destinationAccountPublicId) : null;
            const debit = isDebit(transaction)
            debitExpense = addDebit(debitExpense, transaction, debit ? sourceAccount!.currentBalance.currency : destinationAccount!.currentBalance.currency);
        })
        setSelectedBankAccountTransactionsToImport([...newBankTransactionsToImport]);
        setPossibleImports({debit: debitExpense === "not possible" ? null : debitExpense});
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
            if (!expenseToCreate) {
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
                                                      sx={selectedBankAccountTransactionsToImport?.find(t => t.id === bankTransactionToImport.id) ? {
                                                          color: theme.palette.primary.contrastText,
                                                          backgroundColor: theme.palette.primary.main,
                                                      } : {}}
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
                                        </Grid>);
                                    }))
                            }
                            {
                                possibleImports.debit && <Stack direction={'column'}>
                                    <Typography onClick={() => {
                                        setExpenseToCreate({
                                            sourceAccount: accounts.find(a => a.publicId === possibleImports.debit!.accountPublicId)!,
                                            amount: possibleImports.debit!.amount.toNumber(),
                                            category: {
                                                publicId: '',
                                                name: ''
                                            },
                                            date: possibleImports.debit!.date,
                                            description: possibleImports.debit!.description,
                                            piggyBank: {
                                                publicId: '',
                                                name: ''
                                            },
                                        });
                                    }}>
                                        Wydatek
                                    </Typography>
                                    <Box component={'code'} sx={{'whiteSpaceCollapse': 'break-spaces'}}>
                                        {JSON.stringify(possibleImports.debit, null, 2)}
                                    </Box>
                                </Stack>
                            }
                        </Stack>
                    </DialogContent>
                </Dialog>
            } else if (expenseToCreate) {
                const billingCategories = data.financeManagement.billingCategories.map(mapBillingCategory);
                const piggyBanks = data.financeManagement.piggyBanks.map(mapPiggyBank);
                return <>
                    <Form
                        onSave={(value) => {
                            const a = {
                                sourceAccount: value.affectedAccountPublicId,
                                amount: value.amount.toNumber(),
                                category: {publicId: value.category!.publicId, name: value.category!.name},
                                date: value.date,
                                description: value.description,
                                piggyBank: {
                                    publicId: value.piggyBank?.publicId || '',
                                    name: value.piggyBank?.name || ''
                                },
                            } as ExpenseToCreateDTO;
                            setExpenseToCreateDTO(a);
                        }}
                        onCancel={() => {
                        }}
                        {...BILLING_ELEMENT_FORM_PROPERTIES(
                            {
                                billingElementType: 'Expense',
                                publicId: '',
                                affectedAccountPublicId: expenseToCreate.sourceAccount.publicId,
                                amount: new Decimal(expenseToCreate.amount),
                                category: null,
                                date: expenseToCreate.date,
                                description: expenseToCreate.description,
                                piggyBank: null
                            },
                            accounts,
                            billingCategories,
                            piggyBanks,
                        )}
                    />
                    {
                        expenseToCreateDTO && (<Box component={'code'} sx={{'whiteSpaceCollapse': 'break-spaces'}}>
                            {JSON.stringify(expenseToCreateDTO, null, 2)}
                        </Box>)
                    }
                </>;
            } else {
                return <Typography>WTF?</Typography>;
            }
        }
    }
}