import {useMutation, useQuery} from '@apollo/client/react';
import {
    Account,
    BillingCategory,
    CreateExpense,
    CreateExpenseMutation,
    CreateIncome,
    CreateIncomeMutation,
    GetFinanceManagement,
    GetFinanceManagementQuery,
    PiggyBank,
} from '../types';
import * as React from 'react';
import {useState} from 'react';
import Button from '@mui/material/Button';
import {BillingElementType} from './model/BillingElementType';
import {FormDialog} from '../utils/dialogs/FormDialog';
import Typography from '@mui/material/Typography';
import {ComparatorBuilder} from '../utils/comparator-builder';
import {BILLING_ELEMENT_FORM_PROPERTIES, BillingElementDTO} from './CreateBillingElementForm';
import Decimal from 'decimal.js';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import {useTheme} from '@mui/material/styles';

export interface CreateBillingElementButtonPros {
    billingElementType: BillingElementType;
}

export function CreateBillingElementButton({billingElementType}: CreateBillingElementButtonPros) {
    const [showDialog, setShowDialog] = useState(false);
    const theme = useTheme();
    const {
        client,
        loading,
        data: financeManagementData,
        refetch,
    } = useQuery<GetFinanceManagementQuery>(GetFinanceManagement);

    const [createIncomeMutation] = useMutation<CreateIncomeMutation>(CreateIncome);
    const [createExpenseMutation] = useMutation<CreateExpenseMutation>(CreateExpense);

    const save = (billingElementDTO: BillingElementDTO): Promise<void> => {
        const affectedAccount = (financeManagementData?.financeManagement.accounts as Account[] | undefined)?.find(
            account => account.publicId === billingElementDTO.affectedAccountPublicId
        );
        if (!affectedAccount) {
            return Promise.reject(new Error('Wybrane konto nie jest dostępne.'));
        }

        const variables = {
            variables: {
                accountPublicId: billingElementDTO.affectedAccountPublicId!,
                description: billingElementDTO.description!,
                amount: billingElementDTO.amount!,
                currency: affectedAccount!.currentBalance.currency.code,
                categoryPublicId: billingElementDTO.category!.publicId,
                date: billingElementDTO.date!.format('YYYY-MM-DD'),
                piggyBankPublicId: billingElementDTO.piggyBank?.publicId ? billingElementDTO.piggyBank!.publicId : null,
                bankTransactionPublicIds: [],
            },
        };
        return (
            billingElementType === 'Income' ? createIncomeMutation(variables) : createExpenseMutation(variables)
        ).then(() => {
            reset();
            return Promise.resolve();
        });
    };

    const reset = () => {
        client.clearStore();
        setShowDialog(false);
    };

    if (showDialog && !financeManagementData) {
        return <></>;
    }

    if (showDialog && financeManagementData) {
        const accounts = [...(financeManagementData.financeManagement.accounts as Account[])].sort(
            ComparatorBuilder.comparing<Account>(a => a.order).build()
        );
        const billingCategories = [
            ...(financeManagementData.financeManagement.billingCategories as BillingCategory[]),
        ].sort(ComparatorBuilder.comparing<BillingCategory>(bc => bc.name).build());
        const piggyBanks = [...(financeManagementData.financeManagement.piggyBanks as PiggyBank[])].sort(
            ComparatorBuilder.comparing<PiggyBank>(pb => pb.name).build()
        );
        return (
            <FormDialog
                open={true}
                dialogOptions={{fullWidth: true, maxWidth: 'sm'}}
                dialogTitle={
                    <Typography variant="h4" component="span" sx={{color: 'secondary.main'}}>
                        Stwórz {billingElementType === 'Income' ? 'dochód' : 'wydatek'}
                    </Typography>
                }
                onConfirm={save}
                onCancel={() => {
                    reset();
                    return Promise.resolve();
                }}
                formProps={BILLING_ELEMENT_FORM_PROPERTIES(
                    {
                        billingElementType: billingElementType,
                        publicId: '',
                        affectedAccountPublicId: '',
                        amount: new Decimal(0),
                        category: null,
                        date: null,
                        description: '',
                        piggyBank: null,
                    },
                    accounts,
                    billingCategories,
                    piggyBanks
                )}
            />
        );
    }

    if (!showDialog) {
        const actionPalette = billingElementType === 'Income' ? theme.palette.success : theme.palette.error;
        const actionColor = theme.palette.mode === 'light' ? actionPalette.dark : actionPalette.light;

        return (
            <Button
                variant="outlined"
                color={billingElementType === 'Income' ? 'success' : 'error'}
                startIcon={<AddCircleOutlineIcon />}
                sx={{
                    alignSelf: 'stretch',
                    mt: 1,
                    color: actionColor,
                    borderColor: actionColor,
                    fontWeight: 600,
                    '&:hover': {borderColor: actionColor},
                }}
                disabled={loading || !financeManagementData}
                onClick={() => {
                    setShowDialog(true);
                    void refetch();
                }}
            >
                Dodaj {billingElementType === 'Income' ? 'dochód' : 'wydatek'}
            </Button>
        );
    }
    return <></>;
}
