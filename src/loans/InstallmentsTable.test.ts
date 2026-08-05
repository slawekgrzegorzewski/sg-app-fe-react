import Decimal from "decimal.js";
import {mapInstallments, mapInstallmentsFromSimulation} from "./InstallmentsTable";
import {remainingCapital} from "./utils/loan-form";
import {CurrencyInfo, Installment as GraphqlInstallment, Loan, LoanCalculationInstallment} from "../types";

const PLN = {code: 'PLN', description: 'Polski złoty'} as CurrencyInfo;

const money = (amount: number) => ({amount: amount, currency: PLN});

const installment = (paidAt: string, repaidAmount: number, repaidInterest: number, overpayment: number) => ({
    paidAt: paidAt,
    repaidAmount: money(repaidAmount),
    repaidInterest: money(repaidInterest),
    overpayment: money(overpayment)
} as GraphqlInstallment);

describe('mapInstallments', () => {

    it('carries the outstanding capital forward across installments', () => {
        const result = mapInstallments(1000, [
            installment('2026-01-10', 100, 5, 0),
            installment('2026-02-10', 100, 4, 50)
        ]);

        expect(result).toHaveLength(2);
        expect(result[0].leftToRepayAfter.toString()).toBe('900');
        expect(result[1].leftToRepayAfter.toString()).toBe('750');
    });

    it('orders installments by payment date regardless of input order', () => {
        const result = mapInstallments(1000, [
            installment('2026-03-10', 300, 0, 0),
            installment('2026-01-10', 100, 0, 0),
            installment('2026-02-10', 200, 0, 0)
        ]);

        expect(result.map(i => i.paidAt.format('YYYY-MM-DD')))
            .toEqual(['2026-01-10', '2026-02-10', '2026-03-10']);
        expect(result.map(i => i.leftToRepayAfter.toString())).toEqual(['900', '700', '400']);
    });

    /*
     * The regression this file exists for. With native floating point,
     * 0.1 + 0.2 !== 0.3, so repeatedly subtracting such amounts from the balance
     * drifts: the old implementation ended on 999999.9999999999 style values.
     */
    it('does not accumulate floating point error', () => {
        const installments = Array.from({length: 10}, (_, index) =>
            installment(`2026-01-${(index + 1).toString().padStart(2, '0')}`, 0.1, 0, 0));

        const result = mapInstallments(1, installments);

        expect(result[result.length - 1].leftToRepayAfter.toString()).toBe('0');
        expect(result[result.length - 1].leftToRepayAfter.isZero()).toBe(true);
    });

    it('treats overpayment as a reduction of capital', () => {
        const result = mapInstallments(500, [installment('2026-01-10', 0, 0, 120.55)]);

        expect(result[0].leftToRepayAfter.toString()).toBe('379.45');
    });

    it('returns an empty schedule for a loan with no installments', () => {
        expect(mapInstallments(1000, [])).toEqual([]);
    });

    it('accepts a Decimal starting balance', () => {
        const result = mapInstallments(new Decimal('1000.05'), [installment('2026-01-10', 0.05, 0, 0)]);

        expect(result[0].leftToRepayAfter.toString()).toBe('1000');
    });
});

describe('mapInstallmentsFromSimulation', () => {

    const simulated = (from: string, to: string, gross: number, paidInterest: number, overpayment: number) => ({
        paymentFrom: from,
        paymentTo: to,
        installment: gross,
        paidInterest: paidInterest,
        overpayment: overpayment
    } as LoanCalculationInstallment);

    it('splits the gross installment into interest and capital', () => {
        const result = mapInstallmentsFromSimulation(1000, [
            simulated('2026-01-01', '2026-01-31', 120, 20, 0)
        ]);

        expect(result[0].repaidInterest.toString()).toBe('20');
        expect(result[0].repaidAmount.toString()).toBe('100');
        expect(result[0].leftToRepayAfter.toString()).toBe('900');
    });

    it('subtracts capital and overpayment but not interest from the balance', () => {
        const result = mapInstallmentsFromSimulation(1000, [
            simulated('2026-01-01', '2026-01-31', 120, 20, 30)
        ]);

        // 1000 - (120 - 20) - 30
        expect(result[0].leftToRepayAfter.toString()).toBe('870');
    });

    it('uses paymentTo as the displayed date and paymentFrom for ordering', () => {
        const result = mapInstallmentsFromSimulation(1000, [
            simulated('2026-02-01', '2026-02-28', 100, 0, 0),
            simulated('2026-01-01', '2026-01-31', 100, 0, 0)
        ]);

        expect(result.map(i => i.paidAt.format('YYYY-MM-DD'))).toEqual(['2026-01-31', '2026-02-28']);
    });
});

describe('remainingCapital', () => {

    const loan = (paidAmount: number, installments: GraphqlInstallment[]) => ({
        paidAmount: money(paidAmount),
        installments: installments
    } as Loan);

    it('is the paid out amount when nothing has been repaid', () => {
        const result = remainingCapital(loan(250000, []));

        expect(result.amount.toString()).toBe('250000');
        expect(result.currency.code).toBe('PLN');
    });

    it('subtracts capital repayments and overpayments', () => {
        const result = remainingCapital(loan(1000, [
            installment('2026-01-10', 100, 999, 0),
            installment('2026-02-10', 100, 999, 200)
        ]));

        // Interest is not a capital repayment, so the large interest values are ignored.
        expect(result.amount.toString()).toBe('600');
    });

    it('sums many small repayments exactly', () => {
        const installments = Array.from({length: 3}, (_, index) =>
            installment(`2026-01-0${index + 1}`, 0.1, 0, 0));

        const result = remainingCapital(loan(0.3, installments));

        expect(result.amount.isZero()).toBe(true);
    });

    it('returns a Decimal so callers can keep computing exactly', () => {
        expect(Decimal.isDecimal(remainingCapital(loan(100, [])).amount)).toBe(true);
    });
});
