import {DatePickerEditorField, EditorField, SelectEditorField} from "../utils/forms/Form";
import * as React from "react";
import {GQLAccount} from "./model/types";
import * as Yup from "yup";
import dayjs, {Dayjs} from "dayjs";
import Decimal from "decimal.js";

export type TransferDTO = {
    fromAccountPublicId?: string;
    toAccountPublicId?: string;
    amount: Decimal;
    day: Dayjs | null;
    description: string;
}

export const TRANSFER_FORM_PROPERTIES = (transfer: TransferDTO, accounts: GQLAccount[], restrictToDates: Dayjs[]) => {
    return {
        validationSchema: Yup.object({
            fromAccountPublicId: Yup.string().required('Wymagana'),
            toAccountPublicId: Yup.string().required('Wymagana'),
            amount: Yup.number().required('Wymagana'),
            day: Yup.object().required('Wymagana'),
            description: Yup.string().required('Wymagana'),
        }),
        initialValues: {
            fromAccountPublicId: transfer.fromAccountPublicId,
            toAccountPublicId: transfer.toAccountPublicId,
            amount: transfer.amount,
            day: transfer.day || restrictToDates.length > 0 ? restrictToDates[restrictToDates.length - 1] : dayjs(),
            description: transfer.description
        } as TransferDTO,
        fields:
            [
                {
                    key: 'fromAccountPublicId',
                    label: 'Z konta',
                    type: 'SELECT',
                    selectOptions: accounts.map(account => {
                        return {
                            key: account.publicId,
                            displayElement: (<>{account.name + ' (' + account.currentBalance.currency.code + ')'}</>)
                        };
                    }),
                    editable: !transfer.fromAccountPublicId,
                } as SelectEditorField,
                {
                    key: 'toAccountPublicId',
                    label: 'Na konto',
                    type: 'SELECT',
                    selectOptions: accounts.map(account => {
                        return {
                            key: account.publicId,
                            displayElement: (<>{account.name + ' (' + account.currentBalance.currency.code + ')'}</>)
                        };
                    }),
                    editable: !transfer.toAccountPublicId,
                } as SelectEditorField,
                {
                    label: 'Kwota',
                    type: 'NUMBER',
                    key: 'amount',
                    editable: transfer.amount.isZero(),
                } as EditorField,
                {
                    label: 'Data',
                    type: 'DATEPICKER',
                    key: 'day',
                    editable: !transfer.day,
                    additionalProps: {
                        sx: {width: '200px'},
                    },
                    restrictToDates: restrictToDates
                } as DatePickerEditorField,
                {
                    label: 'Opis',
                    type: 'TEXTAREA',
                    key: 'description',
                    editable: true
                } as EditorField
            ]
    }
};