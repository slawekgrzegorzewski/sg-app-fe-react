import {ErrorDisplay} from '../application/components/QueryState';
import {useResetMutationResults} from '../utils/use-reset-mutation-results';
import {useMutation, useQuery} from '@apollo/client/react';
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
} from '../types';
import {Button, Stack, Typography, useTheme} from '@mui/material';
import * as React from 'react';
import {FormDialogButton} from '../utils/buttons/FormDialogButton';
import {DeleteButton} from '../utils/buttons/DeleteButton';
import {Delete} from '@mui/icons-material';
import {useApplicationNavigation} from '../utils/use-application-navigation';
import {
    ConstantForNFirstInstallmentRateStrategyConfigDTO,
    CREATE_LOAN_FORM_PROPS,
    CREATE_RATE_STRATEGY_CONFIG,
    CREATE_REPAYMENT_DAY_STRATEGY_CONFIG,
    LoanDTO,
    NthDayOfMonthRepaymentDayStrategyConfigDTO,
} from './utils/loan-form';
import {LoanDetails} from './LoanDetails';
import {RateStrategyDisplay} from './RateStrategyDisplay';
import {RepaymentDayStrategyDisplay} from './RepaymentDayStrategyDisplay';
import Decimal from 'decimal.js';
import {compactListRow} from '../utils/theme/utils';

