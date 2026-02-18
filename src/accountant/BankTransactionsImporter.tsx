import React, {useState} from "react";
import {useQuery} from "@apollo/client/react";
import {BankTransactionsToImport, BankTransactionsToImportQuery} from "../types";
import Button from "@mui/material/Button";
import {
    GQLAccount,
    GQLBankTransactionToImport,
    GQLExpense,
    mapAccount,
    mapBankTransactionToImport
} from "./model/types";
import {Dialog, DialogContent, DialogTitle, Stack, useTheme} from "@mui/material";
import Typography from "@mui/material/Typography";
import Grid from "@mui/material/Grid";
import {formatCurrency, trimDateToDay} from "../utils/functions";
import dayjs from "dayjs";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";
import {ComparatorBuilder} from "../utils/comparator-builder";

export function BankTransactionsImporter() {

    type GQLExpenseToImport = Omit<GQLExpense, 'publicId' | 'category'> & {
        accountPublicId: string
    };
    type ImportType = 'debit';
    const [possibleImports, setPossibleImports] = useState<Record<ImportType, GQLExpenseToImport | null>>({debit: null});
    const {loading, error, data, client} = useQuery<BankTransactionsToImportQuery>(BankTransactionsToImport);
    const [showDialog, setShowDialog] = useState(false);
    const [selectedBankAccountTransactionsToImport, setSelectedBankAccountTransactionsToImport] = useState<GQLBankTransactionToImport[]>([]);
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
            if (!debitExpense) {
                if (debit) {
                    debitExpense = {
                        accountPublicId: transaction.sourceAccountPublicId,
                        description: transaction.description,
                        amount: transaction.debit,
                        currency: sourceAccount?.currentBalance.currency,
                        date: transaction.timeOfTransaction
                    } as GQLExpenseToImport;
                }
            } else {
                if (debitExpense && debitExpense !== 'not possible' && debit) {
                    const dayOfExpense = trimDateToDay(debitExpense.date);
                    const dayOfTransaction = trimDateToDay(transaction.timeOfTransaction);
                    if (dayOfExpense.getTime() === dayOfTransaction.getTime()
                        && debitExpense.accountPublicId === transaction.sourceAccountPublicId) {
                        debitExpense = {
                            accountPublicId: debitExpense.accountPublicId,
                            description: transaction.description + '\n' + debitExpense.description,
                            amount: transaction.debit.plus(debitExpense.amount),
                            currency: debitExpense.currency,
                            date: trimDateToDay(debitExpense.date)
                        } as GQLExpenseToImport;
                    } else {
                        debitExpense = "not possible";
                    }
                }
            }
        })
        setSelectedBankAccountTransactionsToImport([...newBankTransactionsToImport]);
        setPossibleImports({debit: debitExpense === "not possible" ? null : debitExpense});
    }

    function isDebit(bankTransactionToImport: GQLBankTransactionToImport) {
        return bankTransactionToImport.credit.toNumber() === 0 && bankTransactionToImport.debit.toNumber() > 0;
    }

    function findAccount(accounts: GQLAccount[], accountPublicId: string) {
        return accounts.find(account => accountPublicId === account.publicId);
    }

    if (loading || error || !data || data.bankTransactionsToImport.length <= 0) {
        return <></>
    } else {
        if (!showDialog) {
            return <Button
                onClick={() => setShowDialog(true)}>{transactionsToImportButtonText(data.bankTransactionsToImport.length)}</Button>;
        } else {
            const accounts = data.financeManagement.accounts.map(mapAccount);
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
                                <Typography>Wydatek</Typography>
                                <Typography>accountPublicId: {possibleImports.debit.accountPublicId}</Typography>
                                <Typography>description: {possibleImports.debit.description}</Typography>
                                <Typography>amount: {possibleImports.debit.amount.toNumber()}</Typography>
                                <Typography>currency: {possibleImports.debit.currency.code}</Typography>
                                <Typography>date: {dayjs(possibleImports.debit.date).format("YYYY-MM-DD HH:mm:ss")}</Typography>
                            </Stack>
                        }
                    </Stack>
                </DialogContent>
            </Dialog>
        }
    }
}