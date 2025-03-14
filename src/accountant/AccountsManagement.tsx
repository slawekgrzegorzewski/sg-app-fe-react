import {useMutation, useQuery} from "@apollo/client";
import {
    CreateAccount,
    CreateAccountMutation,
    DeleteAccount,
    DeleteAccountMutation,
    GetFinanceManagement,
    GetFinanceManagementQuery,
    ReorderAccount,
    ReorderAccountMutation,
    UpdateAccount,
    UpdateAccountMutation
} from "../types";
import * as React from "react";
import * as Yup from "yup";
import {AutocompleteEditorField, EditorField} from "../utils/forms/Form";
import {SimpleCrudList} from "../application/components/SImpleCrudList";
import {ComparatorBuilder} from "../application/utils/comparator-builder";
import {GraphqlAccount} from "../graphql.entities";
import Decimal from "decimal.js";

type AccountDTO = {
    publicId: string,
    name: string,
    visible: boolean,
    currency: string,
    creditLimitAmount: Decimal,
    order: number
}

const ACCOUNT_FORM = (currencies: string[], account?: AccountDTO) => {
        return {
            validationSchema: Yup.object({
                publicId: account ? Yup.string().required() : Yup.string(),
                name: Yup.string().required('Wymagana'),
                visible: Yup.boolean().required(),
                currency: Yup.string()
                    .matches(
                        new RegExp(currencies.map(currency => "^" + currency + "$").join("|")),
                        "Waluta spoza dozwolonej listy")
                    .required('Wymagana'),
                creditLimitAmount: Yup.number().required()
            }),
            initialValues: {
                publicId: account?.publicId || '',
                name: account?.name || '',
                visible: account?.visible || false,
                currency: account?.currency || '',
                creditLimitAmount: account?.creditLimitAmount || 0,
            } as AccountDTO,
            fields:
                [
                    {
                        label: 'PublicId',
                        type: 'HIDDEN',
                        key: 'publicId',
                        editable: true
                    } as EditorField,
                    {
                        label: 'Nazwa',
                        type: 'TEXT',
                        key: 'name',
                        editable: true
                    } as EditorField,
                    {
                        label: 'Widoczne',
                        type: 'CHECKBOX',
                        key: 'visible',
                        editable: true
                    } as EditorField,
                    {
                        label: 'Waluta',
                        type: 'AUTOCOMPLETE',
                        options: currencies,
                        getOptionLabel: (option: any) => option,
                        isOptionEqualToValue: (option: any, value: any) => option === value,
                        key: 'currency',
                        editable: !account
                    } as AutocompleteEditorField,
                    {
                        label: 'Limit kredytowy',
                        type: 'NUMBER',
                        key: 'creditLimitAmount',
                        editable: true
                    } as EditorField
                ]
        };
    }
;

export function AccountsManagement() {

    const {loading, error, data, refetch} = useQuery<GetFinanceManagementQuery>(GetFinanceManagement);
    const [createAccountMutation] = useMutation<CreateAccountMutation>(CreateAccount);
    const [updateAccountMutation] = useMutation<UpdateAccountMutation>(UpdateAccount);
    const [deleteAccountMutation] = useMutation<DeleteAccountMutation>(DeleteAccount);
    const [reorderAccountMutation] = useMutation<ReorderAccountMutation>(ReorderAccount);

    const createAccount = async (account: AccountDTO): Promise<any> => {
        await createAccountMutation({
            variables: {
                name: account.name,
                balanceIndex: null,
                bankAccountId: null,
                visible: account.visible,
                creditLimitAmount: account.creditLimitAmount,
                creditLimitCurrency: account.currency
            }
        });
        return refetch();
    };


    const updateAccount = async (account: AccountDTO): Promise<any> => {
        await updateAccountMutation({
            variables: {
                publicId: account.publicId,
                name: account.name,
                balanceIndex: null,
                bankAccountId: null,
                visible: account.visible,
                creditLimitAmount: account.creditLimitAmount,
                creditLimitCurrency: account.currency
            }
        })
            .finally(() => refetch());
        return refetch();
    };

    const deleteAccount = async (publicId: string): Promise<any> => {
        await deleteAccountMutation({variables: {publicId: publicId}});
        return refetch();
    };

    const reorderAccount = async (publicId: string, beforeAccountPublicId: string | null, afterAccountPublicId: string | null): Promise<any> => {
        await reorderAccountMutation({
            variables: {
                accountPublicId: publicId,
                accountBeforePublicId: beforeAccountPublicId,
                accountAfterPublicId: afterAccountPublicId
            }
        }).finally(() => refetch());
        return refetch();
    };

    if (loading) {
        return <>Loading...</>
    } else if (error) {
        return <>Error...</>
    } else if (data) {
        const currencies = data.financeManagement.supportedCurrencies.map(currency => currency.code).sort();
        return <SimpleCrudList
            title={'ZARZĄDZAJ KONTAMI'}
            editTitle={'Edytuj konto'}
            createTitle={'Dodaj konto'}
            list={
                [...data.financeManagement.accounts]
                    .sort(ComparatorBuilder.comparing<GraphqlAccount>(account => account.order).build())
                    .map(account => {
                        return {
                            publicId: account.publicId,
                            name: account.name,
                            visible: account.visible,
                            currency: account.currentBalance.currency.code,
                            creditLimitAmount: new Decimal(account.creditLimit.amount),
                            order: account.order
                        } as AccountDTO
                    })
            }
            idExtractor={account => account.publicId}
            onCreate={account => createAccount(account)}
            onUpdate={account => updateAccount(account)}
            onDelete={account => deleteAccount(account.publicId)}
            formSupplier={account => account ? ACCOUNT_FORM(currencies, account) : ACCOUNT_FORM(currencies)}
            entityDisplay={account => <>
               {account.name} ({account.currency})
            </>}
            enableDndReorder={true}
            onReorder={event => reorderAccount(event.id, event.aboveId, event.belowId)}
        />
    } else {
        return <></>;
    }
}