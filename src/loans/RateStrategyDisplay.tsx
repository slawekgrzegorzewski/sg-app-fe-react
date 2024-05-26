import {ConstantForNFirstInstallmentRateStrategyConfig, RateStrategyConfig} from "../types";
import * as React from "react";
import {MouseEventHandler} from "react";
import {PercentDisplay} from "../application/components/PercentDisplay";
import Box from "@mui/material/Box";

export type RateStrategyDisplayProps = {
    rateStrategyConfig: RateStrategyConfig
    onClick: MouseEventHandler<any>
}

RateStrategyDisplay.defaultProps = {
    onClick: () => {
    }
}

export function RateStrategyDisplay({rateStrategyConfig, onClick}: RateStrategyDisplayProps) {


    function convertToElement() {
        // @ts-ignore
        switch (rateStrategyConfig['__typename']) {
            case "ConstantForNFirstInstallmentRateStrategyConfig":
                const constantForN = rateStrategyConfig as ConstantForNFirstInstallmentRateStrategyConfig;
                return <>
                    Oprocentowanie stałe <b><PercentDisplay rate={constantForN.constantRate}/></b>,
                    po <b>{constantForN.becomesVariableRateAfterNInstallments} miesiącach</b>
                    zmienne z marżą <b><PercentDisplay rate={constantForN.variableRateMargin}/></b>
                </>;
        }
    }

    return (
        <Box onClick={onClick}>
            {convertToElement()}
        </Box>
    );
}