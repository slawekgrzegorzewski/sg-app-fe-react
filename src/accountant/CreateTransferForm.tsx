import Form, {DatePickerEditorField, RegularEditorField, SelectEditorField} from "../utils/forms/Form";
import * as React from "react";
import {JSX, useState} from "react";
import {GQLAccount} from "./model/types";
import * as Yup from "yup";
import dayjs, {Dayjs} from "dayjs";
import Decimal from "decimal.js";

export type TransferDTO = {
    fromAccountPublicId?: string;
    fromAmount: Decimal;
    fromCurrency?: string;
    toAccountPublicId?: string;
    toAmount: Decimal;
    toCurrency?: string;
    day: Dayjs | null;
    description: string;
}

export const TRANSFER_FORM_PROPERTIES = (transfer: TransferDTO, accounts: GQLAccount[], restrictToDates: Dayjs[], alwaysEditable: boolean = false) => {
    const areAllCurrenciesSet = !!transfer.fromCurrency && !!transfer.toCurrency;
    const transferWithConversion = areAllCurrenciesSet && transfer.fromCurrency !== transfer.toCurrency;
    return {
        validationSchema: Yup.object({
            fromAccountPublicId: Yup.string().required('Wymagana'),
            toAccountPublicId: Yup.string().required('Wymagana'),
            fromAmount: Yup.number().required('Wymagana'),
            toAmount: Yup.number().required('Wymagana'),
            day: Yup.object().required('Wymagana'),
            description: Yup.string().required('Wymagana'),
        }),
        initialValues: {
            fromAccountPublicId: transfer.fromAccountPublicId,
            toAccountPublicId: transfer.toAccountPublicId,
            fromAmount: transfer.fromAmount,
            toAmount: transfer.toAmount,
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
                    label: 'Kwota' + (transferWithConversion ? ' z ' : ''),
                    type: 'NUMBER',
                    key: 'fromAmount',
                    additionalProps: {sx: {display: areAllCurrenciesSet ? 'block' : 'none'}},
                    editable: alwaysEditable || transfer.fromAmount.isZero(),
                } as RegularEditorField,
                {
                    label: 'Kwota na',
                    type: 'NUMBER',
                    key: 'toAmount',
                    additionalProps: {sx: {display: areAllCurrenciesSet && transferWithConversion ? 'block' : 'none'}},
                    editable: alwaysEditable || transfer.toAmount.isZero(),
                } as RegularEditorField,
                {
                    label: 'Data',
                    type: 'DATEPICKER',
                    key: 'day',
                    editable: alwaysEditable || !transfer.day,
                    additionalProps: {
                        sx: {
                            width: '200px',
                            display: areAllCurrenciesSet ? 'block' : 'none'
                        },
                    },
                    restrictToDates: restrictToDates
                } as DatePickerEditorField,
                {
                    label: 'Opis',
                    type: 'TEXTAREA',
                    key: 'description',
                    editable: true,
                    additionalProps: {sx: {display: areAllCurrenciesSet ? 'block' : 'none'}},
                } as RegularEditorField
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
    const [formProperties, setFormProperties] = useState(TRANSFER_FORM_PROPERTIES(
        transferToCreate,
        accounts,
        transferToCreate.possibleDays,
        alwaysEditable
    ))
    return <Form
        onSave={(transfer) => {
            const fromCurrency: string = accounts.find(a => a.publicId === transfer.fromAccountPublicId || '')?.currentBalance.currency.code || '';
            const toCurrency: string = accounts.find(a => a.publicId === transfer.toAccountPublicId || '')?.currentBalance.currency.code || '';
            if (fromCurrency === toCurrency) transfer.toAmount = transfer.fromAmount;
            onClose({
                ...transfer,
                fromAmount: new Decimal(transfer.fromAmount),
                toAmount: new Decimal(transfer.toAmount),
                day: dayjs(transfer.day)
            });
        }}
        onCancel={() => onClose(null)}
        onChange={(transfer) => {
            const fromCurrency: string = accounts.find(a => a.publicId === transfer.fromAccountPublicId || '')?.currentBalance.currency.code || '';
            const toCurrency: string = accounts.find(a => a.publicId === transfer.toAccountPublicId || '')?.currentBalance.currency.code || '';
            setFormProperties(TRANSFER_FORM_PROPERTIES(
                {
                    ...transfer,
                    fromCurrency: fromCurrency,
                    toCurrency: toCurrency,
                    toAmount: fromCurrency === toCurrency ? transfer.fromAmount : transfer.toAmount,
                },
                accounts,
                transferToCreate.possibleDays,
                alwaysEditable
            ));
        }}
        {...formProperties}
    />;
}