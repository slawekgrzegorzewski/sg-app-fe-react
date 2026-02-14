import React from "react";
import Decimal from "decimal.js";
import {Stack, Theme, useTheme} from "@mui/material";
import {formatCurrency} from "../../utils/functions";
import {SxProps} from "@mui/system";
import Typography from "@mui/material/Typography";

type MultiCurrencySummaryProps<T> = {
    data: T[],
    amountExtractor: (data: T) => Decimal,
    currencyExtractor: (data: T) => string,
    header?: string,
    sx?: SxProps<Theme>,
}

export function MultiCurrencySummary<T>({
                                            data,
                                            amountExtractor,
                                            currencyExtractor,
                                            header,
                                            sx
                                        }: MultiCurrencySummaryProps<T>) {

    const theme = useTheme();

    const accountBalancePerCurrency = data.reduce((collector, account) => {
        const currency = currencyExtractor(account);
        collector.set(currency, (collector.get(currency) || new Decimal(0)).add(amountExtractor(account)));
        return collector;
    }, new Map<string, Decimal>());

    return <Stack direction="column" alignItems={'flex-end'} sx={{...sx}}>
        {Array.from(accountBalancePerCurrency.entries()).map(([currency, balance], index) => {
            return <Stack direction={'row'} key={'container' + index}>
                {
                    [(index === 0 && header) ?
                        <Typography key={'leftColumn' + index}
                                    sx={{paddingRight: '20px', color: theme.palette.grey['600']}}>
                            {header}
                        </Typography>
                        : null,
                        <Typography key={'rightColumn' + index}>{
                            formatCurrency(currency, balance)
                        }
                        </Typography>]
                }
            </Stack>;
        })}
    </Stack>;
}