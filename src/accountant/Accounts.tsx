import {ErrorDisplay} from "../application/components/QueryState";
import {useQuery} from "@apollo/client/react";
import {Account, GetFinanceManagement, GetFinanceManagementQuery, PiggyBank} from "../types";
import React from "react";
import {Stack, useTheme} from "@mui/material";
import {MultiCurrencySummary} from "../application/components/MultiCurrencySummary";
import {formatMonetaryAmount} from "../utils/functions";
import {ComparatorBuilder} from "../utils/comparator-builder";
import Typography from "@mui/material/Typography";
import Decimal from "decimal.js";
import {AccountView} from "./AccountView";
import {compactListRow} from "../utils/theme/utils";

export function Accounts() {
    const {
        loading,
        error,
        data
    } = useQuery<GetFinanceManagementQuery>(GetFinanceManagement);
    const theme = useTheme();

    if (loading) {
        return <></>;
    }

    if (error) {
        return <ErrorDisplay error={error}/>;
    }

    if (data) {
        const accounts = [...(data.financeManagement.accounts as Account[])]
            .filter(a => a.visible)
            .sort(
                ComparatorBuilder
                    .comparing<Account>(a => a.order)
                    .build()
            );

        const piggyBanks = [...(data.financeManagement.piggyBanks as PiggyBank[])]
            .sort(
                ComparatorBuilder
                    .comparing<PiggyBank>(pb => pb.name)
                    .build()
            );

        return (
            <Stack
                direction={{xs: 'column', md: 'row'}}
                spacing={{xs: 3, md: 5}}
                justifyContent="center"
                alignItems={{xs: 'stretch', md: 'flex-start'}}
                sx={{
                    px: {xs: 1, sm: 2},
                    py: 2,
                }}
            >
                <Stack
                    direction="column"
                    sx={{
                        width: '100%',
                        maxWidth: 800,
                    }}
                >
                    <Typography
                        variant="h4"
                        textAlign="center"
                        sx={{
                            mb: 1.5,
                            color: 'secondary.main',
                        }}
                    >
                        Twoje konta
                    </Typography>

                    <MultiCurrencySummary
                        data={accounts}
                        amountExtractor={account =>
                            new Decimal(account.currentBalance.amount)
                        }
                        currencyExtractor={account =>
                            account.currentBalance.currency.code
                        }
                        header="Suma:"
                        sx={{
                            mb: 1,
                            ...compactListRow(theme),
                        }}
                    />

                    <Stack direction="column">
                        {accounts.map(account => (
                            <AccountView
                                key={'av' + account.publicId}
                                account={account}
                            />
                        ))}
                    </Stack>
                </Stack>

                <Stack
                    direction="column"
                    sx={{
                        width: '100%',
                        maxWidth: 800,
                    }}
                >
                    <Typography
                        variant="h4"
                        textAlign="center"
                        sx={{
                            mb: 1.5,
                            color: 'secondary.main',
                        }}
                    >
                        Skarbonki
                    </Typography>

                    <Stack direction="column">
                        {piggyBanks.map(piggyBank => (
                            <Stack
                                key={piggyBank.publicId}
                                direction="row"
                                alignItems="center"
                                justifyContent="space-between"
                                sx={compactListRow(theme)}
                            >
                                <Typography>
                                    {piggyBank.name}
                                </Typography>

                                <Typography
                                    sx={{
                                        fontWeight: 500,
                                        fontVariantNumeric: 'tabular-nums',
                                        whiteSpace: 'nowrap',
                                        ml: 2,
                                    }}
                                >
                                    {formatMonetaryAmount(piggyBank.balance)}
                                </Typography>
                            </Stack>
                        ))}
                    </Stack>
                </Stack>
            </Stack>
        );
    }

    return <></>;
}
