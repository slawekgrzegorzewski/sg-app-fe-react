import {ErrorDisplay, LoadingIndicator} from '../application/components/QueryState';
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
import {Button, ButtonBase, Chip, IconButton, Paper, Stack, Tooltip, Typography, useTheme} from '@mui/material';
import * as React from 'react';
import {FormDialogButton} from '../utils/buttons/FormDialogButton';
import {DeleteButton} from '../utils/buttons/DeleteButton';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
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
import {StandOutText} from '../application/components/StandOutText';

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
        await deleteLoanMutation({variables: {loanId}});
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
        await deleteRateStrategyConfigMutation({variables: {publicId}});
        return refetch();
    };

    const createNthDayOfMonthRepaymentDayStrategyConfig = async (
        creationParams: NthDayOfMonthRepaymentDayStrategyConfigDTO
    ): Promise<any> => {
        await createNthDayOfMonthRepaymentDayStrategyConfigMutation({variables: creationParams});
        return refetch();
    };

    const deleteRepaymentDayStrategyConfig = async (publicId: string): Promise<any> => {
        await deleteRepaymentDayStrategyConfigMutation({variables: {publicId}});
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
        return <LoadingIndicator label="Ładowanie pożyczek..." />;
    }

    if (error) {
        return <ErrorDisplay error={error} onRetry={() => void refetch()} />;
    }

    if (!data) {
        return <></>;
    }

    return (
        <Stack alignItems="center" sx={{width: '100%', px: {xs: 1, sm: 2}, py: 2}}>
            <Stack spacing={3} sx={{width: '100%', maxWidth: 960}}>
                <Typography variant="h3">
                    <StandOutText standOutBy="both">Pożyczki</StandOutText>
                </Typography>

                <Paper component="section" variant="outlined" sx={{p: {xs: 1.5, sm: 2}}}>
                    <Stack spacing={1.5}>
                        <Stack
                            direction={{xs: 'column', sm: 'row'}}
                            alignItems={{xs: 'stretch', sm: 'center'}}
                            justifyContent="space-between"
                            gap={1.5}
                        >
                            <Stack direction="row" alignItems="center" spacing={1}>
                                <Typography variant="h4">Twoje pożyczki</Typography>
                                <Chip size="small" variant="outlined" label={`Liczba: ${data.loans.loans.length}`} />
                            </Stack>
                            <FormDialogButton
                                title="Dodaj pożyczkę"
                                onConfirm={createLoan}
                                onCancel={() => Promise.resolve()}
                                buttonContent={
                                    <Button variant="contained" color="secondary" startIcon={<AddRoundedIcon />}>
                                        Dodaj pożyczkę
                                    </Button>
                                }
                                formProps={CREATE_LOAN_FORM_PROPS(
                                    ['PLN'],
                                    data.loans.rateStrategyConfigs,
                                    data.loans.repaymentDayStrategyConfigs
                                )}
                            />
                        </Stack>

                        {data.loans.loans.length === 0 ? (
                            <Typography color="text.secondary" textAlign="center" sx={{py: 3}}>
                                Nie masz jeszcze żadnej pożyczki.
                            </Typography>
                        ) : (
                            <Stack>
                                {data.loans.loans.map(loan => (
                                    <Stack
                                        direction="row"
                                        alignItems="center"
                                        key={loan.publicId}
                                        sx={compactListRow(theme)}
                                    >
                                        <ButtonBase
                                            onClick={() => setPageParams([loan.publicId])}
                                            sx={{flex: 1, minWidth: 0, borderRadius: 1, textAlign: 'left'}}
                                        >
                                            <LoanDetails loan={loan} short />
                                        </ButtonBase>
                                        <DeleteButton
                                            object={loan.publicId}
                                            title="Usunąć pożyczkę?"
                                            confirmationMessage={
                                                <>
                                                    Czy na pewno chcesz usunąć pożyczkę <strong>{loan.name}</strong>?
                                                    Tej operacji nie można cofnąć.
                                                </>
                                            }
                                            buttonContent={
                                                <Tooltip title="Usuń pożyczkę">
                                                    <IconButton aria-label={`Usuń pożyczkę ${loan.name}`} size="small">
                                                        <DeleteOutlineRoundedIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            }
                                            onDelete={deleteLoan}
                                            onCancel={() => Promise.resolve()}
                                        />
                                    </Stack>
                                ))}
                            </Stack>
                        )}
                    </Stack>
                </Paper>

                <Stack direction={{xs: 'column', md: 'row'}} spacing={2} alignItems="flex-start">
                    <Paper component="section" variant="outlined" sx={{width: '100%', p: {xs: 1.5, sm: 2}}}>
                        <Stack spacing={1.5}>
                            <Stack direction="row" alignItems="center" spacing={1}>
                                <Typography variant="h4">Oprocentowanie</Typography>
                                <Chip
                                    size="small"
                                    variant="outlined"
                                    label={`Liczba: ${data.loans.rateStrategyConfigs.length}`}
                                />
                            </Stack>
                            <FormDialogButton
                                title="Dodaj sposób naliczania odsetek"
                                onConfirm={createConstantForNFirstInstallmentRateStrategyConfig}
                                onCancel={() => Promise.resolve()}
                                buttonContent={
                                    <Button
                                        variant="outlined"
                                        color="secondary"
                                        startIcon={<AddRoundedIcon />}
                                        fullWidth
                                    >
                                        Dodaj sposób naliczania
                                    </Button>
                                }
                                formProps={CREATE_RATE_STRATEGY_CONFIG()}
                            />
                            {data.loans.rateStrategyConfigs.length === 0 ? (
                                <Typography color="text.secondary" textAlign="center" sx={{py: 2}}>
                                    Brak zdefiniowanych sposobów naliczania.
                                </Typography>
                            ) : (
                                <Stack>
                                    {data.loans.rateStrategyConfigs.map(config => (
                                        <Stack
                                            direction="row"
                                            alignItems="center"
                                            key={config.publicId}
                                            sx={compactListRow(theme)}
                                        >
                                            <Stack sx={{flex: 1, minWidth: 0}}>
                                                <Typography fontWeight={600}>{config.name}</Typography>
                                                <RateStrategyDisplay rateStrategyConfig={config} />
                                            </Stack>
                                            <DeleteButton
                                                object={config.publicId}
                                                title="Usunąć sposób naliczania?"
                                                confirmationMessage={
                                                    <>
                                                        Czy na pewno chcesz usunąć <strong>{config.name}</strong>?
                                                        Usunięcie może być niemożliwe, jeśli używa go pożyczka.
                                                    </>
                                                }
                                                buttonContent={
                                                    <Tooltip title="Usuń sposób naliczania">
                                                        <IconButton
                                                            aria-label={`Usuń sposób naliczania ${config.name}`}
                                                            size="small"
                                                        >
                                                            <DeleteOutlineRoundedIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                }
                                                onDelete={deleteRateStrategyConfig}
                                                onCancel={() => Promise.resolve()}
                                            />
                                        </Stack>
                                    ))}
                                </Stack>
                            )}
                        </Stack>
                    </Paper>

                    <Paper component="section" variant="outlined" sx={{width: '100%', p: {xs: 1.5, sm: 2}}}>
                        <Stack spacing={1.5}>
                            <Stack direction="row" alignItems="center" spacing={1}>
                                <Typography variant="h4">Dzień spłaty</Typography>
                                <Chip
                                    size="small"
                                    variant="outlined"
                                    label={`Liczba: ${data.loans.repaymentDayStrategyConfigs.length}`}
                                />
                            </Stack>
                            <FormDialogButton
                                title="Dodaj sposób wyboru dnia spłaty"
                                onConfirm={createNthDayOfMonthRepaymentDayStrategyConfig}
                                onCancel={() => Promise.resolve()}
                                buttonContent={
                                    <Button
                                        variant="outlined"
                                        color="secondary"
                                        startIcon={<AddRoundedIcon />}
                                        fullWidth
                                    >
                                        Dodaj sposób wyboru dnia
                                    </Button>
                                }
                                formProps={CREATE_REPAYMENT_DAY_STRATEGY_CONFIG()}
                            />
                            {data.loans.repaymentDayStrategyConfigs.length === 0 ? (
                                <Typography color="text.secondary" textAlign="center" sx={{py: 2}}>
                                    Brak zdefiniowanych sposobów wyboru dnia.
                                </Typography>
                            ) : (
                                <Stack>
                                    {data.loans.repaymentDayStrategyConfigs.map(config => (
                                        <Stack
                                            direction="row"
                                            alignItems="center"
                                            key={config.publicId}
                                            sx={compactListRow(theme)}
                                        >
                                            <Stack sx={{flex: 1, minWidth: 0}}>
                                                <Typography fontWeight={600}>{config.name}</Typography>
                                                <RepaymentDayStrategyDisplay repaymentDayStrategyConfig={config} />
                                            </Stack>
                                            <DeleteButton
                                                object={config.publicId}
                                                title="Usunąć sposób wyboru dnia?"
                                                confirmationMessage={
                                                    <>
                                                        Czy na pewno chcesz usunąć <strong>{config.name}</strong>?
                                                        Usunięcie może być niemożliwe, jeśli używa go pożyczka.
                                                    </>
                                                }
                                                buttonContent={
                                                    <Tooltip title="Usuń sposób wyboru dnia">
                                                        <IconButton
                                                            aria-label={`Usuń sposób wyboru dnia ${config.name}`}
                                                            size="small"
                                                        >
                                                            <DeleteOutlineRoundedIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                }
                                                onDelete={deleteRepaymentDayStrategyConfig}
                                                onCancel={() => Promise.resolve()}
                                            />
                                        </Stack>
                                    ))}
                                </Stack>
                            )}
                        </Stack>
                    </Paper>
                </Stack>
            </Stack>
        </Stack>
    );
}
