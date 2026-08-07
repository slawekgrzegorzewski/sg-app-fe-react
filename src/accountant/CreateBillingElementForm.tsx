import Form, {DatePickerEditorField, EditorField, SelectEditorField} from "../utils/forms/Form";
import * as React from "react";
import {JSX} from "react";
import { BillingElementType} from "./model/BillingElementType";
import * as Yup from "yup";
import dayjs, {Dayjs} from "dayjs";
import Decimal from "decimal.js";
import {Account, BillingCategory, PiggyBank} from "../types";

export type Option = { id: string; name: string; }

export const EMPTY_OPTION = {id: '', name: ''}

export type BillingElementDTO = {
    billingElementType: BillingElementType;
    publicId: string;
    affectedAccountPublicId: string;
    amount: Decimal;
    category: BillingCategory | null;
    date: Dayjs | null;
    description: string;
    piggyBank: PiggyBank | null;
}

export const BILLING_ELEMENT_FORM_PROPERTIES = (billingElement: BillingElementDTO, accounts: Account[], categories: BillingCategory[], piggyBanks: PiggyBank[], alwaysEditable: boolean = false) => {
    return {
        validationSchema: Yup.object({
            billingElementType: Yup.string(),
            publicId: Yup.string(),
            affectedAccountPublicId: Yup.string().required('Wymagana'),
            amount: Yup.number().required('Wymagana'),
            category: Yup.object().required('Wymagana'),
            date: Yup.object().required('Wymagana'),
            description: Yup.string().required('Wymagana'),
            piggyBank: Yup.object().nullable(),
        }),
        initialValues: {
            billingElementType: billingElement.billingElementType,
            publicId: billingElement.publicId,
            affectedAccountPublicId: billingElement.affectedAccountPublicId,
            amount: billingElement.amount,
            category: billingElement.category || EMPTY_OPTION,
            date: billingElement.date || dayjs(),
            description: billingElement.description,
            piggyBank: billingElement.piggyBank || EMPTY_OPTION,
        } as BillingElementDTO,
        fields:
            [
                {
                    label: 'BillingElementType',
                    type: 'HIDDEN',
                    key: 'billingElementType',
                    editable: false
                } as EditorField,
                {
                    label: 'PublicId',
                    type: 'HIDDEN',
                    key: 'publicId',
                    editable: false
                } as EditorField,
                {
                    key: 'affectedAccountPublicId',
                    label: billingElement.billingElementType === 'Income' ? 'Na konto' : 'Z konta',
                    type: 'SELECT',
                    selectOptions: accounts.map(account => {
                        return {
                            key: account.publicId,
                            displayElement: (<>{account.name + ' (' + account.currentBalance.currency.code + ')'}</>)
                        };
                    }),
                    editable: alwaysEditable || !billingElement.affectedAccountPublicId,
                } as SelectEditorField,
                {
                    label: 'Kwota',
                    type: 'NUMBER',
                    key: 'amount',
                    editable: alwaysEditable || billingElement.amount.isZero(),
                } as EditorField,
                {
                    label: 'Kategoria',
                    type: 'AUTOCOMPLETE',
                    key: 'category',
                    options: categories,
                    getOptionLabel: (billingCategory: Option) => billingCategory.name,
                    isOptionEqualToValue: (option: Option, value: Option) => option.id === value.id,
                    editable: alwaysEditable || !billingElement.category
                } as EditorField,
                {
                    label: 'Data',
                    type: 'DATEPICKER',
                    key: 'date',
                    editable: alwaysEditable || !billingElement.date,
                    additionalProps: {
                        sx: {width: '200px'},
                    }
                } as DatePickerEditorField,
                {
                    label: 'Opis',
                    type: 'TEXTAREA',
                    key: 'description',
                    editable: true
                } as EditorField,
                {
                    label: 'Skarbonka do ' + (billingElement.billingElementType === 'Income' ? 'uznania' : 'obciążenia'),
                    type: 'AUTOCOMPLETE',
                    key: 'piggyBank',
                    options: piggyBanks,
                    getOptionLabel: (piggyBank: Option) => piggyBank.name,
                    isOptionEqualToValue: (option: Option, value: Option) => option.id === value.id,
                    editable: true
                } as EditorField,
            ]
    }
};

export interface CreateBillingElementFormProps {
    accounts: Account[];
    billingCategories: BillingCategory[];
    piggyBanks: PiggyBank[];
    billingElementToCreate: BillingElementDTO;
    onClose: (billingElement: BillingElementDTO | null) => void;
    alwaysEditable?: boolean;
}

export function CreateBillingElementForm({
                                             accounts,
                                             billingCategories,
                                             piggyBanks,
                                             billingElementToCreate,
                                             onClose,
                                             alwaysEditable = false,
                                         }: CreateBillingElementFormProps): JSX.Element {
    return <Form
        onSave={be => {
            onClose({
                ...be,
                amount: new Decimal(be.amount)
            })
        }}
        onCancel={() => onClose(null)}
        {...BILLING_ELEMENT_FORM_PROPERTIES(
            billingElementToCreate,
            accounts,
            billingCategories,
            piggyBanks,
            alwaysEditable
        )}
    />;
}