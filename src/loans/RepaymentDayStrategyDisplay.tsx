import {NthDayOfMonthRepaymentDayStrategyConfig, RepaymentDayStrategyConfig} from "../types";
import * as React from "react";
import {MouseEventHandler} from "react";
import {OrdinalDisplay} from "../application/components/OrdinalDisplay";
import Box from "@mui/material/Box";

export type RepaymentDayStrategyDisplayProps = {
    repaymentDayStrategyConfig: RepaymentDayStrategyConfig
    onClick?: MouseEventHandler<any>
}

const noOp: MouseEventHandler<any> = () => {
};


function isNthDayOfMonth(
    config: RepaymentDayStrategyConfig
): config is NthDayOfMonthRepaymentDayStrategyConfig {
    return (config as NthDayOfMonthRepaymentDayStrategyConfig).__typename
        === 'NthDayOfMonthRepaymentDayStrategyConfig';
}

export function RepaymentDayStrategyDisplay({
                                                repaymentDayStrategyConfig,
                                                onClick = noOp
                                            }: RepaymentDayStrategyDisplayProps) {
    function convertToElement() {
        if (isNthDayOfMonth(repaymentDayStrategyConfig)) {
            return <><OrdinalDisplay value={repaymentDayStrategyConfig.dayOfMonth}/> dzień miesiąca</>;
        }
        return <></>;
    }

    return (
        <Box onClick={onClick} sx={{flex: 1, minWidth: 0, fontSize: '0.8125rem', color: 'text.secondary'}}>
            {convertToElement()}
        </Box>
    );
}
