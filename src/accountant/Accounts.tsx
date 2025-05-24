import {useQuery} from "@apollo/client";
import {GetFinanceManagement, GetFinanceManagementQuery} from "../types";
import React from "react";
import {GQLAccount, mapAccount} from "./model/types";
import {Box, Stack, useTheme} from "@mui/material";
import {MultiCurrencySummary} from "../application/components/MultiCurrencySummary";
import {formatMonetaryAmount} from "../utils/functions";
import {ComparatorBuilder} from "../utils/comparator-builder";

export function Accounts() {
    const {
        loading,
        error,
        data
    } = useQuery<GetFinanceManagementQuery>(
        GetFinanceManagement
    );
    const theme = useTheme();

    if (loading) {
        return <>Loading...</>
    } else if (error) {
        return <>Error...</>
    } else if (data) {
        const accounts = data.financeManagement.accounts
            .map(mapAccount)
            .sort(ComparatorBuilder.comparing<GQLAccount>(a => a.order).build());
        return <>
            <MultiCurrencySummary data={accounts}
                                  amountExtractor={account => account.currentBalance.amount}
                                  currencyExtractor={account => account.currentBalance.currency.code}
            />
            <Stack direction={'column'}>
                {(
                    accounts.map(account =>
                            (
                                <Stack direction={'row'} justifyContent={'space-between'} key={account.publicId}
                                       sx={{'&:hover': {backgroundColor: theme.palette.grey['300']}}}>
                                    <Box>{account.name}</Box>
                                    <Box>{formatMonetaryAmount(account.currentBalance)}</Box>
                                </Stack>
                            ))
                )}</Stack>
        </>;
    } else {
        return <></>;
    }
}