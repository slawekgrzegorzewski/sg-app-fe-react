import * as React from 'react';
import * as Yup from 'yup';
import Form, {EditorField} from '../../utils/forms/Form';
import {useTheme} from '@mui/material';
import type {PiggyBankDTO} from './PiggyBanksManagement';
import Decimal from 'decimal.js';
import Box from '@mui/material/Box';
import {formatCurrency} from '../../utils/functions';
import InformationDialog from '../../utils/dialogs/InformationDialog';

export type Type = 'CREDIT' | 'DEBIT';

const FORM = {
    validationSchema: Yup.object({
        balance: Yup.number().moreThan(0, 'Kwota musi być większa od zera').required('Wymagana'),
    }),
    initialValues: {
        balance: 0,
    },
    fields: [
        {
            label: 'Kwota',
            type: 'NUMBER',
            key: 'balance',
            editable: true,
        } as EditorField,
    ],
};

export interface PiggyBankBalanceEditorProps {
    type: Type;
    piggyBank: PiggyBankDTO;
    onSave: (piggyBank: PiggyBankDTO) => void;
    onCancel: () => void;
}

export function calculateNewPiggyBankBalance(currentBalance: Decimal, amount: number, type: Type) {
    const absoluteAmount = new Decimal(amount).abs();
    return type === 'CREDIT' ? currentBalance.add(absoluteAmount) : currentBalance.sub(absoluteAmount);
}

export function PiggyBankBalanceEditor({type, piggyBank, onSave, onCancel}: PiggyBankBalanceEditorProps) {
    const theme = useTheme();

    return (
        <InformationDialog
            title={type === 'CREDIT' ? 'Uznaj' : 'Obciąż'}
            open={true}
            onClose={() => {
                onCancel();
                return Promise.resolve();
            }}
        >
            <Form
                {...FORM}
                onSave={v => {
                    onSave({
                        ...piggyBank,
                        balance: calculateNewPiggyBankBalance(piggyBank.balance, v.balance, type),
                    });
                }}
                onCancel={onCancel}
                previewOfChange={value => {
                    const valueFromForm = value.balance || 0;
                    const newBalance = calculateNewPiggyBankBalance(piggyBank.balance, valueFromForm, type);
                    return (
                        <Box>
                            <span>Balans po {type === 'CREDIT' ? 'uznaniu' : 'obciążeniu'}</span>
                            <span
                                style={{
                                    color:
                                        newBalance.toNumber() >= 0
                                            ? theme.palette.text.primary
                                            : theme.palette.error.main,
                                }}
                            >
                                {' '}
                                {formatCurrency(piggyBank.currency, newBalance)}
                            </span>
                        </Box>
                    );
                }}
            />
        </InformationDialog>
    );
}
