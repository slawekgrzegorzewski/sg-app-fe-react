import * as React from 'react';
import {Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow} from '@mui/material';
import {formatCurrency} from '../utils/functions';
import {GQLBankTransactionToCustomImportSummary} from './utils/customImportSummary';
import {Account} from '../types';

type CustomImportSummaryProps = {
    accountsWithAssignedBankAccounts: Account[];
    transactionToCustomImportSummaries: GQLBankTransactionToCustomImportSummary[];
};

export function CustomImportSummary({
    accountsWithAssignedBankAccounts,
    transactionToCustomImportSummaries,
}: CustomImportSummaryProps) {
    return (
        <TableContainer component={Paper} variant="outlined">
            <Table size="small" aria-label="Bilans własnego importu">
                <TableHead>
                    <TableRow>
                        <TableCell>Konto</TableCell>
                        <TableCell align="right">Saldo z balansu</TableCell>
                        <TableCell align="right">Saldo po imporcie</TableCell>
                    </TableRow>
                </TableHead>

                <TableBody>
                    {transactionToCustomImportSummaries.map(group => (
                        <TableRow key={group.bankAccountPublicId}>
                            <TableCell>
                                {accountsWithAssignedBankAccounts.find(
                                    a => a.bankAccount?.publicId === group.bankAccountPublicId
                                )?.name ?? group.bankAccountPublicId}
                            </TableCell>

                            <TableCell
                                align="right"
                                sx={{
                                    color: group.balanceAfterImport.isZero() ? 'success.main' : 'error.main',
                                    fontWeight: 600,
                                }}
                            >
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
    );
}
