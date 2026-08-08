import {ErrorDisplay} from "../application/components/QueryState";
import {useQuery} from "@apollo/client/react";
import {Account, GetFinanceManagement, GetFinanceManagementQuery, PiggyBank} from "../types";
import React from "react";
import {Stack, useTheme} from "@mui/material";
import {MultiCurrencySummary} from "../application/components/MultiCurrencySummary";
import {formatMonetaryAmount} from "../utils/functions";
import {ComparatorBuilder} from "../utils/comparator-builder";
import {rowHover} from "../utils/theme/utils";
import Typography from "@mui/material/Typography";
import Decimal from "decimal.js";
import {AccountView} from "./AccountView";

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
        return <></>
    } else if (error) {
        return <ErrorDisplay error={error}/>
    } else if (data) {
        const accounts = [...(data.financeManagement.accounts as Account[])]
            .sort(ComparatorBuilder.comparing<Account>(a => a.order).build());
        const piggyBanks = [...(data.financeManagement.piggyBanks as PiggyBank[])]
            .sort(ComparatorBuilder.comparing<PiggyBank>(pb => pb.name).build());
        return <Stack direction={{xs: 'column', sm: 'row'}}
                      spacing={{xs: 0, sm: 2}}
                      justifyContent={'center'}
                      sx={{paddingLeft: '20px', paddingRight: '20px'}}>
            <Stack direction={'column'}>
                <Typography variant={'h4'} textAlign={'center'}>Twoje konta</Typography>
                <MultiCurrencySummary data={accounts}
                                      amountExtractor={account => new Decimal(account.currentBalance.amount)}
                                      currencyExtractor={account => account.currentBalance.currency.code}
                                      header={'Suma:'}
                                      sx={{...rowHover(theme)}}
                />
                <Stack direction={'column'}>
                    {(
                        accounts.map(account =>
                            (
                                <AccountView key={'av' + account.publicId} account={account}/>
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