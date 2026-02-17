import React, {useState} from "react";
import {useQuery} from "@apollo/client/react";
import {BankTransactionsToImport, BankTransactionsToImportQuery} from "../types";
import Button from "@mui/material/Button";
import PickDialog from "../utils/dialogs/PickDialog";
import {GQLBankTransactionToImport, mapAccount, mapBankTransactionToImport} from "./model/types";
import {SxProps} from "@mui/system";
import {Stack, Theme} from "@mui/material";
import Typography from "@mui/material/Typography";
import Grid from "@mui/material/Grid";
import {formatCurrency} from "../utils/functions";
import dayjs from "dayjs";

export function BankTransactionsImporter() {

    const {loading, error, data, client} = useQuery<BankTransactionsToImportQuery>(BankTransactionsToImport);
    const [showDialog, setShowDialog] = useState(false);
    const [targetBankAccountTransactionToImport, setTargetBankAccountTransactionToImport] = useState<GQLBankTransactionToImport | null>(null);

    const reset = () => {
        client.clearStore();
        setShowDialog(false);
        setTargetBankAccountTransactionToImport(null);
    }

    function transactionsToImportButtonText(transactionsCount: number) {
        return transactionsCount === 1
            ? "1 transakcja do zaimportowania"
            : transactionsCount + " transakcji do zaimportowania";
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
            return <PickDialog
                fullScreen={true}
                title={'Wybierz transakcja do zaimportowania'}
                options={data.bankTransactionsToImport.map(mapBankTransactionToImport)}
                open={true}
                onClose={() => reset()}
                onPick={(value) => {
                    setTargetBankAccountTransactionToImport(value);
                    setShowDialog(false);
                }}
                idExtractor={function (bankTransactionToImport: GQLBankTransactionToImport): string {
                    return bankTransactionToImport ? bankTransactionToImport.id + "" : "";
                }}
                descriptionExtractor={function (bankTransactionToImport: GQLBankTransactionToImport): string {
                    return bankTransactionToImport ? (bankTransactionToImport.description) : "";
                }}

                containerProvider={(sx: SxProps<Theme>, additionalProperties: any) => {
                    return <Stack directon={'column'} sx={{...sx}} {...additionalProperties}></Stack>;
                }}

                elementContainerProvider={(sx: SxProps<Theme>, additionalProperties: any, bankTransactionToImport: GQLBankTransactionToImport) => {
                    const sourceAccount = accounts.find(account => bankTransactionToImport.sourceAccountPublicId === account.publicId)
                    const destinationAccount = accounts.find(account => bankTransactionToImport.destinationAccountPublicId === account.publicId)
                    return <Grid container sx={sx} {...additionalProperties} key={bankTransactionToImport.id}>
                        <Grid size={5}><Typography>Od: {sourceAccount?.name}</Typography></Grid>
                        <Grid
                            size={2}><Typography>{sourceAccount ? formatCurrency(sourceAccount.currentBalance.currency.code, bankTransactionToImport.debit) : ''}</Typography></Grid>
                        <Grid size={5}><Typography>Data:</Typography></Grid>
                        <Grid size={5}><Typography>Do: {destinationAccount?.name}</Typography></Grid>
                        <Grid
                            size={2}><Typography>{destinationAccount ? formatCurrency(destinationAccount.currentBalance.currency.code, bankTransactionToImport.credit) : ''}</Typography></Grid>
                        <Grid
                            size={5}><Typography>{dayjs(bankTransactionToImport.timeOfTransaction).locale('pl').format('DD MMMM')}</Typography></Grid>
                    </Grid>
                }}
            />;
        }
    } else {
        return <></>;
    }
}