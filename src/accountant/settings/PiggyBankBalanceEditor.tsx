import * as React from 'react';
import * as Yup from 'yup';
import Form, {EditorField} from '../../utils/forms/Form';
import {Divider, Paper, Stack, Typography, useTheme} from '@mui/material';
import type {PiggyBankDTO} from './PiggyBanksManagement';
import Decimal from 'decimal.js';
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
            additionalProps: {
                sx: {'& .MuiInputLabel-root': {color: 'text.primary'}},
            },
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
    const isCredit = type === 'CREDIT';

    return (
        <InformationDialog
            title={`${isCredit ? 'Dodaj środki' : 'Odejmij środki'}: ${piggyBank.name}`}
            open={true}
            onClose={() => {
                onCancel();
                return Promise.resolve();
            }}
            sx={{'& .MuiDialog-paper': {width: '100%', maxWidth: 440}}}
        >
            <Form
                {...FORM}
                presentation="dialog"
                submitLabel={isCredit ? 'Dodaj środki' : 'Odejmij środki'}
                submitColor={isCredit ? 'success' : 'error'}
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
                        <Paper component="section" aria-label="Podsumowanie salda" variant="outlined" sx={{p: 1.5}}>
                            <Stack spacing={1.25}>
                                <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
                                    <Typography variant="body2" color="text.secondary">
                                        Aktualne saldo
                                    </Typography>
                                    <Typography sx={{fontWeight: 600, fontVariantNumeric: 'tabular-nums'}}>
                                        {formatCurrency(piggyBank.currency, piggyBank.balance)}
                                    </Typography>
                                </Stack>
                                <Divider />
                                <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
                                    <Typography variant="body2" color="text.secondary">
                                        Saldo po operacji
                                    </Typography>
                                    <Typography
                                        sx={{
                                            color:
                                                newBalance.toNumber() >= 0
                                                    ? theme.palette.text.primary
                                                    : theme.palette.mode === 'light'
                                                      ? theme.palette.error.dark
                                                      : theme.palette.error.light,
                                            fontWeight: 700,
                                            fontVariantNumeric: 'tabular-nums',
                                        }}
                                    >
                                        {formatCurrency(piggyBank.currency, newBalance)}
                                    </Typography>
                                </Stack>
                            </Stack>
                        </Paper>
                    );
                }}
            />
        </InformationDialog>
    );
}
