import {NthDayOfMonthRepaymentDayStrategyConfig, RepaymentDayStrategyConfig} from "../types";
import * as React from "react";
import {MouseEventHandler} from "react";
import {OrdinalDisplay} from "../application/components/OrdinalDisplay";
import Box from "@mui/material/Box";

export type RepaymentDayStrategyDisplayProps = {
    repaymentDayStrategyConfig: RepaymentDayStrategyConfig
    onClick: MouseEventHandler<any>
}

RepaymentDayStrategyDisplay.defaultProps = {
    onClick: () => {
    }
}

export function RepaymentDayStrategyDisplay({repaymentDayStrategyConfig, onClick}: RepaymentDayStrategyDisplayProps) {
    function convertToElement() {
        // @ts-ignore
        switch (repaymentDayStrategyConfig['__typename']) {
            case "NthDayOfMonthRepaymentDayStrategyConfig":
                const constantForN = repaymentDayStrategyConfig as NthDayOfMonthRepaymentDayStrategyConfig;
                return <><OrdinalDisplay value={constantForN.dayOfMonth}/> dzień miesiąca</>;
        }
    }

    return (
        <Box onClick={onClick}>
            {convertToElement()}
        </Box>
    );
}