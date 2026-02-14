import {useQuery} from "@apollo/client/react";
import {GetFinanceManagement, GetFinanceManagementQuery} from "../types";
import React from "react";
import {GQLAccount, GQLPiggyBank, mapAccount, mapPiggyBank} from "./model/types";
import {Stack, useTheme} from "@mui/material";
import {MultiCurrencySummary} from "../application/components/MultiCurrencySummary";
import {formatMonetaryAmount} from "../utils/functions";
import {ComparatorBuilder} from "../utils/comparator-builder";
import {rowHover} from "../utils/theme";
import Typography from "@mui/material/Typography";

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
        return <Stack direction={{xs: 'column', sm: 'row'}}
                      spacing={{xs: 0, sm: 2}}
                      justifyContent={'center'}
                      sx={{paddingLeft: '20px', paddingRight: '20px'}}>
            <Stack direction={'column'}>
                <Typography variant={'h4'} textAlign={'center'}>Twoje konta</Typography>
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
                                       sx={{...rowHover(theme), minWidth: '270px'}}>
                                    <Typography>{account.name}</Typography>
                                    <Typography>{formatMonetaryAmount(account.currentBalance)}</Typography>
                                </Stack>
                            ))
                    )}
                </Stack>
            </Stack>
            <Stack direction={'column'}>
                <Typography variant={'h4'} textAlign={'center'}>Skarbonki</Typography>
                <Stack>
                    {
                        piggyBanks.map((piggyBank) =>
                            <Stack direction={'row'} justifyContent={'space-between'} key={piggyBank.publicId}
                                   sx={{...rowHover(theme), minWidth: '270px'}}>
                                <Typography>{piggyBank.name}</Typography>
                                <Typography>{formatMonetaryAmount(piggyBank.balance)}</Typography>
                            </Stack>)
                    }
                </Stack>
            </Stack>
        </Stack>;
    } else {
        return <></>;
    }
}