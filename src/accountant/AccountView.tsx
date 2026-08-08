import {Account} from "../types";
import React, {useState} from "react";
import {Stack, useTheme} from "@mui/material";
import Typography from "@mui/material/Typography";
import {formatMonetaryAmount} from "../utils/functions";
import {rowHover} from "../utils/theme/utils";
import {AccountTransactions} from "./AccountTransactions";

export interface AccountViewProps {
    account: Account;
}

export function AccountView({account}: AccountViewProps) {
    const theme = useTheme();
    const [expanded, setExpanded] = useState(false)
    return <>
        <Stack direction={'row'} justifyContent={'space-between'} key={account.publicId}
               sx={{...rowHover(theme), minWidth: '270px'}}
               onClick={(e) => {
                   e.stopPropagation();
                   setExpanded(true);
               }}>
            <Typography>{account.name}</Typography>
            <Typography>{formatMonetaryAmount(account.currentBalance)}</Typography>
        </Stack>
        {
            expanded && <AccountTransactions key={'at' + account.publicId} account={account} onClose={() => {
                setExpanded(false);
                return Promise.resolve();
            }}/>
        }
    </>
}