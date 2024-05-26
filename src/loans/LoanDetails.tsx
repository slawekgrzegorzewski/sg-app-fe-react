import {Loan} from "../types";
import {Stack} from "@mui/material";
import * as React from "react";
import {MouseEventHandler} from "react";
import {remainingCapital} from "./utils/loan-form";
import {CurrencyAmountDisplay} from "../application/components/CurrencyAmountDisplay";
import {RateStrategyDisplay} from "./RateStrategyDisplay";
import {RepaymentDayStrategyDisplay} from "./RepaymentDayStrategyDisplay";

export type LoanDetailsProp = {
    loan: Loan
    short: boolean
    onClick: MouseEventHandler<any>
}

LoanDetails.defaultProps = {
    short: false,
    onClick: () => {
    }
}

export function LoanDetails({loan, short, onClick}: LoanDetailsProp) {
    if (short) {
        return (
            <Stack direction={"column"} key={loan.publicId} onClick={onClick}>
                <div>{loan.name}</div>
                <div><CurrencyAmountDisplay {...loan.paidAmount} /></div>
                <div><CurrencyAmountDisplay {...remainingCapital(loan)} /></div>
                <div>{loan.paymentDate}</div>
                <RateStrategyDisplay rateStrategyConfig={loan.rateStrategyConfig}/>
                <RepaymentDayStrategyDisplay repaymentDayStrategyConfig={loan.repaymentDayStrategyConfig}/>
            </Stack>);
    } else
        return (
            <Stack direction={"column"} key={loan.publicId}>
                <div>{loan.publicId}</div>
                <div>{loan.name}</div>
                <div><CurrencyAmountDisplay {...loan.paidAmount} /></div>
                <div><CurrencyAmountDisplay {...remainingCapital(loan)} /></div>
                <div>{loan.paymentDate}</div>
                <RateStrategyDisplay rateStrategyConfig={loan.rateStrategyConfig}/>
                <RepaymentDayStrategyDisplay repaymentDayStrategyConfig={loan.repaymentDayStrategyConfig}/>
            </Stack>
        );
}