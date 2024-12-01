import {useQuery} from "@apollo/client";
import {GetFinanceManagement, GetFinanceManagementQuery} from "../types";
import React from "react";
import {mapAccount} from "./model/types";
import Decimal from "decimal.js";
import {Stack} from "@mui/material";

export function Accounts() {
    const {
        loading,
        error,
        data
    } = useQuery<GetFinanceManagementQuery>(
        GetFinanceManagement
    );

    if (loading) {
        return <>Loading...</>
    } else if (error) {
        return <>Error...</>
    } else if (data) {
        const accounts = data.financeManagement.accounts.map(mapAccount);
        const accountBalancePerCurrency = accounts.reduce((collector, account) => {
            const currency = account.currentBalance.currency.code;
            collector.set(currency, (collector.get(currency) || new Decimal(0)).add(account.currentBalance.amount));
            return collector;
        }, new Map<string, Decimal>())
        return <>
            <Stack direction="column" alignItems={'flex-end'}>
                {Array.from(accountBalancePerCurrency.entries()).map(([currency, balance], index) => {
                    return <Stack direction={'row'}>
                        {
                            Intl.NumberFormat(navigator.language, {
                                style: 'currency',
                                currency: currency
                            }).format(balance.toNumber())}
                    </Stack>;
                })}
            </Stack>

            <ul>
                {(
                    data.financeManagement.accounts
                        .map(account =>
                            (
                                <li key={account.publicId}>
                                    {account.name}
                                </li>
                            ))
                )}</ul>
        </>;
    } else {
        return <></>;
    }
}