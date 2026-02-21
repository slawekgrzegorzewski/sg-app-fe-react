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
import Typography from "@mui/material/Typography";
import {ComparatorBuilder} from "../utils/comparator-builder";
import {BILLING_ELEMENT_FORM_PROPERTIES, BillingElementDTO, BillingElementType} from "./CreateBillingElementForm";
import Decimal from "decimal.js";

export interface CreateBillingElementButtonPros {
    yearMonth: Date;
    billingElementType: BillingElementType;
}

export function CreateBillingElementButton({yearMonth, billingElementType}: CreateBillingElementButtonPros) {
    const [showDialog, setShowDialog] = useState(false);
    const [affectedAccount, setAffectedAccount] = useState<GQLAccount | null>(null);
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
                accountPublicId: billingElementDTO.affectedAccountPublicId!,
                description: billingElementDTO.description!,
                amount: billingElementDTO.amount!,
                currency: affectedAccount!.currentBalance.currency.code,
                categoryPublicId: billingElementDTO.category!.publicId,
                date: billingElementDTO.date!.format("YYYY-MM-DD"),
                piggyBankPublicId: billingElementDTO.piggyBank?.publicId ? billingElementDTO.piggyBank!.publicId : null,
                bankTransactionPublicIds: []
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
        setAffectedAccount(null);
    }

    if (showDialog && !affectedAccount && !financeManagementData) {
        return <></>;
    }
    if (showDialog && !affectedAccount && financeManagementData) {
        const accounts = financeManagementData.financeManagement.accounts.map(mapAccount)
            .sort(ComparatorBuilder.comparing<GQLAccount>(a => a.order).build());
        return <PickDialog
            fullScreen={true}
            title={'Wybierz konto'}
            options={accounts}
            open={true}
            onClose={() => reset()}
            onPick={(value) => {
                setAffectedAccount(value);
            }}
            idExtractor={function (account: GQLAccount): string {
                return account ? account.publicId : "";
            }}
            descriptionExtractor={function (account: GQLAccount): string {
                return account ? (account.name + " " + formatMonetaryAmount(account.currentBalance)) : "";
            }}
        />;
    }

    if (showDialog && affectedAccount && financeManagementData) {
        const accounts = financeManagementData.financeManagement.accounts.map(mapAccount)
            .sort(ComparatorBuilder.comparing<GQLAccount>(a => a.order).build());
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
            formProps={BILLING_ELEMENT_FORM_PROPERTIES(
                {
                    billingElementType: billingElementType,
                    publicId: '',
                    affectedAccountPublicId: affectedAccount.publicId,
                    amount: new Decimal(0),
                    category: null,
                    date: null,
                    description: '',
                    piggyBank: null,
                },
                accounts,
                billingCategories,
                piggyBanks)}
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