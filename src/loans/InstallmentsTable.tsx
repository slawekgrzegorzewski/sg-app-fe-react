import * as React from "react";
import {MouseEventHandler} from "react";
import {CurrencyAmountDisplay} from "../application/components/CurrencyAmountDisplay";
import dayjs, {Dayjs} from "dayjs";
import {Installment as GrapqhlInstallment, LoanCalculationInstallment} from "../types";
import {ComparatorBuilder} from "../application/utils/comparator-builder";

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
        <table>
            <thead>
            <tr>
                <th>data</th>
                <th>rata</th>
                <th>odsetki</th>
                <th>kapitał</th>
                <th>nadpłata</th>
                <th>pozostały kapitał</th>
            </tr>
            </thead>
            <tbody>
            {(installments.map(installment =>
                <tr>
                    <td>{dayjs(installment.paidAt).format("YYYY-MM-DD")}</td>
                    <td>{installment.repaidInterest > 0 ?
                        <CurrencyAmountDisplay currency={currency}
                                               amount={installment.repaidInterest + installment.repaidAmount}/> : '-'}</td>
                    <td>{installment.repaidInterest > 0 ?
                        <CurrencyAmountDisplay currency={currency} amount={installment.repaidInterest}/> : '-'}</td>
                    <td>{installment.repaidAmount > 0 ?
                        <CurrencyAmountDisplay currency={currency} amount={installment.repaidAmount}/> : '-'}</td>
                    <td>{installment.overpayment > 0 ?
                        <CurrencyAmountDisplay currency={currency} amount={installment.overpayment}/> : '-'}</td>
                    <td><CurrencyAmountDisplay currency={currency} amount={installment.leftToRepayAfter}/></td>
                </tr>
            ))}
            <tr>
                <td>{sumRow(installment => installment.repaidInterest + installment.repaidAmount + installment.overpayment)}</td>
                <td>{sumRow(installment => installment.repaidInterest + installment.repaidAmount)}</td>
                <td>{sumRow(installment => installment.repaidInterest)}</td>
                <td>{sumRow(installment => installment.repaidAmount)}</td>
                <td>{sumRow(installment => installment.overpayment)}</td>
                <td>-</td>
            </tr>
            </tbody>
        </table>
    );
}