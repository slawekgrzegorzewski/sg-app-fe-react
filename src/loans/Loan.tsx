import {ErrorDisplay, LoadingIndicator} from '../application/components/QueryState';
import {useResetMutationResults} from '../utils/use-reset-mutation-results';
import {useMutation, useQuery} from '@apollo/client/react';
import {
    CreateInstallment,
    CreateInstallmentMutation,
    DeleteLoan,
    DeleteLoanMutation,
    SingleLoan,
    SingleLoanQuery,
    UpdateLoan,
    UpdateLoanMutation,
} from '../types';
import {Button, Chip, IconButton, Paper, Stack, Tooltip, Typography} from '@mui/material';
import * as React from 'react';
import {useState} from 'react';
import {FormDialogButton} from '../utils/buttons/FormDialogButton';
import {DeleteButton} from '../utils/buttons/DeleteButton';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import CalculateRoundedIcon from '@mui/icons-material/CalculateRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import PaymentsRoundedIcon from '@mui/icons-material/PaymentsRounded';
import {useApplicationNavigation} from '../utils/use-application-navigation';
import {CREATE_INSTALLMENT_FORM_PROPS, EDIT_LOAN_FORM_PROPS} from './utils/loan-form';
import {useParams} from 'react-router-dom';
import {LoanDetails} from './LoanDetails';
import Decimal from 'decimal.js';
import {InstallmentsTable, mapInstallments} from './InstallmentsTable';
import * as Yup from 'yup';
import {EditorField} from '../utils/forms/Form';
import {LoanSimulation} from './LoanSimulation';
import {Dayjs} from 'dayjs';
import {StandOutText} from '../application/components/StandOutText';

