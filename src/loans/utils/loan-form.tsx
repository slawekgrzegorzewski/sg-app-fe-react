import * as Yup from "yup";
import Decimal from "decimal.js";
import {DatePickerEditorField, EditorField} from "../../utils/forms/Form";
import dayjs, {Dayjs} from "dayjs";
import {Loan, MonetaryAmount} from "../../types";
import {RepaymentDayStrategyDisplay} from "../RepaymentDayStrategyDisplay";
import {RateStrategyDisplay} from "../RateStrategyDisplay";

export const remainingCapital = (loan: Loan): MonetaryAmount => {
    return {
        amount: loan.paidAmount.amount - loan.installments.map(installment => installment.repaidAmount.amount + installment.overpayment.amount).reduce((p, c) => p + c, 0),
        currency: loan.paidAmount.currency
    };
}

export type LoanDTO = {
    name: string,
    paymentDate: Dayjs,
    numberOfInstallments: number,
    paidAmount: Decimal,
    paidCurrency: string,
    rateStrategyConfigId: string,
    repaymentDayStrategyConfigId: string
}

export type Config = {
    publicId: string;
    name: string;
}
export const EDIT_LOAN_FORM_PROPS = (name: string) => {
    return {
        validationSchema: Yup.object({
            name: Yup.string()
                .required('Wymagana')
        }),
        initialValues: {
            name: name
        },
        fields:
            [
                {
                    label: 'Nazwa',
                    type: 'TEXT',
                    key: 'name',
                    editable: true
                } as EditorField
            ]
    }
};
export const CREATE_LOAN_FORM_PROPS = (currencies: string[], rateStrategyConfigs: Config[], repaymentDayStrategyConfigs: Config[]) => {
    return {
        validationSchema: Yup.object({
            name: Yup.string()
                .required('Wymagana'),
            paymentDate: Yup.date()
                .max(new Date(), 'Nie może być z przyszłości')
                .required('Wymagana'),
            numberOfInstallments: Yup.number()
                .positive()
                .integer()
                .required('Wymagana'),
            paidAmount: Yup.number()
                .positive('Musi być dodatnia')
                .required('Wymagana'),
            paidCurrency: Yup.string()
                .matches(
                    new RegExp(currencies.map(currency => "^" + currency + "$").join("|")),
                    "Waluta spoza dozwolonej listy")
                .required('Wymagana'),
            rateStrategyConfigId: Yup.string()
                .matches(
                    new RegExp(rateStrategyConfigs.map(config => "^" + config.publicId + "$").join("|")),
                    "Strategia spoza dozwolonej listy")
                .required('Wymagana'),
            repaymentDayStrategyConfigId: Yup.string()
                .matches(
                    new RegExp(repaymentDayStrategyConfigs.map(config => "^" + config.publicId + "$").join("|")),
                    "Strategia spoza dozwolonej listy")
                .required('Wymagana'),
        }),
        initialValues: {
            name: '',
            paymentDate: dayjs(),
            numberOfInstallments: 0,
            paidAmount: new Decimal(0),
            paidCurrency: 'PLN',
            rateStrategyConfigId: '',
            repaymentDayStrategyConfigId: ''
        },
        fields:
            [
                {
                    label: 'Nazwa',
                    type: 'TEXT',
                    key: 'name',
                    editable: true
                } as EditorField,
                {
                    label: 'Data wypłaty',
                    type: 'DATEPICKER',
                    key: 'paymentDate',
                    editable: true
                } as DatePickerEditorField,
                {
                    label: 'Liczba rat',
                    type: 'NUMBER',
                    key: 'numberOfInstallments',
                    editable: true
                } as EditorField,
                {
                    label: 'Wypłacona kwota',
                    type: 'NUMBER',
                    key: 'paidAmount',
                    editable: true
                } as EditorField,
                {
                    label: 'Waluta',
                    type: 'SELECT',
                    key: 'paidCurrency',
                    selectOptions: currencies.map(currency => ({
                        key: currency,
                        displayElement: (<>{currency}</>)
                    })),
                    editable: true
                } as EditorField,
                {
                    label: 'Strategia naliczania odsetek',
                    type: 'SELECT',
                    key: 'rateStrategyConfigId',
                    selectOptions: rateStrategyConfigs.map(config => ({
                        key: config.publicId,
                        displayElement: (<RateStrategyDisplay rateStrategyConfig={config}/>)
                    })),
                    editable: true
                } as EditorField,
                {
                    label: 'Strategia wyboru dnia spłaty',
                    type: 'SELECT',
                    key: 'repaymentDayStrategyConfigId',
                    selectOptions: repaymentDayStrategyConfigs.map(config => ({
                        key: config.publicId,
                        displayElement: (
                            <RepaymentDayStrategyDisplay repaymentDayStrategyConfig={config}/>)
                    })),
                    editable: true
                } as EditorField
            ]
    }
};

