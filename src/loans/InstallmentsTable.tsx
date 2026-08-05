import * as React from "react";
import {MouseEventHandler} from "react";
import {CurrencyAmountDisplay} from "../application/components/CurrencyAmountDisplay";
import dayjs, {Dayjs} from "dayjs";
import {CurrencyInfo, Installment as GrapqhlInstallment, LoanCalculationInstallment} from "../types";
import {ComparatorBuilder} from "../utils/comparator-builder";
import {Table, TableBody, TableCell, TableContainer, TableFooter, TableHead, TableRow} from "@mui/material";
import Box from "@mui/material/Box";
import Decimal from "decimal.js";

export type Installment = {
    paidAt: Dayjs;
    repaidInterest: Decimal;
    repaidAmount: Decimal;
    overpayment: Decimal;
    leftToRepayAfter: Decimal;
}

/**
 * Builds the repayment schedule, carrying the outstanding capital forward from row to
 * row. All of it runs through Decimal: the running balance is subtracted once per
 * installment, so binary floating point drift would accumulate down the table and
 * show up as a wrong final balance.
 */
export const mapInstallments = (leftToRepay: Decimal | number, installments: GrapqhlInstallment[]): Installment[] => {
    const compareByDate = ComparatorBuilder.comparingByDate<GrapqhlInstallment>(installment => new Date(installment.paidAt)).build();
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
            leftToRepayAfter: outstanding
        };
    });
}

export const mapInstallmentsFromSimulation = (leftToRepay: Decimal | number, installments: LoanCalculationInstallment[]): Installment[] => {
    const compareByDate = ComparatorBuilder.comparingByDate<LoanCalculationInstallment>(installment => new Date(installment.paymentFrom)).build();
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
            leftToRepayAfter: outstanding
        };
    });
}

export type InstallmentsTableProps = {
    currency: CurrencyInfo
    installments: Installment[]
    onClick?: MouseEventHandler<any>
}

const sum = (values: Decimal[]) => values.reduce((total, value) => total.plus(value), new Decimal(0));

export function InstallmentsTable({currency, installments}: InstallmentsTableProps) {

    function sumRow(extractor: (installment: Installment) => Decimal) {
        return <b>
            <CurrencyAmountDisplay
                amount={sum(installments.map(extractor))}
                currency={currency}/>
        </b>;
    }

    function amountOrDash(amount: Decimal) {
        return amount.greaterThan(0)
            ? <CurrencyAmountDisplay currency={currency} amount={amount}/>
            : '-';
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
                    {installments.map((installment, index) =>
                        <TableRow
                            key={`${installment.paidAt.valueOf()}-${index}`}
                            sx={{
                                backgroundColor: installment.paidAt.get('month') % 2 === 0
                                    ? 'action.hover'
                                    : 'transparent'
                            }}>
                            <TableCell>{installment.paidAt.format("YYYY-MM-DD")}</TableCell>
                            <TableCell>{amountOrDash(installment.repaidInterest.plus(installment.repaidAmount))}</TableCell>
                            <TableCell>{amountOrDash(installment.repaidInterest)}</TableCell>
                            <TableCell>{amountOrDash(installment.repaidAmount)}</TableCell>
                            <TableCell>{amountOrDash(installment.overpayment)}</TableCell>
                            <TableCell><CurrencyAmountDisplay currency={currency}
                                                              amount={installment.leftToRepayAfter}/></TableCell>
                        </TableRow>
                    )}
                </TableBody>
                <TableFooter>
                    <TableRow>
                        <TableCell>-</TableCell>
                        <TableCell>{sumRow(installment => installment.repaidInterest.plus(installment.repaidAmount))}</TableCell>
                        <TableCell>{sumRow(installment => installment.repaidInterest)}</TableCell>
                        <TableCell>{sumRow(installment => installment.repaidAmount)}</TableCell>
                        <TableCell>{sumRow(installment => installment.overpayment)}</TableCell>
                        <TableCell>suma: {sumRow(installment => installment.repaidInterest
                            .plus(installment.repaidAmount)
                            .plus(installment.overpayment))}</TableCell>
                    </TableRow>
                </TableFooter>
            </Table>
        </TableContainer>
    );
}
