import Form, {DatePickerEditorField, EditorField, SelectEditorField} from "../utils/forms/Form";
import * as React from "react";
import {JSX} from "react";
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

export const TRANSFER_FORM_PROPERTIES = (transfer: TransferDTO, accounts: GQLAccount[], restrictToDates: Dayjs[], alwaysEditable: boolean = false) => {
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
                    editable: alwaysEditable || !transfer.fromAccountPublicId,
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
                    editable: alwaysEditable || !transfer.toAccountPublicId,
                } as SelectEditorField,
                {
                    label: 'Kwota',
                    type: 'NUMBER',
                    key: 'amount',
                    editable: alwaysEditable || transfer.amount.isZero(),
                } as EditorField,
                {
                    label: 'Data',
                    type: 'DATEPICKER',
                    key: 'day',
                    editable: alwaysEditable || !transfer.day,
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

export interface CreateTransferFormProps {
    accounts: GQLAccount[];
    transferToCreate: TransferDTO & { possibleDays: Dayjs[] };
    onClose: (transferToCreate: TransferDTO | null) => void;
    alwaysEditable?: boolean;
}

export function CreateTransferForm({
                                       accounts,
                                       transferToCreate,
                                       onClose,
                                       alwaysEditable = false
                                   }: CreateTransferFormProps): JSX.Element {
    return <Form
        onSave={(transferDTO) => onClose({
            ...transferDTO,
            amount: new Decimal(transferDTO.amount),
            day: dayjs(transferDTO.day)
        })}
        onCancel={() => onClose(null)}
        {...TRANSFER_FORM_PROPERTIES(
            transferToCreate,
            accounts,
            transferToCreate.possibleDays,
            alwaysEditable
        )}
    />;
}