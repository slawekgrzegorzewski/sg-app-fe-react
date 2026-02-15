import {EditorField} from "../utils/forms/Form";
import {useLazyQuery, useMutation} from "@apollo/client/react";
import {CreateIncome, CreateIncomeMutation, GetFinanceManagement, GetFinanceManagementQuery} from "../types";
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

export interface CreateIncomeButtonPros {
    yearMonth: Date;
}

type IncomeDTO = {
    publicId: string;
    accountName: string;
    amount: number;
    category: GQLBillingCategory;
    date: Date;
    description: string;
    piggyBank: GQLPiggyBank;
}

const BILLING_ELEMENT_FORM = (account: GQLAccount, categories: GQLBillingCategory[], piggyBanks: GQLPiggyBank[]) => {
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
            date: new Date(),
            description: '',
            piggyBank: {publicId: '', name: ''},
        } as IncomeDTO,
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
                    label: 'Skarbonka do uznania',
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

export function CreateIncomeButton({yearMonth}: CreateIncomeButtonPros) {
    const [showDialog, setShowDialog] = useState(false);
    const [targetAccount, setTargetAccount] = useState<GQLAccount | null>(null);
    const [fetchFinanceManagement, {
        client,
        called,
        data: financeManagementData,
        refetch
    }] = useLazyQuery<GetFinanceManagementQuery>(GetFinanceManagement, {});

    const [createIncomeMutation, createIncomeResult] = useMutation<CreateIncomeMutation>(CreateIncome);

    const save = (incomeDTO: IncomeDTO): Promise<void> => {
        return createIncomeMutation({
            variables: {
                accountPublicId: targetAccount!.publicId,
                description: incomeDTO.description,
                amount: incomeDTO.amount,
                currency: targetAccount!.currentBalance.currency.code,
                categoryPublicId: incomeDTO.category.publicId,
                date: incomeDTO.date,
                piggyBankPublicId: incomeDTO.piggyBank.publicId
            }
        }).then(result => {
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
        const accounts = financeManagementData.financeManagement.accounts.map(mapAccount);
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
            dialogTitle={<Typography>Stwórz dochód</Typography>}
            onConfirm={save}
            onCancel={() => {
                reset();
                return Promise.resolve();
            }}
            formProps={BILLING_ELEMENT_FORM(targetAccount, billingCategories, piggyBanks)}
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