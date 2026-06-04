import * as React from "react";
import {Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow} from "@mui/material";
import {GQLAccount} from "./model/types";
import {formatCurrency} from "../utils/functions";
import {GQLBankTransactionToCustomImportSummary} from "./utils/customImportSummary";

type CustomImportSummaryProps = {
    accountsWithAssignedBankAccounts: GQLAccount[],
    transactionToCustomImportSummaries: GQLBankTransactionToCustomImportSummary[]
};

export function CustomImportSummary({
                                        accountsWithAssignedBankAccounts,
                                        transactionToCustomImportSummaries
                                    }: CustomImportSummaryProps) {
    return (<TableContainer component={Paper}>
            <Table>
                <TableHead>
                    <TableRow>
                        <TableCell>Konto</TableCell>
                        <TableCell align="right">Saldo z balansu</TableCell>
                        <TableCell align="right">Saldo po imporcie</TableCell>
                    </TableRow>
                </TableHead>

                <TableBody>
                    {transactionToCustomImportSummaries.map((group) => (
                        <TableRow>

                            <TableCell>{accountsWithAssignedBankAccounts.filter(a => a.bankAccount.publicId === group.bankAccountPublicId)[0].name}</TableCell>

                            <TableCell align="right">
                                {formatCurrency(group.currency, group.balanceFromImportingTransactions)}
                            </TableCell>

                            <TableCell align="right">
                                {formatCurrency(group.currency, group.balanceAfterImport)}
                            </TableCell>

                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    )
        ;
}