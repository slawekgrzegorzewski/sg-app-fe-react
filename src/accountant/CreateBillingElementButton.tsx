import {EditorField} from "../utils/forms/Form";
import {useLazyQuery, useMutation} from "@apollo/client/react";
import {
    CreateExpense,
    CreateExpenseMutation,
    CreateIncome,
    CreateIncomeMutation,
    GetFinanceManagement,
    GetFinanceManagementQuery
} from "../types";
import * as React from "react";
import {useState} from "react";
import Button from "@mui/material/Button";
import PickDialog from "../utils/dialogs/PickDialog";
import {
    GQLAccount,
    GQLBillingCategory,
    GQLPiggyBank,
    mapAccount,
    mapBillingCategory,
    mapPiggyBank
} from "./model/types";
import {formatMonetaryAmount} from "../utils/functions";
import {FormDialog} from "../utils/dialogs/FormDialog";
import * as Yup from "yup";
import Typography from "@mui/material/Typography";
import {ComparatorBuilder} from "../utils/comparator-builder";
import dayjs, {Dayjs} from "dayjs";

export interface CreateBillingElementButtonPros {
    yearMonth: Date;
    billingElementType: BillingElementType;
}

export type BillingElementType = 'Income' | 'Expense';

type BillingElementDTO = {
    publicId: string;
    accountName: string;
    amount: number;
    category: GQLBillingCategory;
    date: Dayjs;
    description: string;
    piggyBank: GQLPiggyBank;
}

const BILLING_ELEMENT_FORM = (account: GQLAccount, categories: GQLBillingCategory[], piggyBanks: GQLPiggyBank[], billingElementType: BillingElementType) => {
    return {
        validationSchema: Yup.object({
            publicId: Yup.string(),
            accountName: Yup.string().required('Wymagana'),
            amount: Yup.number().required('Wymagana'),
            category: Yup.object().required('Wymagana'),
            date: Yup.date().required('Wymagana'),
            description: Yup.string().required('Wymagana'),
            piggyBank: Yup.object().required('Wymagana'),
        }),
        initialValues: {
            publicId: '',
            accountName: account.name + " (" + account.currentBalance.currency.code + ")",
            amount: 0,
            category: {publicId: '', name: ''},
            date: dayjs(),
            description: '',
            piggyBank: {publicId: '', name: ''},
        } as BillingElementDTO,
        fields:
            [
                {
                    label: 'PublicId',
                    type: 'HIDDEN',
                    key: 'publicId',
                    editable: false
                } as EditorField,
                {
                    label: 'Konto',
                    type: 'TEXT',
                    key: 'accountName',
                    editable: false
                } as EditorField,
                {
                    label: 'Kwota',
                    type: 'NUMBER',
                    key: 'amount',
                    editable: true
                } as EditorField,
                {
                    label: 'Kategoria',
                    type: 'AUTOCOMPLETE',
                    key: 'category',
                    options: categories,
                    getOptionLabel: (billingCategory: GQLBillingCategory) => billingCategory.name,
                    isOptionEqualToValue: (option: GQLBillingCategory, value: GQLBillingCategory) => option.publicId === value.publicId,
                    editable: true
                } as EditorField,
                {
                    label: 'Data',
                    type: 'DATEPICKER',
                    key: 'date',
                    editable: true,
                    additionalProps: {
                        sx: {width: '200px'},
                    }
                } as EditorField,
                {
                    label: 'Opis',
                    type: 'TEXTAREA',
                    key: 'description',
                    editable: true
                } as EditorField,
                {
                    label: 'Skarbonka do ' + (billingElementType === 'Income' ? 'uznania' : 'obciążenia'),
                    type: 'AUTOCOMPLETE',
                    key: 'piggyBank',
                    options: piggyBanks,
                    getOptionLabel: (piggyBank: GQLPiggyBank) => piggyBank.name,
                    isOptionEqualToValue: (option: GQLPiggyBank, value: GQLPiggyBank) => option.publicId === value.publicId,
                    editable: true
                } as EditorField,
            ]
    }
};

export function CreateBillingElementButton({yearMonth, billingElementType}: CreateBillingElementButtonPros) {
    const [showDialog, setShowDialog] = useState(false);
    const [targetAccount, setTargetAccount] = useState<GQLAccount | null>(null);
    const [fetchFinanceManagement, {
        client,
        called,
        data: financeManagementData,
        refetch
    }] = useLazyQuery<GetFinanceManagementQuery>(GetFinanceManagement, {});

    const [createIncomeMutation] = useMutation<CreateIncomeMutation>(CreateIncome);
    const [createExpenseMutation] = useMutation<CreateExpenseMutation>(CreateExpense);

    const save = (billingElementDTO: BillingElementDTO): Promise<void> => {
        const variables = {
            variables: {
                accountPublicId: targetAccount!.publicId,
                description: billingElementDTO.description,
                amount: billingElementDTO.amount,
                currency: targetAccount!.currentBalance.currency.code,
                categoryPublicId: billingElementDTO.category.publicId,
                date: billingElementDTO.date.format("YYYY-MM-DD"),
                piggyBankPublicId: billingElementDTO.piggyBank.publicId === '' ? null : billingElementDTO.piggyBank.publicId
            }
        };
        return (billingElementType === 'Income' ? createIncomeMutation(variables) : createExpenseMutation(variables))
            .then(result => {
                reset();
                return Promise.resolve();
            })
    }

    const reset = () => {
        client.clearStore();
        setShowDialog(false);
        setTargetAccount(null);
    }

    if (showDialog && !targetAccount && !financeManagementData) {
        return <></>;
    }
    if (showDialog && !targetAccount && financeManagementData) {
        const accounts = financeManagementData.financeManagement.accounts.map(mapAccount)
            .sort(ComparatorBuilder.comparing<GQLAccount>(a => a.order).build());
        return <PickDialog
            fullScreen={true}
            title={'Wybierz konto'}
            options={accounts}
            open={true}
            onClose={() => reset()}
            onPick={(value) => {
                setTargetAccount(value);
            }}
            idExtractor={function (account: GQLAccount): string {
                return account ? account.publicId : "";
            }}
            descriptionExtractor={function (account: GQLAccount): string {
                return account ? (account.name + " " + formatMonetaryAmount(account.currentBalance)) : "";
            }}
        />;
    }

    if (showDialog && targetAccount && financeManagementData) {
        const billingCategories = financeManagementData.financeManagement.billingCategories
            .map(mapBillingCategory)
            .sort(ComparatorBuilder.comparing<GQLBillingCategory>(bc => bc.name).build());
        const piggyBanks = financeManagementData.financeManagement.piggyBanks
            .map(mapPiggyBank)
            .sort(ComparatorBuilder.comparing<GQLPiggyBank>(pb => pb.name).build());
        return <FormDialog
            open={true}
            dialogTitle={<Typography>Stwórz {billingElementType === 'Income' ? 'dochód' : 'wydatek'}</Typography>}
            onConfirm={save}
            onCancel={() => {
                reset();
                return Promise.resolve();
            }}
            formProps={BILLING_ELEMENT_FORM(targetAccount, billingCategories, piggyBanks, billingElementType)}
        />;
    }

    if (!showDialog) {
        return <Button onClick={() => {
            setShowDialog(true);
            client.cache.evict({id: 'a'})
            if (called) {
                refetch();
            } else {
                fetchFinanceManagement();
            }
        }}>
            Wprowadź
        </Button>
    }
    return <></>;
}