import {useMutation, useQuery} from "@apollo/client";
import {
    CreateConstantForNFirstInstallmentRateStrategyConfig,
    CreateConstantForNFirstInstallmentRateStrategyConfigMutation,
    CreateLoan,
    CreateLoanMutation,
    CreateNthDayOfMonthRepaymentDayStrategyConfig,
    CreateNthDayOfMonthRepaymentDayStrategyConfigMutation,
    DeleteLoan,
    DeleteLoanMutation,
    DeleteRateStrategyConfig,
    DeleteRateStrategyConfigMutation,
    DeleteRepaymentDayStrategyConfig,
    DeleteRepaymentDayStrategyConfigMutation,
    GetLoans,
    GetLoansQuery,
} from "../types";
import {Box, Button, Card, CardContent, CardHeader, Stack} from "@mui/material";
import Grid from '@mui/material/Unstable_Grid2';
import * as React from "react";
import {FormDialogButton} from "../utils/buttons/FormDialogButton";
import {DeleteButton} from "../utils/buttons/DeleteButton";
import {Delete} from "@mui/icons-material";
import {useApplicationNavigation} from "../utils/use-application-navigation";
import {
    ConstantForNFirstInstallmentRateStrategyConfigDTO,
    CREATE_LOAN_FORM_PROPS,
    CREATE_RATE_STRATEGY_CONFIG,
    CREATE_REPAYMENT_DAY_STRATEGY_CONFIG,
    LoanDTO,
    NthDayOfMonthRepaymentDayStrategyConfigDTO
} from "./utils/loan-form";
import {LoanDetails} from "./LoanDetails";
import {RateStrategyDisplay} from "./RateStrategyDisplay";
import {RepaymentDayStrategyDisplay} from "./RepaymentDayStrategyDisplay";
import Decimal from "decimal.js";

