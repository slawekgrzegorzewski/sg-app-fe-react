import * as React from "react";
import getUserLocale from "get-user-locale";
import {MonetaryAmount} from "../../types";

export function CurrencyAmountDisplay({amount, currency}: MonetaryAmount) {

    return (<>{amount.toLocaleString(getUserLocale(), {
            style: "currency",
            currency: currency
        })}</>
    );
}