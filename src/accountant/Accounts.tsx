import {useQuery} from "@apollo/client/react";
import {GetFinanceManagement, GetFinanceManagementQuery} from "../types";
import React from "react";
import {GQLAccount, GQLPiggyBank, mapAccount, mapPiggyBank} from "./model/types";
import {Box, Grid, Stack, useTheme} from "@mui/material";
import {MultiCurrencySummary} from "../application/components/MultiCurrencySummary";
import {formatMonetaryAmount} from "../utils/functions";
import {ComparatorBuilder} from "../utils/comparator-builder";
import {BillingPeriodBrowser} from "./BillingPeriodBrowser";
import {rowHover} from "../utils/theme";

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
        const piggyBanks = data.financeManagement.piggyBanks
            .map(mapPiggyBank)
            .sort(ComparatorBuilder.comparing<GQLPiggyBank>(pb => pb.name).build());
        return <Grid container spacing={2} justifyContent={'space-between'}>
            <Grid size={2}>
                <MultiCurrencySummary data={accounts}
                                      amountExtractor={account => account.currentBalance.amount}
                                      currencyExtractor={account => account.currentBalance.currency.code}
                                      header={'Suma:'}
                                      sx={{...rowHover(theme)}}
                />
                <Stack direction={'column'}>
                    {(
                        accounts.map(account =>
                            (
                                <Stack direction={'row'} justifyContent={'space-between'} key={account.publicId}
                                       sx={{...rowHover(theme)}}>
                                    <Box>{account.name}</Box>
                                    <Box>{formatMonetaryAmount(account.currentBalance)}</Box>
                                </Stack>
                            ))
                    )}</Stack>
            </Grid>
            <Grid size={8} display={'flex'} justifyContent={'center'}>
                <BillingPeriodBrowser/>
            </Grid>
            <Grid size={2}>
                <Stack>
                    {
                        piggyBanks.map((piggyBank) => {
                            return <Box
                                key={piggyBank.publicId}>{piggyBank.name} {formatMonetaryAmount(piggyBank.balance)}</Box>;
                        })
                    }
                </Stack>
            </Grid>
        </Grid>;
    } else {
        return <></>;
    }
}