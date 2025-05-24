import {
    GQLCurrencyInfo,
    GQLDomainSimple,
    GQLMonetaryAmount,
    mapCurrencyInfo,
    mapDomainSimple,
    mapMonetaryAmount
} from "../../application/model/types";
import {Account, BankAccount, BillingCategory} from "../../types";

export type GQLAccount = {
    publicId: string;
    order: number;
    name: string;
    currentBalance: GQLMonetaryAmount;
    creditLimit: GQLMonetaryAmount;
    balanceIndex: number;
    visible: boolean;
    bankAccount: GQLBankAccount;
    domain: GQLDomainSimple;
}

export const mapAccount = (account: Account) => {
    return {
        publicId: account.publicId,
        order: account.order,
        name: account.name,
        currentBalance: mapMonetaryAmount(account.currentBalance),
        creditLimit: mapMonetaryAmount(account.creditLimit),
        balanceIndex: account.balanceIndex,
        visible: account.visible,
        bankAccount: account.bankAccount ? mapBankAccount(account.bankAccount) : null,
        domain: account.domain ? mapDomainSimple(account.domain) : null
    } as GQLAccount;
}

export type GQLBankAccount = {
    bic: string;
    currency: GQLCurrencyInfo;
    domain: GQLDomainSimple;
    externalId: string;
    iban: string;
    id: number;
    owner: string;
    product: string;
}

export const mapBankAccount = (bankAccount: BankAccount) => {
    return {
        bic: bankAccount.bic,
        currency: mapCurrencyInfo(bankAccount.currency),
        domain: mapDomainSimple(bankAccount.domain),
        externalId: bankAccount.externalId,
        iban: bankAccount.iban,
        id: bankAccount.id,
        owner: bankAccount.owner,
        product: bankAccount.product
    } as GQLBankAccount;
}

export type GQLBillingCategory = {
    publicId: string;
    name: string;
    description: string;
    domain: GQLDomainSimple;
}

export const mapBillingCategory = (billingCategory: BillingCategory) => {
    return {
        publicId: billingCategory.publicId,
        name: billingCategory.name,
        description: billingCategory.description,
        domain: billingCategory.domain ? mapDomainSimple(billingCategory.domain) : null
    } as GQLBillingCategory;
}