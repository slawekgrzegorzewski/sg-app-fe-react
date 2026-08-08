import {Installment} from "../types";
import * as React from "react";
import {MouseEventHandler} from "react";
import Box from "@mui/material/Box";
import {CurrencyAmountDisplay} from "../application/components/CurrencyAmountDisplay";
import {StandOutText} from "../application/components/StandOutText";

export type InstallmentDisplayProps = {
    installment: Installment
    onClick?: MouseEventHandler<any>
}

const noOp: MouseEventHandler<any> = () => {
};

export function InstallmentDisplay({installment, onClick = noOp}: InstallmentDisplayProps) {


    function repaidInstallment() {
        if (installment.repaidInterest.amount > 0) {
            return (<><StandOutText><CurrencyAmountDisplay {...installment.repaidInterest}/></StandOutText> odsetek, </>);
        }
        return (<></>);
    }

    function repaidAmount() {
        if (installment.repaidAmount.amount > 0) {
            return (<><StandOutText><CurrencyAmountDisplay {...installment.repaidAmount}/></StandOutText> kapitału, </>);
        }
        return (<></>);
    }

    function overpayment() {
        if (installment.overpayment.amount > 0) {
            return (<>nadpłacono <StandOutText><CurrencyAmountDisplay {...installment.overpayment}/></StandOutText>, </>);
        }
        return (<></>);
    }

    return (
        <Box onClick={onClick}
             sx={{px: 1.5, py: 0.65, borderBottom: '1px solid', borderColor: 'divider', '&:hover': {bgcolor: 'action.hover'}}}>
            Spłacona dnia <StandOutText>{installment.paidAt}</StandOutText>,
            {repaidInstallment()}
            {repaidAmount()}
            {overpayment()}
        </Box>
    );
}
