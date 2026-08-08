import React, {ReactNode} from "react";
import Decimal from "decimal.js";
import {SxProps} from "@mui/system";
import {Theme, Typography, TypographyProps} from "@mui/material";
import {formatCurrency} from "../../utils/functions";

export type Money = {
    amount: Decimal | number;
    currency: string;
};

export interface FormattedMoneyTextProps extends Omit<TypographyProps, 'children'> {
    money: Money;
    children: (formattedValue: string) => ReactNode;
    parenthesizeNegative?: boolean;
}

export function formatMoney(
    money: Money,
    parenthesizeNegative = false
): string {
    const decimalValue = new Decimal(money.amount);

    if (decimalValue.isNegative() && parenthesizeNegative) {
        return `(${formatCurrency(money.currency, decimalValue.abs())})`;
    }

    return formatCurrency(money.currency, decimalValue);
}

export function FormattedMoneyText({
                                       money,
                                       children,
                                       parenthesizeNegative = false,
                                       sx,
                                       ...typographyProps
                                   }: FormattedMoneyTextProps) {
    const decimalValue = new Decimal(money.amount);
    const formattedValue = formatMoney(money, parenthesizeNegative);
    const customSx = Array.isArray(sx) ? sx : [sx];

    return <Typography
        variant="body2"
        {...typographyProps}
        sx={[
            {
                color: decimalValue.isNegative() ? 'error.main' : 'text.secondary',
                fontWeight: 500,
                fontVariantNumeric: 'tabular-nums',
            },
            ...customSx,
        ] as SxProps<Theme>}
    >
        {children(formattedValue)}
    </Typography>;
}
