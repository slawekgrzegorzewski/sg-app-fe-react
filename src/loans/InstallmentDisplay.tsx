import {ConstantForNFirstInstallmentRateStrategyConfig, Installment, RateStrategyConfig} from "../types";
import * as React from "react";
import {MouseEventHandler} from "react";
import {PercentDisplay} from "../application/components/PercentDisplay";
import Box from "@mui/material/Box";
import {CurrencyAmountDisplay} from "../application/components/CurrencyAmountDisplay";

export type InstallmentDisplayProps = {
    installment: Installment
    onClick: MouseEventHandler<any>
}

InstallmentDisplay.defaultProps = {
    onClick: () => {
    }
}

export function InstallmentDisplay({installment, onClick}: InstallmentDisplayProps) {


    function repaidInstallment() {
        if (installment.repaidInterest.amount > 0) {
            return (<><b><CurrencyAmountDisplay {...installment.repaidInterest}/></b> odsetek, </>);
        }
        return (<></>);
    }

    function repaidAmount() {
        if (installment.repaidAmount.amount > 0) {
            return (<><b><CurrencyAmountDisplay {...installment.repaidAmount}/></b> kapitału, </>);
        }
        return (<></>);
    }

    function overpayment() {
        if (installment.overpayment.amount > 0) {
            return (<>nadpłacono <b><CurrencyAmountDisplay {...installment.overpayment}/></b>, </>);
        }
        return (<></>);
    }

    return (
        <Box onClick={onClick}>
            Spłacona dnia <b>{installment.paidAt}</b>,
            {repaidInstallment()}
            {repaidAmount()}
            {overpayment()}
        </Box>
    );
}