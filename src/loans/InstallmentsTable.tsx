import * as React from "react";
import {MouseEventHandler} from "react";
import {CurrencyAmountDisplay} from "../application/components/CurrencyAmountDisplay";
import dayjs, {Dayjs} from "dayjs";
import {Installment as GrapqhlInstallment, LoanCalculationInstallment} from "../types";
import {ComparatorBuilder} from "../application/utils/comparator-builder";
import {Table, TableBody, TableCell, TableContainer, TableFooter, TableHead, TableRow} from "@mui/material";
import Box from "@mui/material/Box";

export const mapInstallments = (leftToRepay: number, installments: GrapqhlInstallment[]) => {
    const compareByDate = ComparatorBuilder.comparingByDate<GrapqhlInstallment>(installment => new Date(installment.paidAt)).build();
    return [...installments].sort(compareByDate).map(installment => {
        leftToRepay -= (installment.repaidAmount.amount + installment.overpayment.amount);
        return {
            paidAt: dayjs(installment.paidAt),
            repaidInterest: installment.repaidInterest.amount as number,
            repaidAmount: installment.repaidAmount.amount as number,
            overpayment: installment.overpayment.amount as number,
            leftToRepayAfter: leftToRepay
        } as Installment;
    });
}
export const mapInstallmentsFromSimulation = (leftToRepay: number, installments: LoanCalculationInstallment[]) => {
    const compareByDate = ComparatorBuilder.comparingByDate<LoanCalculationInstallment>(installment => new Date(installment.paymentFrom)).build();
    return [...installments].sort(compareByDate).map(installment => {
        leftToRepay -= ((installment.installment as number) - (installment.paidInterest as number) + (installment.overpayment as number));
        return {
            paidAt: dayjs(installment.paymentTo),
            repaidInterest: installment.paidInterest as number,
            repaidAmount: (installment.installment as number) - (installment.paidInterest as number),
            overpayment: installment.overpayment as number,
            leftToRepayAfter: leftToRepay
        } as Installment;
    });
}

export type Installment = {
    paidAt: Dayjs;
    repaidInterest: number;
    repaidAmount: number;
    overpayment: number;
    leftToRepayAfter: number;
}

export type InstallmentsTableProps = {
    currency: string
    installments: Installment[]
    onClick: MouseEventHandler<any>
}

InstallmentsTable.defaultProps = {
    onClick: () => {
    }
}

export function InstallmentsTable({currency, installments, onClick}: InstallmentsTableProps) {

    function sumRow(extractor: (installment: Installment) => number) {
        return <b>
            <CurrencyAmountDisplay
                amount={installments.map(extractor).reduce((a, b) => a + b, 0)}
                currency={currency}/>
        </b>;
    }

    return (
        <TableContainer component={Box}>
            <Table size={'small'} stickyHeader>
                <TableHead>
                    <TableRow>
                        <TableCell>data</TableCell>
                        <TableCell>rata</TableCell>
                        <TableCell>odsetki</TableCell>
                        <TableCell>kapitał</TableCell>
                        <TableCell>nadpłata</TableCell>
                        <TableCell>pozostały kapitał</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {(installments.map(installment =>
                        <TableRow sx={{backgroundColor: installment.paidAt.get('month') % 2 === 0 ? '#dddddd' : 'white'}}>
                            <TableCell>{dayjs(installment.paidAt).format("YYYY-MM-DD")}</TableCell>
                            <TableCell>{installment.repaidInterest > 0 ?
                                <CurrencyAmountDisplay currency={currency}
                                                       amount={installment.repaidInterest + installment.repaidAmount}/> : '-'}</TableCell>
                            <TableCell>{installment.repaidInterest > 0 ?
                                <CurrencyAmountDisplay currency={currency}
                                                       amount={installment.repaidInterest}/> : '-'}</TableCell>
                            <TableCell>{installment.repaidAmount > 0 ?
                                <CurrencyAmountDisplay currency={currency}
                                                       amount={installment.repaidAmount}/> : '-'}</TableCell>
                            <TableCell>{installment.overpayment > 0 ?
                                <CurrencyAmountDisplay currency={currency}
                                                       amount={installment.overpayment}/> : '-'}</TableCell>
                            <TableCell><CurrencyAmountDisplay currency={currency}
                                                              amount={installment.leftToRepayAfter}/></TableCell>
                        </TableRow>
                    ))}
                </TableBody>
                <TableFooter>
                    <TableRow>
                        <TableCell>-</TableCell>
                        <TableCell>{sumRow(installment => installment.repaidInterest + installment.repaidAmount)}</TableCell>
                        <TableCell>{sumRow(installment => installment.repaidInterest)}</TableCell>
                        <TableCell>{sumRow(installment => installment.repaidAmount)}</TableCell>
                        <TableCell>{sumRow(installment => installment.overpayment)}</TableCell>
                        <TableCell>suma: {sumRow(installment => installment.repaidInterest + installment.repaidAmount + installment.overpayment)}</TableCell>
                    </TableRow>
                </TableFooter>
            </Table>
        </TableContainer>
    );
}