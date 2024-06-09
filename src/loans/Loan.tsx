import {useMutation, useQuery} from "@apollo/client";
import {
    CreateInstallment,
    CreateInstallmentMutation,
    DeleteLoan,
    DeleteLoanMutation,
    SingleLoan,
    SingleLoanQuery,
    UpdateLoan,
    UpdateLoanMutation,
} from "../types";
import {Box, Button, Stack} from "@mui/material";
import * as React from "react";
import {useState} from "react";
import {FormDialogButton} from "../utils/buttons/FormDialogButton";
import {DeleteButton} from "../utils/buttons/DeleteButton";
import {ArrowLeft, Delete, Edit} from "@mui/icons-material";
import {useApplicationNavigation} from "../utils/use-application-navigation";
import {CREATE_INSTALLMENT_FORM_PROPS, EDIT_LOAN_FORM_PROPS} from "./utils/loan-form";
import {useParams} from "react-router-dom";
import {LoanDetails} from "./LoanDetails";
import Decimal from "decimal.js";
import {InstallmentsTable, mapInstallments} from "./InstallmentsTable";
import * as Yup from "yup";
import {EditorField} from "../utils/forms/Form";
import {LoanSimulation} from "./LoanSimulation";
import IconButton from "@mui/material/IconButton";

export function Loan() {
    const {changePageParams} = useApplicationNavigation();
    const {param1} = useParams();
    const {loading, error, data, refetch} = useQuery<SingleLoanQuery>(SingleLoan, {
        variables: {
            loanId: param1
        }
    });
    const [updateLoanMutation, updateLoanMutationResult] = useMutation<UpdateLoanMutation>(UpdateLoan);
    const [deleteLoanMutation, deleteLoanMutationResult] = useMutation<DeleteLoanMutation>(DeleteLoan);
    const [createInstallmentMutation, createInstallmentMutationResult] = useMutation<CreateInstallmentMutation>(CreateInstallment);

    const [simulationParams, setSimulationParams] = useState<{
        monthlyBudget: Decimal;
        yearlyBudget: Decimal;
    } | null>(null)

    const updateLoan = async (loanId: string, name: string): Promise<any> => {
        await updateLoanMutation({variables: {loanId: loanId, name: name}});
        return refetch();
    }
    const deleteLoan = async (loanId: string): Promise<any> => {
        await deleteLoanMutation({variables: {loanId: loanId}});
        changePageParams([])
        return Promise.resolve("");
    }
    const createInstallment = async (loanId: string, loanCurrency: string, paidAt: string, repaidInterest: Decimal, repaidAmount: Decimal, overpayment: Decimal): Promise<any> => {
        await createInstallmentMutation({
            variables: {
                loanId: loanId,
                paidAt: paidAt,
                repaidInterest: repaidInterest,
                repaidAmount: repaidAmount,
                overpayment: overpayment,
                currency: loanCurrency,
            }
        });
        return refetch();
    };

    updateLoanMutationResult.called && updateLoanMutationResult.reset();
    deleteLoanMutationResult.called && deleteLoanMutationResult.reset();
    createInstallmentMutationResult.called && createInstallmentMutationResult.reset();

    if (loading) {
        return <>Loading...</>
    } else if (error) {
        return <>Error...</>
    } else if (data) {
        const loan = data!.singleLoan!;
        console.log(JSON.stringify(loan));
        return (
            <Box component="section" sx={{width: 1000, m: 'auto'}}>
                {
                    (<Stack direction={"row"}>
                        <Button variant={"text"} onClick={(e) => changePageParams([])}>
                            <ArrowLeft/>
                        </Button>
                        <Stack direction={"column"} key={loan.publicId}>
                            <LoanDetails loan={loan} short={false}/>
                            <Stack direction={'row'}>
                                <FormDialogButton
                                    dialogTitle='Dane raty'
                                    onSave={value => {
                                        return createInstallment(loan.publicId, loan.paidAmount.currency, value.paidAt, value.repaidInterest, value.repaidAmount, value.overpayment);
                                    }}
                                    onCancel={() => {
                                        return Promise.resolve();
                                    }}
                                    buttonContent={<Button size={'small'} variant={'text'}>zarejestruj ratę</Button>}
                                    formProps={CREATE_INSTALLMENT_FORM_PROPS()}
                                />
                                <FormDialogButton
                                    dialogTitle='Parametry symulacji'
                                    onSave={value => {
                                        setSimulationParams({
                                            monthlyBudget: value.monthlyBudget,
                                            yearlyBudget: value.yearlyBudget
                                        });
                                        return Promise.resolve();
                                    }}
                                    onCancel={() => {
                                        return Promise.resolve();
                                    }}
                                    buttonContent={<>Symuluj spłatę</>}
                                    formProps={{
                                        validationSchema: Yup.object({
                                            monthlyBudget: Yup.number()
                                                .min(0)
                                                .required('Wymagana'),
                                            yearlyBudget: Yup.number()
                                                .min(0)
                                                .required('Wymagana')
                                        }),
                                        initialValues: {
                                            monthlyBudget: new Decimal(0),
                                            yearlyBudget: new Decimal(0)
                                        },
                                        fields:
                                            [
                                                {
                                                    label: 'Miesięczny budżet',
                                                    type: 'NUMBER',
                                                    key: 'monthlyBudget'
                                                } as EditorField,
                                                {
                                                    label: 'Roczny budżet',
                                                    type: 'NUMBER',
                                                    key: 'yearlyBudget'
                                                } as EditorField,
                                            ]
                                    }}
                                />
                            </Stack>
                            <InstallmentsTable installments={mapInstallments(loan.paidAmount.amount, loan.installments)}
                                               currency={loan.paidAmount.currency}/>
                            {simulationParams && <LoanSimulation loan={loan} {...simulationParams}/>}
                        </Stack>
                        <FormDialogButton
                            dialogTitle='Dane pożyczki'
                            onSave={value => {
                                return updateLoan(loan.publicId, value.name);
                            }}
                            onCancel={() => {
                                return Promise.resolve();
                            }}
                            buttonContent={
                                <IconButton size={'small'}>
                                    <Edit/>
                                </IconButton>
                            }
                            formProps={EDIT_LOAN_FORM_PROPS(loan.name)}
                        />
                        <DeleteButton
                            object={loan.publicId}
                            confirmationMessage={'Na pewno usunąć?'}
                            buttonContent={<Delete/>}
                            onDelete={deleteLoan}
                            onCancel={() => {
                                return Promise.resolve();
                            }}/>
                    </Stack>)
                }</Box>
        );
    } else {
        return <></>;
    }
}