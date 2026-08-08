import React from "react";
import Decimal from "decimal.js";
import {Stack, Theme} from "@mui/material";
import {SxProps} from "@mui/system";
import Typography from "@mui/material/Typography";
import {FormattedMoneyText} from "./FormattedMoneyText";

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

    const accountBalancePerCurrency = data.reduce((collector, account) => {
        const currency = currencyExtractor(account);
        collector.set(currency, (collector.get(currency) || new Decimal(0)).add(amountExtractor(account)));
        return collector;
    }, new Map<string, Decimal>());

    return <Stack direction="column" alignItems="flex-end" sx={sx}>
        {Array.from(accountBalancePerCurrency.entries()).map(([currency, balance], index) => {
            return <Stack
                direction="row"
                alignItems="center"
                justifyContent="flex-end"
                gap={2.5}
                key={'container' + index}
            >
                {(index === 0 && header) &&
                    <Typography sx={{color: 'secondary.main'}}>
                        {header}
                    </Typography>
                }
                <FormattedMoneyText
                    money={{
                        amount: balance,
                        currency: currency,
                    }}
                    parenthesizeNegative
                >
                    {formattedValue => <>{formattedValue}</>}
                </FormattedMoneyText>
            </Stack>;
        })}
    </Stack>;
}
