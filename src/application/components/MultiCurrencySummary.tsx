import React from "react";
import Decimal from "decimal.js";
import {Box, Stack, useTheme} from "@mui/material";
import {formatCurrency} from "../../utils/functions";

type MultiCurrencySummaryProps<T> = {
    data: T[];
    amountExtractor: (data: T) => Decimal;
    currencyExtractor: (data: T) => string;
}

export function MultiCurrencySummary<T>({data, amountExtractor, currencyExtractor}: MultiCurrencySummaryProps<T>) {

    const theme = useTheme();

    const accountBalancePerCurrency = data.reduce((collector, account) => {
        const currency = currencyExtractor(account);
        collector.set(currency, (collector.get(currency) || new Decimal(0)).add(amountExtractor(account)));
        return collector;
    }, new Map<string, Decimal>());

    return <Stack direction="column" alignItems={'flex-end'}
                  sx={{'&:hover': {backgroundColor: theme.palette.grey['300']}}}>
        {Array.from(accountBalancePerCurrency.entries()).map(([currency, balance], index) => {
            return <Stack direction={'row'} key={'container' + index}>
                {
                    [index === 0 ?
                        <Box key={'leftColumn' + index} sx={{paddingRight: '20px', color: theme.palette.grey['600']}}>
                            Suma:
                        </Box>
                        : null,
                        <Box key={'rightColumn' + index}>{
                            formatCurrency(currency, balance)
                        }
                        </Box>]
                }
            </Stack>;
        })}
    </Stack>;
}