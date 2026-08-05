import {ConstantForNFirstInstallmentRateStrategyConfig, RateStrategyConfig} from "../types";
import * as React from "react";
import {MouseEventHandler} from "react";
import {PercentDisplay} from "../application/components/PercentDisplay";
import Box from "@mui/material/Box";

export type RateStrategyDisplayProps = {
    rateStrategyConfig: RateStrategyConfig
    onClick?: MouseEventHandler<any>
}

const noOp: MouseEventHandler<any> = () => {
};

function isConstantForNFirstInstallment(
    config: RateStrategyConfig
): config is ConstantForNFirstInstallmentRateStrategyConfig {
    return (config as ConstantForNFirstInstallmentRateStrategyConfig).__typename
        === 'ConstantForNFirstInstallmentRateStrategyConfig';
}

export function RateStrategyDisplay({rateStrategyConfig, onClick = noOp}: RateStrategyDisplayProps) {

    function convertToElement() {
        if (isConstantForNFirstInstallment(rateStrategyConfig)) {
            return <>
                Oprocentowanie stałe <b><PercentDisplay rate={rateStrategyConfig.constantRate}/></b>,
                po <b>{rateStrategyConfig.becomesVariableRateAfterNInstallments} miesiącach</b>
                zmienne z marżą <b><PercentDisplay rate={rateStrategyConfig.variableRateMargin}/></b>
            </>;
        }
        return <></>;
    }

    return (
        <Box onClick={onClick}>
            {convertToElement()}
        </Box>
    );
}