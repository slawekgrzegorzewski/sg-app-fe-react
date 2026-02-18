import React, {useState} from "react";
import {useQuery} from "@apollo/client/react";
import {BankTransactionsToImport, BankTransactionsToImportQuery} from "../types";
import Button from "@mui/material/Button";
import {GQLAccount, GQLBankTransactionToImport, mapAccount, mapBankTransactionToImport} from "./model/types";
import {Dialog, DialogContent, DialogTitle, Stack, useTheme} from "@mui/material";
import Typography from "@mui/material/Typography";
import Grid from "@mui/material/Grid";
import {formatCurrency} from "../utils/functions";
import dayjs from "dayjs";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";

export function BankTransactionsImporter() {

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

    function onBankTransactionToImportClicked(bankTransactionToImport: GQLBankTransactionToImport) {
        if (selectedBankAccountTransactionsToImport?.find(t => t.id === bankTransactionToImport.id)) {
            setSelectedBankAccountTransactionsToImport([...selectedBankAccountTransactionsToImport?.filter(t => t.id !== bankTransactionToImport.id)]);
        } else {
            selectedBankAccountTransactionsToImport.push(bankTransactionToImport);
            setSelectedBankAccountTransactionsToImport([...selectedBankAccountTransactionsToImport]);
        }
    }

    function bankTransactionDisplay(accounts: GQLAccount[], bankTransactionToImport: GQLBankTransactionToImport) {
        const sourceAccount = accounts.find(account => bankTransactionToImport.sourceAccountPublicId === account.publicId);
        const destinationAccount = accounts.find(account => bankTransactionToImport.destinationAccountPublicId === account.publicId);
        return (<Grid container
                      key={bankTransactionToImport.id}
                      sx={selectedBankAccountTransactionsToImport?.filter(t => t.id === bankTransactionToImport.id) ? {
                          color: theme.palette.primary.contrastText,
                          backgroundColor: theme.palette.primary.main,
                      } : {}}
                      onClick={() => {
                          onBankTransactionToImportClicked(bankTransactionToImport);
                      }}>
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
    }

    if (loading) {
        return <>Loading...</>
    } else if (error) {
        return <>Error...</>
    } else if (data && data.bankTransactionsToImport.length > 0) {
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
                                .map(bankTransactionToImport => bankTransactionDisplay(accounts, bankTransactionToImport)))
                        }
                    </Stack>
                </DialogContent>
            </Dialog>
        }
    } else {
        return <></>;
    }
}