export function Loan() {
    const {setPageParams} = useApplicationNavigation();
    const {param1} = useParams();
    const {loading, error, data, refetch} = useQuery<SingleLoanQuery>(SingleLoan, {
        variables: {loanId: param1},
    });
    const [updateLoanMutation, updateLoanMutationResult] = useMutation<UpdateLoanMutation>(UpdateLoan);
    const [deleteLoanMutation, deleteLoanMutationResult] = useMutation<DeleteLoanMutation>(DeleteLoan);
    const [createInstallmentMutation, createInstallmentMutationResult] =
        useMutation<CreateInstallmentMutation>(CreateInstallment);

    const [simulationParams, setSimulationParams] = useState<{
        monthlyBudget: Decimal;
        yearlyBudget: Decimal;
    } | null>(null);

    const updateLoan = async (loanId: string, name: string): Promise<any> => {
        await updateLoanMutation({variables: {loanId, name}});
        return refetch();
    };

    const deleteLoan = async (loanId: string): Promise<any> => {
        await deleteLoanMutation({variables: {loanId}});
        setPageParams([]);
        return Promise.resolve('');
    };

    const createInstallment = async (
        loanId: string,
        loanCurrency: string,
        paidAt: Dayjs,
        repaidInterest: Decimal,
        repaidAmount: Decimal,
        overpayment: Decimal
    ): Promise<any> => {
        await createInstallmentMutation({
            variables: {
                loanId,
                paidAt: paidAt.format('YYYY-MM-DD'),
                repaidInterest,
                repaidAmount,
                overpayment,
                currency: loanCurrency,
            },
        });
        return refetch();
    };

    useResetMutationResults(updateLoanMutationResult, deleteLoanMutationResult, createInstallmentMutationResult);

    if (loading) {
        return <LoadingIndicator label="Ładowanie szczegółów pożyczki..." />;
    }

    if (error) {
        return <ErrorDisplay error={error} onRetry={() => void refetch()} />;
    }

    if (!data?.singleLoan) {
        return <></>;
    }

    const loan = data.singleLoan;
    const installments = mapInstallments(loan.paidAmount.amount, loan.installments);

    return (
        <Stack component="section" alignItems="center" sx={{width: '100%', px: {xs: 1, sm: 2}, py: 2}}>
            <Stack spacing={2.5} sx={{width: '100%', maxWidth: 960}}>
                <Button
                    variant="text"
                    startIcon={<ArrowBackRoundedIcon />}
                    onClick={() => setPageParams([])}
                    sx={{alignSelf: 'flex-start'}}
                >
                    Wróć do pożyczek
                </Button>

                <Paper variant="outlined" sx={{p: {xs: 1.5, sm: 2.5}}}>
                    <Stack spacing={2}>
                        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" gap={1}>
                            <Typography variant="h3" sx={{minWidth: 0, overflowWrap: 'anywhere'}}>
                                <StandOutText standOutBy="both">{loan.name}</StandOutText>
                            </Typography>
                            <Stack direction="row" flexShrink={0}>
                                <FormDialogButton
                                    title="Edytuj nazwę pożyczki"
                                    onConfirm={value => updateLoan(loan.publicId, value.name)}
                                    onCancel={() => Promise.resolve()}
                                    buttonContent={
                                        <Tooltip title="Edytuj nazwę">
                                            <IconButton aria-label="Edytuj nazwę pożyczki" size="small">
                                                <EditRoundedIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    }
                                    formProps={EDIT_LOAN_FORM_PROPS(loan.name)}
                                />
                                <DeleteButton
                                    object={loan.publicId}
                                    title="Usunąć pożyczkę?"
                                    confirmationMessage={
                                        <>
                                            Czy na pewno chcesz usunąć pożyczkę <strong>{loan.name}</strong>? Tej
                                            operacji nie można cofnąć.
                                        </>
                                    }
                                    buttonContent={
                                        <Tooltip title="Usuń pożyczkę">
                                            <IconButton aria-label="Usuń pożyczkę" size="small">
                                                <DeleteOutlineRoundedIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    }
                                    onDelete={deleteLoan}
                                    onCancel={() => Promise.resolve()}
                                />
                            </Stack>
                        </Stack>

                        <LoanDetails loan={loan} />

                        <Stack direction={{xs: 'column', sm: 'row'}} gap={1}>
                            <FormDialogButton
                                title="Zarejestruj spłatę raty"
                                onConfirm={value =>
                                    createInstallment(
                                        loan.publicId,
                                        loan.paidAmount.currency.code,
                                        value.paidAt,
                                        value.repaidInterest,
                                        value.repaidAmount,
                                        value.overpayment
                                    )
                                }
                                onCancel={() => Promise.resolve()}
                                buttonContent={
                                    <Button
                                        variant="contained"
                                        color="secondary"
                                        startIcon={<PaymentsRoundedIcon />}
                                        fullWidth
                                    >
                                        Zarejestruj ratę
                                    </Button>
                                }
                                formProps={CREATE_INSTALLMENT_FORM_PROPS()}
                            />
                            <FormDialogButton
                                title="Parametry symulacji spłaty"
                                onConfirm={value => {
                                    setSimulationParams({
                                        monthlyBudget: value.monthlyBudget,
                                        yearlyBudget: value.yearlyBudget,
                                    });
                                    return Promise.resolve();
                                }}
                                onCancel={() => Promise.resolve()}
                                buttonContent={
                                    <Button
                                        variant="outlined"
                                        color="secondary"
                                        startIcon={<CalculateRoundedIcon />}
                                        fullWidth
                                    >
                                        Symuluj spłatę
                                    </Button>
                                }
                                formProps={{
                                    presentation: 'dialog',
                                    submitLabel: 'Pokaż symulację',
                                    submitColor: 'secondary',
                                    validationSchema: Yup.object({
                                        monthlyBudget: Yup.number().min(0).required('Wymagana'),
                                        yearlyBudget: Yup.number().min(0).required('Wymagana'),
                                    }),
                                    initialValues: {
                                        monthlyBudget: new Decimal(0),
                                        yearlyBudget: new Decimal(0),
                                    },
                                    fields: [
                                        {
                                            label: 'Dodatkowy budżet miesięczny',
                                            type: 'NUMBER',
                                            key: 'monthlyBudget',
                                            editable: true,
                                        } as EditorField,
                                        {
                                            label: 'Dodatkowy budżet roczny',
                                            type: 'NUMBER',
                                            key: 'yearlyBudget',
                                            editable: true,
                                        } as EditorField,
                                    ],
                                }}
                            />
                        </Stack>
                    </Stack>
                </Paper>

                <Paper component="section" variant="outlined" sx={{p: {xs: 1.5, sm: 2}}}>
                    <Stack spacing={1.5}>
                        <Stack direction="row" alignItems="center" spacing={1}>
                            <Typography variant="h4">Historia spłat</Typography>
                            <Chip size="small" variant="outlined" label={`Liczba: ${installments.length}`} />
                        </Stack>
                        {installments.length === 0 ? (
                            <Typography color="text.secondary" textAlign="center" sx={{py: 3}}>
                                Nie zarejestrowano jeszcze żadnej raty.
                            </Typography>
                        ) : (
                            <InstallmentsTable installments={installments} currency={loan.paidAmount.currency} />
                        )}
                    </Stack>
                </Paper>

                {simulationParams && (
                    <Paper component="section" variant="outlined" sx={{p: {xs: 1.5, sm: 2}}}>
                        <Stack spacing={1.5}>
                            <Typography variant="h4">Symulacja spłaty</Typography>
                            <LoanSimulation loan={loan} {...simulationParams} />
                        </Stack>
                    </Paper>
                )}
            </Stack>
        </Stack>
    );
}
