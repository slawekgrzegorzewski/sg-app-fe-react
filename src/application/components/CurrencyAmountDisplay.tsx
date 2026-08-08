import * as React from 'react';
import getUserLocale from 'get-user-locale';
import {CurrencyInfo} from '../../types';
import Decimal from 'decimal.js';

export type CurrencyAmountDisplayProps = {
    amount: Decimal | number;
    currency: CurrencyInfo;
};

export function CurrencyAmountDisplay({amount, currency}: CurrencyAmountDisplayProps) {
    const value = Decimal.isDecimal(amount) ? (amount as Decimal).toNumber() : (amount as number);

    return (
        <>
            {value.toLocaleString(getUserLocale(), {
                style: 'currency',
                currency: currency.code,
            })}
        </>
    );
}