export type InstallmentDTO = {
    paidAt: Dayjs;
    repaidInterest: Decimal;
    repaidAmount: Decimal;
    overpayment: Decimal;
}
export const CREATE_INSTALLMENT_FORM_PROPS = () => {
    return {
        validationSchema: Yup.object({
            paidAt: Yup.date()
                .max(new Date(), 'Nie może być z przyszłości')
                .required('Wymagana'),
            repaidInterest: Yup.number()
                .min(0)
                .required('Wymagana'),
            repaidAmount: Yup.number()
                .min(0)
                .required('Wymagana'),
            overpayment: Yup.number()
                .min(0)
                .required('Wymagana')
        }),
        initialValues: {
            paidAt: dayjs(),
            repaidInterest: new Decimal(0),
            repaidAmount: new Decimal(0),
            overpayment: new Decimal(0),
        },
        fields:
            [
                {
                    label: 'Data spłaty',
                    type: 'DATEPICKER',
                    key: 'paidAt',
                    editable: true
                } as DatePickerEditorField,
                {
                    label: 'Spłacone odsetki',
                    type: 'NUMBER',
                    key: 'repaidInterest',
                    editable: true
                } as EditorField,
                {
                    label: 'Spłacony kapitał',
                    type: 'NUMBER',
                    key: 'repaidAmount',
                    editable: true
                } as EditorField,
                {
                    label: 'Nadpłata',
                    type: 'NUMBER',
                    key: 'overpayment',
                    editable: true
                } as EditorField,
            ]
    }
};

export type ConstantForNFirstInstallmentRateStrategyConfigDTO = {
    name: string;
    constantRate: Decimal;
    becomesVariableRateAfterNInstallments: Decimal;
    variableRateMargin: Decimal;
};

export const CREATE_RATE_STRATEGY_CONFIG = () => {
    return {
        validationSchema: Yup.object({
            name: Yup.string()
                .required('Wymagana'),
            constantRate: Yup.number()
                .positive('Musi być dodatnia')
                .required('Wymagana'),
            becomesVariableRateAfterNInstallments: Yup.number()
                .positive('Musi być dodatnia')
                .integer()
                .required('Wymagana'),
            variableRateMargin: Yup.number()
                .positive('Musi być dodatnia')
                .required('Wymagana'),
        }),
        initialValues: {
            name: '',
            constantRate: new Decimal("0.00"),
            becomesVariableRateAfterNInstallments: new Decimal("0"),
            variableRateMargin: new Decimal("0.00"),
        },
        fields:
            [
                {
                    label: 'Nazwa',
                    type: 'TEXT',
                    key: 'name',
                    editable: true
                } as EditorField,
                {
                    label: 'Stałe oprocentowanie',
                    type: 'NUMBER',
                    key: 'constantRate',
                    editable: true
                } as EditorField,
                {
                    label: 'Liczba miesięcy kiedy stałe oprocentowanie obowiązuje',
                    type: 'NUMBER',
                    key: 'becomesVariableRateAfterNInstallments',
                    editable: true
                } as EditorField,
                {
                    label: 'Marża po stałym oprocentowaniu',
                    type: 'NUMBER',
                    key: 'variableRateMargin',
                    editable: true
                } as EditorField,
            ]
    }
};

export type NthDayOfMonthRepaymentDayStrategyConfigDTO = {
    name: string;
    dayOfMonth: Decimal;
};

export const CREATE_REPAYMENT_DAY_STRATEGY_CONFIG = () => {
    return {
        validationSchema: Yup.object({
            name: Yup.string()
                .required('Wymagana'),
            dayOfMonth: Yup.number()
                .positive('Musi być dodatnia')
                .max(31)
                .required('Wymagana'),
        }),
        initialValues: {
            name: '',
            dayOfMonth: new Decimal("1")
        },
        fields:
            [
                {
                    label: 'Nazwa',
                    type: 'TEXT',
                    key: 'name',
                    editable: true
                } as EditorField,
                {
                    label: 'Dzień spłaty',
                    type: 'NUMBER',
                    key: 'dayOfMonth',
                    editable: true
                } as EditorField,
            ]
    }
};