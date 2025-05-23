import {useQuery} from "@apollo/client";
import {Loan, SimulateExistingLoan, SimulateExistingLoanQuery,} from "../types";
import * as React from "react";
import {remainingCapital} from "./utils/loan-form";
import Decimal from "decimal.js";
import {InstallmentsTable, mapInstallmentsFromSimulation} from "./InstallmentsTable";

export type LoanSimulationProps = {
    loan: Loan
    monthlyBudget: Decimal
    yearlyBudget: Decimal
}

LoanSimulation.defaultProps = {
    onClick: () => {
    }
}

export function LoanSimulation({loan, monthlyBudget, yearlyBudget}: LoanSimulationProps) {

    const {loading, error, data} = useQuery<SimulateExistingLoanQuery>(SimulateExistingLoan, {
        variables: {
            loanId: loan.publicId,
            monthlyBudget: {amount: monthlyBudget, currency: loan.paidAmount.currency.code},
            yearlyOverpayment: {amount: yearlyBudget, currency: loan.paidAmount.currency.code}
        }
    });

    if (loading) {
        return <>Loading...</>
    } else if (error) {
        return <>Error...</>
    } else if (data) {
        return <InstallmentsTable
            installments={mapInstallmentsFromSimulation(remainingCapital(loan).amount, data.simulateExistingLoan)}
            currency={loan.paidAmount.currency}/>;
    } else {
        return (<></>);
    }
}