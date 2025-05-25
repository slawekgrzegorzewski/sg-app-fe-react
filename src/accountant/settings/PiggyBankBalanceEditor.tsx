import * as React from "react";
import * as Yup from "yup";
import Form, {EditorField} from "../../utils/forms/Form";
import {Dialog, DialogContent, DialogTitle, useTheme} from "@mui/material";
import {PiggyBankDTO} from "./PiggyBanksManagement";
import Decimal from "decimal.js";
import Box from "@mui/material/Box";
import {formatCurrency} from "../../utils/functions";

export type Type = 'CREDIT' | 'DEBIT';

const FORM = {
    validationSchema: Yup.object({
        balance: Yup.number().required()
    }),
    initialValues: {
        balance: 0
    },
    fields:
        [
            {
                label: 'Kwoat',
                type: 'NUMBER',
                key: 'balance',
                editable: true
            } as EditorField
        ]
};

export interface PiggyBankBalanceEditorProps {
    type: Type;
    piggyBank: PiggyBankDTO,
    onSave: (piggyBank: PiggyBankDTO) => void,
    onCancel: () => void
}

export function PiggyBankBalanceEditor({type, piggyBank, onSave, onCancel}: PiggyBankBalanceEditorProps) {
    const calculateNewBalance = (piggyBank: PiggyBankDTO, amount: number) => {
        const decimal = new Decimal(amount).abs();
        return type === 'CREDIT'
            ? piggyBank.balance.add(decimal)
            : piggyBank.balance.sub(decimal);
    }
    const theme = useTheme();

    return <Dialog open={true} maxWidth={"lg"} fullWidth={false}>
        <DialogTitle>{type === 'CREDIT' ? 'Uznaj' : 'Obciąż'}</DialogTitle>
        <DialogContent>
            <Form
                {...FORM}
                onSave={(v) => {
                    piggyBank.balance = calculateNewBalance(piggyBank, v.balance)
                    onSave(piggyBank);
                }}
                onCancel={onCancel}
                previewOfChange={(value) => {
                    const valueFromForm = value.balance || 0;
                    const newBalance = calculateNewBalance(piggyBank, valueFromForm);
                    return <Box>
                        <span>Balans po {type === 'CREDIT' ? 'uznaniu' : 'obciążeniu'}</span>
                        <span
                            style={{color: newBalance.toNumber() >= 0 ? theme.palette.text.primary : theme.palette.error.main}}> {formatCurrency(piggyBank.currency, newBalance)}</span>
                    </Box>;
                }}
            />
        </DialogContent>
    </Dialog>
}