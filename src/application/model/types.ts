import Decimal from "decimal.js";
import {CurrencyInfo, DomainSimple, MonetaryAmount} from "../../types";

export type GQLDomainSimple = { id: number; name: string }

export const mapDomainSimple = (domainSimple: DomainSimple) => {
    return {
        id: domainSimple.id,
        name: domainSimple.name,
    } as GQLDomainSimple;
}

export type GQLCurrencyInfo = {
    code: string;
    description: string;
}

export const mapCurrencyInfo = (currencyInfo: CurrencyInfo) => {
    return {
        code: currencyInfo.code,
        description: currencyInfo.description,
    } as GQLCurrencyInfo;
}

export type GQLMonetaryAmount = {
    amount: Decimal;
    currency: GQLCurrencyInfo;
}

export const mapMonetaryAmount = (monetaryAmount: MonetaryAmount) => {
    return {
        amount: new Decimal(monetaryAmount.amount),
        currency: mapCurrencyInfo(monetaryAmount.currency),
    } as GQLMonetaryAmount;
}