export function Loans() {

    const {changePageParams} = useApplicationNavigation();
    const {loading, error, data, refetch} = useQuery<GetLoansQuery>(GetLoans);
    const [createLoanMutation, createLoanMutationResult] = useMutation<CreateLoanMutation>(CreateLoan);
    const [deleteLoanMutation, deleteLoanMutationResult] = useMutation<DeleteLoanMutation>(DeleteLoan);
    const [createConstantForNFirstInstallmentRateStrategyConfigMutation, createConstantForNFirstInstallmentRateStrategyConfigResult] = useMutation<CreateConstantForNFirstInstallmentRateStrategyConfigMutation>(CreateConstantForNFirstInstallmentRateStrategyConfig);
    const [deleteRateStrategyConfigMutation, deleteRateStrategyConfigResult] = useMutation<DeleteRateStrategyConfigMutation>(DeleteRateStrategyConfig);
    const [createNthDayOfMonthRepaymentDayStrategyConfigMutation, createNthDayOfMonthRepaymentDayStrategyConfigResult] = useMutation<CreateNthDayOfMonthRepaymentDayStrategyConfigMutation>(CreateNthDayOfMonthRepaymentDayStrategyConfig);
    const [deleteRepaymentDayStrategyConfigMutation, deleteRepaymentDayStrategyConfigResult] = useMutation<DeleteRepaymentDayStrategyConfigMutation>(DeleteRepaymentDayStrategyConfig);

    const createLoan = async (loanDTO: LoanDTO): Promise<any> => {
        await createLoanMutation({variables: {...loanDTO}});
        return refetch();
    };
    const deleteLoan = async (loanId: string): Promise<any> => {
        await deleteLoanMutation({variables: {loanId: loanId}});
        return refetch();
    }

    const createConstantForNFirstInstallmentRateStrategyConfig = async (creationParams: ConstantForNFirstInstallmentRateStrategyConfigDTO): Promise<any> => {
        await createConstantForNFirstInstallmentRateStrategyConfigMutation({
            variables: {
                name: creationParams.name,
                constantRate: new Decimal(creationParams.constantRate).div(100),
                becomesVariableRateAfterNInstallments: creationParams.becomesVariableRateAfterNInstallments,
                variableRateMargin: new Decimal(creationParams.variableRateMargin).div(100),
            }
        });
        return refetch();
    }

    const deleteRateStrategyConfig = async (publicId: string): Promise<any> => {
        await deleteRateStrategyConfigMutation({variables: {publicId: publicId}});
        return refetch();
    }

    const createNthDayOfMonthRepaymentDayStrategyConfig = async (creationParams: NthDayOfMonthRepaymentDayStrategyConfigDTO): Promise<any> => {
        await createNthDayOfMonthRepaymentDayStrategyConfigMutation({
            variables: creationParams
        });
        return refetch();
    }

    const deleteRepaymentDayStrategyConfig = async (publicId: string): Promise<any> => {
        await deleteRepaymentDayStrategyConfigMutation({variables: {publicId: publicId}});
        return refetch();
    }

    createLoanMutationResult.called && createLoanMutationResult.reset();
    deleteLoanMutationResult.called && deleteLoanMutationResult.reset();
    createConstantForNFirstInstallmentRateStrategyConfigResult.called && createConstantForNFirstInstallmentRateStrategyConfigResult.reset();
    deleteRateStrategyConfigResult.called && deleteRateStrategyConfigResult.reset();
    createNthDayOfMonthRepaymentDayStrategyConfigResult.called && createNthDayOfMonthRepaymentDayStrategyConfigResult.reset();
    deleteRepaymentDayStrategyConfigResult.called && deleteRepaymentDayStrategyConfigResult.reset();

    if (loading) {
        return <>Loading...</>
    } else if (error) {
        return <>Error...</>
    } else if (data) {
        return (
            <Grid container spacing={2}>
                <Grid xs={4}>
                    coś tu
                </Grid>
                <Grid xs={4}>
                    <Box component="section" sx={{width: 1000, m: 'auto'}}>
                        <Stack direction="row">
                            <FormDialogButton
                                title='Dane pożyczki'
                                onSave={createLoan}
                                onCancel={() => {
                                    return Promise.resolve();
                                }}
                                buttonContent={<Button size={'small'} variant={'text'}>stwórz pożyczkę</Button>}
                                formProps={CREATE_LOAN_FORM_PROPS(['PLN'], data.loans.rateStrategyConfigs, data.loans.repaymentDayStrategyConfigs)}
                            />
                        </Stack>

                        {
                            <Stack direction={"column"}>
                                {(data.loans.loans
                                        .map(loan =>
                                            (<Stack direction={"row"} key={loan.publicId}>
                                                <LoanDetails
                                                    loan={loan}
                                                    short={true}
                                                    onClick={event => changePageParams([loan.publicId])}/>
                                                <DeleteButton
                                                    object={loan.publicId}
                                                    confirmationMessage={'Na pewno usunąć?'}
                                                    buttonContent={<Delete/>}
                                                    onDelete={deleteLoan}
                                                    onCancel={() => {
                                                        return Promise.resolve();
                                                    }}/>
                                            </Stack>))
                                )}
                            </Stack>
                        }</Box>
                </Grid>
                <Grid xs={4}>
                    <Card variant="outlined">
                        <CardHeader title={'Sposoby naliczania odsetek'}/>
                        <CardContent>
                            <FormDialogButton
                                title='Tworzenie'
                                onSave={createConstantForNFirstInstallmentRateStrategyConfig}
                                onCancel={() => {
                                    return Promise.resolve();
                                }}
                                buttonContent={<Button size={'small'} variant={'text'}>Stwórz nowy</Button>}
                                formProps={CREATE_RATE_STRATEGY_CONFIG()}
                            />

                            <Stack direction={"column"} spacing={{xs: 1}}>
                                {(data.loans.rateStrategyConfigs
                                        .map(config =>
                                            (
                                                <Stack direction={"row"} key={config.publicId}>
                                                    <RateStrategyDisplay rateStrategyConfig={config}/>
                                                    <DeleteButton
                                                        object={config.publicId}
                                                        confirmationMessage={'Na pewno usunąć?'}
                                                        buttonContent={<Delete/>}
                                                        onDelete={deleteRateStrategyConfig}
                                                        onCancel={() => {
                                                            return Promise.resolve();
                                                        }}/>
                                                </Stack>
                                            ))
                                )}
                            </Stack>
                        </CardContent>
                    </Card>
                    <Card variant="outlined">
                        <CardHeader title={'Sposoby obliczania dnia spłaty'}/>
                        <CardContent>
                            <FormDialogButton
                                title='Tworzenie'
                                onSave={createNthDayOfMonthRepaymentDayStrategyConfig}
                                onCancel={() => {
                                    return Promise.resolve();
                                }}
                                buttonContent={<>Stwórz nowy</>}
                                formProps={CREATE_REPAYMENT_DAY_STRATEGY_CONFIG()}
                            />
                            <Stack direction={"column"} spacing={{xs: 1}}>
                                {(data.loans.repaymentDayStrategyConfigs
                                        .map(config =>
                                            (
                                                <Stack direction={"row"} key={config.publicId}>
                                                    <RepaymentDayStrategyDisplay
                                                        repaymentDayStrategyConfig={config}/>
                                                    <DeleteButton
                                                        object={config.publicId}
                                                        confirmationMessage={'Na pewno usunąć?'}
                                                        buttonContent={<Delete/>}
                                                        onDelete={deleteRepaymentDayStrategyConfig}
                                                        onCancel={() => {
                                                            return Promise.resolve();
                                                        }}/>
                                                </Stack>
                                            ))
                                )}
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        );
    } else {
        return <></>;
    }
}