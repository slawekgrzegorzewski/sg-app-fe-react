import {GQLDomainSimple, mapDomainSimple} from "../../application/model/types";
import {
    Account,
    BankAccount,
    BankPermission,
    BankPermissions,
    BillingCategory,
    CurrencyInfo,
    MonetaryAmount
} from "../../types";
import Decimal from "decimal.js";

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
    publicId: string;
    iban: string;
}

export const mapBankAccount = (bankAccount: BankAccount) => {
    return {
        publicId: bankAccount.publicId,
        iban: bankAccount.iban
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


export type GQLBankPermissions = {
    granted: GQLBankPermission[];
    toProcess: GQLBankPermission[];
}

export const mapBankPermissions = (bankPermissions: BankPermissions) => {
    return {
        granted: bankPermissions.granted.map(mapBankPermission),
        toProcess: bankPermissions.toProcess.map(mapBankPermission)
    } as GQLBankPermissions;
}

export type GQLBankPermission = {
    publicId: string;
    createdAt: Date;
    givenAt: Date;
    withdrawnAt: Date;
    bankAccounts: GQLBankAccount[];
    institutionId: string;
    reference: string;
    ssn: string;
    confirmationLink: string;
    requisitionId: string;
}

export const mapBankPermission = (bankPermission: BankPermission) => {
    return {
        publicId: bankPermission.publicId,
        createdAt: bankPermission.createdAt ? new Date(bankPermission.createdAt) : null,
        givenAt: bankPermission.givenAt ? new Date(bankPermission.givenAt) : null,
        withdrawnAt: bankPermission.withdrawnAt ? new Date(bankPermission.withdrawnAt) : null,
        bankAccounts: bankPermission.bankAccounts.map(mapBankAccount),
        institutionId: bankPermission.institutionId,
        reference: bankPermission.reference,
        ssn: bankPermission.ssn,
        confirmationLink: bankPermission.confirmationLink,
        requisitionId: bankPermission.requisitionId,
    } as GQLBankPermission;
}