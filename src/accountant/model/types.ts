import {GQLDomainSimple, mapDomainSimple} from "../../application/model/types";
import {
    Account,
    BankAccount,
    BankPermission,
    BankPermissions,
    BankTransactionToImport,
    BillingCategory,
    BillingCategoryShort,
    BillingPeriod,
    BillingPeriodCreationBlockers,
    CurrencyInfo,
    Expense,
    Income,
    Institution,
    MonetaryAmount,
    MonthSummary,
    MonthSummaryAccount,
    MonthSummaryPiggyBank,
    MonthSummarySavings,
    PiggyBank
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

export type GQLPiggyBank = {
    publicId: string;
    name: string;
    description: string;
    balance: GQLMonetaryAmount;
    monthlyTopUp: GQLMonetaryAmount;
    savings: boolean;
    domain: GQLDomainSimple;
}

export const mapPiggyBank = (piggyBank: PiggyBank) => {
    return {
        publicId: piggyBank.publicId,
        name: piggyBank.name,
        description: piggyBank.description,
        balance: mapMonetaryAmount(piggyBank.balance),
        monthlyTopUp: mapMonetaryAmount(piggyBank.monthlyTopUp),
        savings: piggyBank.savings,
        domain: mapDomainSimple(piggyBank.domain)
    } as GQLPiggyBank;
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

export type GQLBillingCategoryShort = {
    name: string;
    description: string;
}

export const mapBillingCategory = (billingCategory: BillingCategory) => {
    return {
        publicId: billingCategory.publicId,
        name: billingCategory.name,
        description: billingCategory.description,
        domain: billingCategory.domain ? mapDomainSimple(billingCategory.domain) : null
    } as GQLBillingCategory;
}

export const mapBillingCategoryShort = (billingCategoryShort: BillingCategoryShort) => {
    return {
        name: billingCategoryShort.name,
        description: billingCategoryShort.description,
    } as GQLBillingCategoryShort;
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

export const createCurrencyInfo = (code: string) => {
    return {
        code: code,
        description: '',
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

export type GQLBillingPeriod = {
    publicId: string;
    name: string;
    period: Date;
    incomes: GQLIncome[];
    expenses: GQLExpense[];
}

export type GQLBillingPeriodCreationBlockers = {
    alreadyExists: boolean;
    notForCurrentMonth: boolean;
    unfinishedBillingPeriods: boolean;
}

export type GQLIncome = {
    publicId: string;
    description: string;
    amount: Decimal;
    currency: GQLCurrencyInfo;
    category: GQLBillingCategoryShort;
    date: Date;
}

export type GQLExpense = {
    publicId: string;
    description: string;
    amount: Decimal;
    currency: GQLCurrencyInfo;
    category: GQLBillingCategoryShort;
    date: Date;
}

export type GQLMonthSummary = {
    savings: GQLMonthSummarySavings[];
    accounts: GQLMonthSummaryAccount[];
    piggyBanks: GQLMonthSummaryPiggyBank[];
}

export type GQLMonthSummarySavings = {
    currency: GQLCurrencyInfo;
    amount: Decimal;
}

export type GQLMonthSummaryAccount = {
    publicId: string;
    name: string;
    currency: GQLCurrencyInfo;
    currentBalance: Decimal;
    lastTransactionIdIncludedInBalance: number;
}

export type GQLMonthSummaryPiggyBank = {
    name: string;
    description: string;
    balance: Decimal;
    currency: GQLCurrencyInfo;
    savings: boolean;
    monthlyTopUp: Decimal;
}

export const mapBillingPeriod = (billingPeriod: BillingPeriod) => {
    return {
        publicId: billingPeriod.publicId,
        name: billingPeriod.name,
        period: billingPeriod.period,
        incomes: billingPeriod.incomes ? billingPeriod.incomes.map(mapIncome) : [],
        expenses: billingPeriod.expenses ? billingPeriod.expenses.map(mapExpense) : [],
    } as GQLBillingPeriod;
}

export const mapBillingPeriodCreationBlockers = (billingPeriod: BillingPeriodCreationBlockers) => {
    return {
        alreadyExists: billingPeriod.alreadyExists,
        notForCurrentMonth: billingPeriod.notForCurrentMonth,
        unfinishedBillingPeriods: billingPeriod.unfinishedBillingPeriods,
    } as GQLBillingPeriodCreationBlockers;
}

export const mapIncome = (income: Income) => {
    return {
        publicId: income.publicId,
        description: income.description,
        amount: new Decimal(income.amount),
        currency: createCurrencyInfo(income.currency),
        category: mapBillingCategoryShort(income.category),
        date: new Date(income.date),
    } as GQLIncome;
}

export const mapExpense = (expense: Expense) => {
    return {
        publicId: expense.publicId,
        description: expense.description,
        amount: new Decimal(expense.amount),
        currency: createCurrencyInfo(expense.currency),
        category: mapBillingCategoryShort(expense.category),
        date: new Date(expense.date),
    } as GQLExpense;
}

export const mapMonthSummary = (monthSummary: MonthSummary) => {
    return {
        savings: monthSummary.savings ? monthSummary.savings.map(mapMonthSummarySavings) : [],
        accounts: monthSummary.accounts ? monthSummary.accounts.map(mapMonthSummaryAccount) : [],
        piggyBanks: monthSummary.piggyBanks ? monthSummary.piggyBanks.map(mapMonthSummaryPiggyBank) : [],
    } as GQLMonthSummary;
}

function mapMonthSummarySavings(monthSummarySavings: MonthSummarySavings) {
    return {
        currency: mapCurrencyInfo(monthSummarySavings.currency),
        amount: new Decimal(monthSummarySavings.amount),
    } as GQLMonthSummarySavings;
}

function mapMonthSummaryAccount(monthSummaryAccount: MonthSummaryAccount) {
    return {
        publicId: monthSummaryAccount.publicId,
        name: monthSummaryAccount.name,
        currency: mapCurrencyInfo(monthSummaryAccount.currency),
        currentBalance: new Decimal(monthSummaryAccount.currentBalance),
        lastTransactionIdIncludedInBalance: monthSummaryAccount.lastTransactionIdIncludedInBalance,
    } as GQLMonthSummaryAccount;
}

function mapMonthSummaryPiggyBank(monthSummaryPiggyBank: MonthSummaryPiggyBank) {
    return {
        name: monthSummaryPiggyBank.name,
        description: monthSummaryPiggyBank.description,
        balance: new Decimal(monthSummaryPiggyBank.balance),
        currency: mapCurrencyInfo(monthSummaryPiggyBank.currency),
        savings: monthSummaryPiggyBank.savings,
        monthlyTopUp: new Decimal(monthSummaryPiggyBank.monthlyTopUp),
    } as GQLMonthSummaryPiggyBank;
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
    institution: GQLInstitution;
    reference: string;
    ssn: string;
    confirmationLink: string;
    requisitionId: string;
}

export type GQLInstitution = {
    id: string;
    name: string;
    bic: string;
    transactionTotalDays: number;
    countries: string[];
    logo: string;
}

export const mapBankPermission = (bankPermission: BankPermission) => {
    return {
        publicId: bankPermission.publicId,
        createdAt: bankPermission.createdAt ? new Date(bankPermission.createdAt) : null,
        givenAt: bankPermission.givenAt ? new Date(bankPermission.givenAt) : null,
        withdrawnAt: bankPermission.withdrawnAt ? new Date(bankPermission.withdrawnAt) : null,
        bankAccounts: bankPermission.bankAccounts.map(mapBankAccount),
        institutionId: bankPermission.institutionId,
        institution: bankPermission.institution ? mapInstitution(bankPermission.institution) : null,
        reference: bankPermission.reference,
        ssn: bankPermission.ssn,
        confirmationLink: bankPermission.confirmationLink,
        requisitionId: bankPermission.requisitionId,
    } as GQLBankPermission;
}

export const mapInstitution = (institution: Institution) => {
    return {
        id: institution.id,
        name: institution.name,
        bic: institution.bic,
        transactionTotalDays: institution.transactionTotalDays,
        countries: institution.countries,
        logo: institution.logo
    } as GQLInstitution;
};

export type GQLBankTransactionToImport = {
    id: number;
    conversionRate: Decimal;
    credit: Decimal;
    debit: Decimal;
    description: string;
    timeOfTransaction: Date;
    destinationAccountPublicId: string;
    sourceAccountPublicId: string;
    creditBankAccountPublicId: string;
    debitBankAccountPublicId: string;
    transactionPublicId: string;
    creditTransactionPublicId: string;
    debitTransactionPublicId: string;
}

export const mapBankTransactionToImport = (bankTransactionToImport: BankTransactionToImport) => {
    return {
        id: bankTransactionToImport.id,
        conversionRate: bankTransactionToImport.conversionRate,
        credit: new Decimal(bankTransactionToImport.credit),
        debit: new Decimal(bankTransactionToImport.debit),
        description: bankTransactionToImport.description,
        timeOfTransaction: bankTransactionToImport.timeOfTransaction,
        destinationAccountPublicId: bankTransactionToImport.destinationAccountPublicId,
        sourceAccountPublicId: bankTransactionToImport.sourceAccountPublicId,
        creditBankAccountPublicId: bankTransactionToImport.creditBankAccountPublicId,
        debitBankAccountPublicId: bankTransactionToImport.debitBankAccountPublicId,
        transactionPublicId: bankTransactionToImport.transactionPublicId,
        creditTransactionPublicId: bankTransactionToImport.creditTransactionPublicId,
        debitTransactionPublicId: bankTransactionToImport.debitTransactionPublicId,
    } as GQLBankTransactionToImport;
}