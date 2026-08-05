import Decimal from "decimal.js";
import {GQLMonetaryAmount} from "../accountant/model/types";
import dayjs, {Dayjs} from "dayjs";

export const trimDateToDay = (date: Date | Dayjs) => {
    return dayjs(date).startOf('day').toDate();
}

export const trimDateToMonth = (date: Date | Dayjs) => {
    return dayjs(date).startOf('month').toDate();
}

export const maxDate = (dates: Date[]): Date => {
    if (dates.length === 0) return new Date();
    return dates.reduce((d1, d2) => d1 > d2 ? d1 : d2);
}

export const minDate = (dates: Dayjs[]): Dayjs => {
    if (dates.length === 0) return dayjs();
    return dates.reduce((d1, d2) => d1.isBefore(d2) ? d1 : d2);
}

export const formatMonetaryAmount = (monetaryAmount: GQLMonetaryAmount) => {
    return formatCurrency(monetaryAmount.currency.code, monetaryAmount.amount);
}

export const formatCurrency = (currency: string, amount: Decimal) => {
    return Intl.NumberFormat(navigator.language, {
        style: 'currency',
        currency: currency
    }).format(amount.toNumber())
}

export const formatBalance = (currency: string, amount: Decimal) => {
    const formatted = formatCurrency(currency, amount);
    return amount.toNumber() < 0 ? `(${formatted})` : `${formatted}`;
}

export function notEmpty<TValue>(value: TValue | null | undefined): value is TValue {
    return value !== null && value !== undefined;
}