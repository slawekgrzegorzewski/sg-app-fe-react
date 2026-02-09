import * as React from "react";
import {useMutation} from "@apollo/client/react";
import {BankAccount, TriggerFetchBankAccountData, TriggerFetchBankAccountDataMutation} from "../../types";
import {Button} from "@mui/material";
import {GQLBankAccount} from "../model/types";

export interface FetchBankAccountDataButtonProps {
    bankAccount: BankAccount | GQLBankAccount;
}

export function FetchBankAccountDataButton({bankAccount}: FetchBankAccountDataButtonProps) {

    const [triggerFetchBankAccountDataMutation] = useMutation<TriggerFetchBankAccountDataMutation>(TriggerFetchBankAccountData);

    return <Button
        size="small"
        onClick={() => triggerFetchBankAccountDataMutation({
            variables: {
                bankAccountPublicId: bankAccount.publicId
            }
        })}>
        Pobierz dane
    </Button>
}