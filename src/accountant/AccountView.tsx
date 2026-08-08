import {Account} from "../types";
import React, {useState} from "react";
import {Stack, useTheme} from "@mui/material";
import Typography from "@mui/material/Typography";
import {compactListRow} from "../utils/theme/utils";
import {AccountTransactions} from "./AccountTransactions";
import {FormattedMoneyText} from "../application/components/FormattedMoneyText";

export interface AccountViewProps {
    account: Account;
}

export function AccountView({account}: AccountViewProps) {
    const theme = useTheme();
    const [expanded, setExpanded] = useState(false)
    return <>
        <Stack direction="row" alignItems="center" justifyContent="space-between" key={account.publicId}
               sx={compactListRow(theme)}
               onClick={(e) => {
                   e.stopPropagation();
                   setExpanded(true);
               }}>
            <Typography>{account.name}</Typography>
            <FormattedMoneyText
                money={{
                    amount: account.currentBalance.amount,
                    currency: account.currentBalance.currency.code,
                }}
                parenthesizeNegative
            >
                {formattedValue => <>{formattedValue}</>}
            </FormattedMoneyText>
        </Stack>
        {
            expanded && <AccountTransactions key={'at' + account.publicId} account={account} onClose={() => {
                setExpanded(false);
                return Promise.resolve();
            }}/>
        }
    </>
}
