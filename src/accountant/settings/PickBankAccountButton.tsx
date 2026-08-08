import * as React from 'react';
import {useState} from 'react';
import Button from '@mui/material/Button';
import PickDialog from '../../utils/dialogs/PickDialog';
import {BankAccount} from '../../types';

export interface PickBankAccountButtonProps {
    bankAccounts: BankAccount[];
    text: string;
    onPick: (bankAccount: BankAccount) => void;
    onClose: () => void;
}

export function PickBankAccountButton({bankAccounts, text, onPick, onClose}: PickBankAccountButtonProps) {
    const [pickNewInstitutionDialogOpen, setPickNewInstitutionDialogOpen] = useState(false);
    return (
        <>
            <Button
                onClick={e => {
                    e.stopPropagation();
                    setPickNewInstitutionDialogOpen(!pickNewInstitutionDialogOpen);
                }}
            >
                {text}
            </Button>
            <PickDialog
                title={'Wybierz konto bankowe'}
                options={bankAccounts}
                open={pickNewInstitutionDialogOpen}
                onClose={() => {
                    setPickNewInstitutionDialogOpen(false);
                    onClose();
                }}
                onPick={value => {
                    setPickNewInstitutionDialogOpen(false);
                    onPick(value);
                }}
                idExtractor={function (bankAccount: BankAccount | null): string {
                    return bankAccount ? bankAccount.publicId : '';
                }}
                descriptionExtractor={function (bankAccount: BankAccount | null): string {
                    return bankAccount ? bankAccount.iban : '';
                }}
            />
        </>
    );
}