export function Loans() {
    const theme = useTheme();
    const {setPageParams} = useApplicationNavigation();
    const {loading, error, data, refetch} = useQuery<GetLoansQuery>(GetLoans);
    const [createLoanMutation, createLoanMutationResult] = useMutation<CreateLoanMutation>(CreateLoan);
    const [deleteLoanMutation, deleteLoanMutationResult] = useMutation<DeleteLoanMutation>(DeleteLoan);
    const [
        createConstantForNFirstInstallmentRateStrategyConfigMutation,
        createConstantForNFirstInstallmentRateStrategyConfigResult,
    ] = useMutation<CreateConstantForNFirstInstallmentRateStrategyConfigMutation>(
        CreateConstantForNFirstInstallmentRateStrategyConfig
    );
    const [deleteRateStrategyConfigMutation, deleteRateStrategyConfigResult] =
        useMutation<DeleteRateStrategyConfigMutation>(DeleteRateStrategyConfig);
    const [createNthDayOfMonthRepaymentDayStrategyConfigMutation, createNthDayOfMonthRepaymentDayStrategyConfigResult] =
        useMutation<CreateNthDayOfMonthRepaymentDayStrategyConfigMutation>(
            CreateNthDayOfMonthRepaymentDayStrategyConfig
        );
    const [deleteRepaymentDayStrategyConfigMutation, deleteRepaymentDayStrategyConfigResult] =
        useMutation<DeleteRepaymentDayStrategyConfigMutation>(DeleteRepaymentDayStrategyConfig);

    const createLoan = async (loanDTO: LoanDTO): Promise<any> => {
        await createLoanMutation({
            variables: {
                name: loanDTO.name,
                paymentDate: loanDTO.paymentDate.format('YYYY-MM-DD'),
                numberOfInstallments: loanDTO.numberOfInstallments,
                paidAmount: loanDTO.paidAmount,
                paidCurrency: loanDTO.paidCurrency,
                rateStrategyConfigId: loanDTO.rateStrategyConfigId,
                repaymentDayStrategyConfigId: loanDTO.repaymentDayStrategyConfigId,
            },
        });
        return refetch();
    };

    const deleteLoan = async (loanId: string): Promise<any> => {
        await deleteLoanMutation({variables: {loanId: loanId}});
        return refetch();
    };

    const createConstantForNFirstInstallmentRateStrategyConfig = async (
        creationParams: ConstantForNFirstInstallmentRateStrategyConfigDTO
    ): Promise<any> => {
        await createConstantForNFirstInstallmentRateStrategyConfigMutation({
            variables: {
                name: creationParams.name,
                constantRate: new Decimal(creationParams.constantRate).div(100),
                becomesVariableRateAfterNInstallments: creationParams.becomesVariableRateAfterNInstallments,
                variableRateMargin: new Decimal(creationParams.variableRateMargin).div(100),
            },
        });
        return refetch();
    };

    const deleteRateStrategyConfig = async (publicId: string): Promise<any> => {
        await deleteRateStrategyConfigMutation({variables: {publicId: publicId}});
        return refetch();
    };

    const createNthDayOfMonthRepaymentDayStrategyConfig = async (
        creationParams: NthDayOfMonthRepaymentDayStrategyConfigDTO
    ): Promise<any> => {
        await createNthDayOfMonthRepaymentDayStrategyConfigMutation({
            variables: creationParams,
        });
        return refetch();
    };

    const deleteRepaymentDayStrategyConfig = async (publicId: string): Promise<any> => {
        await deleteRepaymentDayStrategyConfigMutation({variables: {publicId: publicId}});
        return refetch();
    };

    useResetMutationResults(
        createLoanMutationResult,
        deleteLoanMutationResult,
        createConstantForNFirstInstallmentRateStrategyConfigResult,
        deleteRateStrategyConfigResult,
        createNthDayOfMonthRepaymentDayStrategyConfigResult,
        deleteRepaymentDayStrategyConfigResult
    );

    if (loading) {
        return <></>;
    } else if (error) {
        return <ErrorDisplay error={error} />;
    } else if (data) {
        return (
            <Stack
                direction={{xs: 'column', lg: 'row'}}
                spacing={{xs: 3, lg: 5}}
                justifyContent="center"
                alignItems={{xs: 'stretch', lg: 'flex-start'}}
                sx={{px: {xs: 1, sm: 2}, py: 2}}
            >
                <Stack component="section" direction="column" sx={{width: '100%', maxWidth: 800}}>
                    <Typography variant="h4" textAlign="center" sx={{mb: 1.5, color: 'secondary.main'}}>
                        Pożyczki
                    </Typography>
                    <Stack direction="row" justifyContent="center" sx={{mb: 1}}>
                        <FormDialogButton
                            title="Dane pożyczki"
                            onConfirm={createLoan}
                            onCancel={() => {
                                return Promise.resolve();
                            }}
                            buttonContent={
                                <Button size={'small'} variant={'text'} color="secondary">
                                    stwórz pożyczkę
                                </Button>
                            }
                            formProps={CREATE_LOAN_FORM_PROPS(
                                ['PLN'],
                                data.loans.rateStrategyConfigs,
                                data.loans.repaymentDayStrategyConfigs
                            )}
                        />
                    </Stack>

                    {
                        <Stack direction={'column'}>
                            {data.loans.loans.map(loan => (
                                <Stack
                                    direction="row"
                                    alignItems="center"
                                    key={loan.publicId}
                                    sx={compactListRow(theme)}
                                >
                                    <LoanDetails
                                        loan={loan}
                                        short={true}
                                        onClick={() => setPageParams([loan.publicId])}
                                    />
                                    <DeleteButton
                                        object={loan.publicId}
                                        confirmationMessage={'Na pewno usunąć?'}
                                        buttonContent={<Delete />}
                                        onDelete={deleteLoan}
                                        onCancel={() => {
                                            return Promise.resolve();
                                        }}
                                    />
                                </Stack>
                            ))}
                        </Stack>
                    }
                </Stack>
                <Stack direction="column" spacing={3} sx={{width: '100%', maxWidth: 560}}>
                    <Stack component="section" direction="column">
                        <Typography variant="h4" textAlign="center" sx={{mb: 1.5, color: 'secondary.main'}}>
                            Sposoby naliczania odsetek
                        </Typography>
                        <Stack direction="row" justifyContent="center" sx={{mb: 1}}>
                            <FormDialogButton
                                title="Tworzenie"
                                onConfirm={createConstantForNFirstInstallmentRateStrategyConfig}
                                onCancel={() => {
                                    return Promise.resolve();
                                }}
                                buttonContent={
                                    <Button size={'small'} variant={'text'} color="secondary">
                                        Stwórz nowy
                                    </Button>
                                }
                                formProps={CREATE_RATE_STRATEGY_CONFIG()}
                            />
                        </Stack>

                        <Stack direction={'column'}>
                            {data.loans.rateStrategyConfigs.map(config => (
                                <Stack
                                    direction="row"
                                    alignItems="center"
                                    justifyContent="space-between"
                                    key={config.publicId}
                                    sx={compactListRow(theme)}
                                >
                                    <RateStrategyDisplay rateStrategyConfig={config} />
                                    <DeleteButton
                                        object={config.publicId}
                                        confirmationMessage={'Na pewno usunąć?'}
                                        buttonContent={<Delete />}
                                        onDelete={deleteRateStrategyConfig}
                                        onCancel={() => {
                                            return Promise.resolve();
                                        }}
                                    />
                                </Stack>
                            ))}
                        </Stack>
                    </Stack>
                    <Stack component="section" direction="column">
                        <Typography variant="h4" textAlign="center" sx={{mb: 1.5, color: 'secondary.main'}}>
                            Sposoby obliczania dnia spłaty
                        </Typography>
                        <Stack direction="row" justifyContent="center" sx={{mb: 1}}>
                            <FormDialogButton
                                title="Tworzenie"
                                onConfirm={createNthDayOfMonthRepaymentDayStrategyConfig}
                                onCancel={() => {
                                    return Promise.resolve();
                                }}
                                buttonContent={
                                    <Button size="small" variant="text" color="secondary">
                                        Stwórz nowy
                                    </Button>
                                }
                                formProps={CREATE_REPAYMENT_DAY_STRATEGY_CONFIG()}
                            />
                        </Stack>
                        <Stack direction={'column'}>
                            {data.loans.repaymentDayStrategyConfigs.map(config => (
                                <Stack
                                    direction="row"
                                    alignItems="center"
                                    justifyContent="space-between"
                                    key={config.publicId}
                                    sx={compactListRow(theme)}
                                >
                                    <RepaymentDayStrategyDisplay repaymentDayStrategyConfig={config} />
                                    <DeleteButton
                                        object={config.publicId}
                                        confirmationMessage={'Na pewno usunąć?'}
                                        buttonContent={<Delete />}
                                        onDelete={deleteRepaymentDayStrategyConfig}
                                        onCancel={() => {
                                            return Promise.resolve();
                                        }}
                                    />
                                </Stack>
                            ))}
                        </Stack>
                    </Stack>
                </Stack>
            </Stack>
        );
    } else {
        return <></>;
    }
}
