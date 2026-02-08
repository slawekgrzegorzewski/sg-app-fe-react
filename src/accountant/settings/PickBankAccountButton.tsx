import * as React from "react";
import {useState} from "react";
import {GQLBankAccount} from "../model/types";
import Button from "@mui/material/Button";
import PickDialog from "../../utils/dialogs/PickDialog";


export interface PickBankAccountButtonProps {
    bankAccounts: GQLBankAccount[],
    text: string,
    onPick: (bankAccount: GQLBankAccount) => void,
    onClose: () => void
}

export function PickBankAccountButton({
                                          bankAccounts,
                                          text,
                                          onPick,
                                          onClose
                                      }: PickBankAccountButtonProps) {
    const [pickNewInstitutionDialogOpen, setPickNewInstitutionDialogOpen] = useState(false);
    return <>
        <Button onClick={(e) => {
            e.stopPropagation();
            setPickNewInstitutionDialogOpen(!pickNewInstitutionDialogOpen);
        }}>
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
            onPick={(value) => {
                setPickNewInstitutionDialogOpen(false);
                onPick(value);
            }}
            idExtractor={function (bankAccount: GQLBankAccount | null): string {
                return bankAccount ? bankAccount.publicId : "";
            }}
            descriptionExtractor={function (bankAccount: GQLBankAccount | null): string {
                return bankAccount ? bankAccount.iban : "";
            }}
        />
    </>;
}