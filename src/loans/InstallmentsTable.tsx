import * as React from 'react';
import {MouseEventHandler} from 'react';
import {CurrencyAmountDisplay} from '../application/components/CurrencyAmountDisplay';
import dayjs, {Dayjs} from 'dayjs';
import {CurrencyInfo, Installment as GrapqhlInstallment, LoanCalculationInstallment} from '../types';
import {ComparatorBuilder} from '../utils/comparator-builder';
import {Table, TableBody, TableCell, TableContainer, TableFooter, TableHead, TableRow} from '@mui/material';
import Box from '@mui/material/Box';
import Decimal from 'decimal.js';
import {StandOutText} from '../application/components/StandOutText';

export type Installment = {
    paidAt: Dayjs;
    repaidInterest: Decimal;
    repaidAmount: Decimal;
    overpayment: Decimal;
    leftToRepayAfter: Decimal;
};

/**
 * Builds the repayment schedule, carrying the outstanding capital forward from row to
 * row. All of it runs through Decimal: the running balance is subtracted once per
 * installment, so binary floating point drift would accumulate down the table and
 * show up as a wrong final balance.
 */
export const mapInstallments = (leftToRepay: Decimal | number, installments: GrapqhlInstallment[]): Installment[] => {
    const compareByDate = ComparatorBuilder.comparingByDate<GrapqhlInstallment>(
        installment => new Date(installment.paidAt)
    ).build();
    let outstanding = new Decimal(leftToRepay);

    return [...installments].sort(compareByDate).map(installment => {
        const repaidAmount = new Decimal(installment.repaidAmount.amount);
        const overpayment = new Decimal(installment.overpayment.amount);
        outstanding = outstanding.minus(repaidAmount).minus(overpayment);

        return {
            paidAt: dayjs(installment.paidAt),
            repaidInterest: new Decimal(installment.repaidInterest.amount),
            repaidAmount: repaidAmount,
            overpayment: overpayment,
            leftToRepayAfter: outstanding,
        };
    });
};

export const mapInstallmentsFromSimulation = (
    leftToRepay: Decimal | number,
    installments: LoanCalculationInstallment[]
): Installment[] => {
    const compareByDate = ComparatorBuilder.comparingByDate<LoanCalculationInstallment>(
        installment => new Date(installment.paymentFrom)
    ).build();
    let outstanding = new Decimal(leftToRepay);

    return [...installments].sort(compareByDate).map(installment => {
        const paidInterest = new Decimal(installment.paidInterest);
        const repaidAmount = new Decimal(installment.installment).minus(paidInterest);
        const overpayment = new Decimal(installment.overpayment);
        outstanding = outstanding.minus(repaidAmount).minus(overpayment);

        return {
            paidAt: dayjs(installment.paymentTo),
            repaidInterest: paidInterest,
            repaidAmount: repaidAmount,
            overpayment: overpayment,
            leftToRepayAfter: outstanding,
        };
    });
};

export type InstallmentsTableProps = {
    currency: CurrencyInfo;
    installments: Installment[];
    onClick?: MouseEventHandler<any>;
};

const sum = (values: Decimal[]) => values.reduce((total, value) => total.plus(value), new Decimal(0));

export function InstallmentsTable({currency, installments}: InstallmentsTableProps) {
    function sumRow(extractor: (installment: Installment) => Decimal) {
        return (
            <StandOutText standOutBy="both">
                <CurrencyAmountDisplay amount={sum(installments.map(extractor))} currency={currency} />
            </StandOutText>
        );
    }

    function amountOrDash(amount: Decimal) {
        return amount.greaterThan(0) ? <CurrencyAmountDisplay currency={currency} amount={amount} /> : '-';
    }

    return (
        <TableContainer component={Box} sx={{width: '100%', overflowX: 'auto'}}>
            <Table size="small" stickyHeader sx={{minWidth: 720}}>
                <TableHead>
                    <TableRow>
                        <TableCell sx={{color: 'secondary.main'}}>Data</TableCell>
                        <TableCell align="right" sx={{color: 'secondary.main'}}>
                            Rata
                        </TableCell>
                        <TableCell align="right" sx={{color: 'secondary.main'}}>
                            Odsetki
                        </TableCell>
                        <TableCell align="right" sx={{color: 'secondary.main'}}>
                            Kapitał
                        </TableCell>
                        <TableCell align="right" sx={{color: 'secondary.main'}}>
                            Nadpłata
                        </TableCell>
                        <TableCell align="right" sx={{color: 'secondary.main'}}>
                            Pozostały kapitał
                        </TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {installments.map((installment, index) => (
                        <TableRow
                            key={`${installment.paidAt.valueOf()}-${index}`}
                            sx={{
                                '&:hover': {backgroundColor: 'action.hover'},
                                '& td:not(:first-of-type)': {
                                    fontVariantNumeric: 'tabular-nums',
                                    whiteSpace: 'nowrap',
                                },
                            }}
                        >
                            <TableCell>{installment.paidAt.format('DD.MM.YYYY')}</TableCell>
                            <TableCell align="right">
                                {amountOrDash(installment.repaidInterest.plus(installment.repaidAmount))}
                            </TableCell>
                            <TableCell align="right">{amountOrDash(installment.repaidInterest)}</TableCell>
                            <TableCell align="right">{amountOrDash(installment.repaidAmount)}</TableCell>
                            <TableCell align="right">{amountOrDash(installment.overpayment)}</TableCell>
                            <TableCell align="right">
                                <CurrencyAmountDisplay currency={currency} amount={installment.leftToRepayAfter} />
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
                <TableFooter>
                    <TableRow sx={{'& td': {fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap'}}}>
                        <TableCell>-</TableCell>
                        <TableCell align="right">
                            {sumRow(installment => installment.repaidInterest.plus(installment.repaidAmount))}
                        </TableCell>
                        <TableCell align="right">{sumRow(installment => installment.repaidInterest)}</TableCell>
                        <TableCell align="right">{sumRow(installment => installment.repaidAmount)}</TableCell>
                        <TableCell align="right">{sumRow(installment => installment.overpayment)}</TableCell>
                        <TableCell align="right">
                            <StandOutText standOutBy="bold">Suma:</StandOutText>{' '}
                            {sumRow(installment =>
                                installment.repaidInterest.plus(installment.repaidAmount).plus(installment.overpayment)
                            )}
                        </TableCell>
                    </TableRow>
                </TableFooter>
            </Table>
        </TableContainer>
    );
}
