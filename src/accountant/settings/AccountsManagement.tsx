import {useMutation} from "@apollo/client";
import {
    CreateAccount,
    CreateAccountMutation,
    DeleteAccount,
    DeleteAccountMutation,
    ReorderAccount,
    ReorderAccountMutation,
    UpdateAccount,
    UpdateAccountMutation
} from "../../types";
import * as React from "react";
import * as Yup from "yup";
import {AutocompleteEditorField, BooleanEditorField, EditorField} from "../../utils/forms/Form";
import {SimpleCrudList} from "../../application/components/SimpleCrudList";
import {ComparatorBuilder} from "../../utils/comparator-builder";
import Decimal from "decimal.js";
import Box from "@mui/material/Box";
import {formatBalance} from "../../utils/functions";
import {Card, Theme, useTheme} from "@mui/material";
import {GQLAccount, GQLCurrencyInfo} from "../model/types";
import {SxProps} from "@mui/system";
import {Visibility, VisibilityOff} from "@mui/icons-material";

type AccountDTO = {
    publicId: string,
    name: string,
    visible: boolean,
    currentBalance: Decimal,
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
                        editable: true,
                        icon: <VisibilityOff/>,
                        checkedIcon: <Visibility/>,
                    } as BooleanEditorField,
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

export interface AccountsManagementProps {
    accounts: GQLAccount[],
    supportedCurrencies: GQLCurrencyInfo[],
    refetch: () => void
}

export function AccountsManagement({accounts, supportedCurrencies, refetch}: AccountsManagementProps) {

    const [createAccountMutation] = useMutation<CreateAccountMutation>(CreateAccount);
    const [updateAccountMutation] = useMutation<UpdateAccountMutation>(UpdateAccount);
    const [deleteAccountMutation] = useMutation<DeleteAccountMutation>(DeleteAccount);
    const [reorderAccountMutation] = useMutation<ReorderAccountMutation>(ReorderAccount);

    const createAccount = async (account: AccountDTO): Promise<any> => {
        return await createAccountMutation({
            variables: {
                name: account.name,
                balanceIndex: null,
                bankAccountId: null,
                visible: account.visible,
                creditLimitAmount: account.creditLimitAmount,
                creditLimitCurrency: account.currency
            }
        })
            .finally(() => refetch());
    };
    const theme = useTheme();

    const updateAccount = async (account: AccountDTO): Promise<any> => {
        return await updateAccountMutation({
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
    };

    const deleteAccount = async (publicId: string): Promise<any> => {
        return await deleteAccountMutation({variables: {publicId: publicId}})
            .finally(() => refetch());
    };

    const reorderAccount = async (publicId: string, beforeAccountPublicId: string | null, afterAccountPublicId: string | null): Promise<any> => {
        return await reorderAccountMutation({
            variables: {
                accountPublicId: publicId,
                accountBeforePublicId: beforeAccountPublicId,
                accountAfterPublicId: afterAccountPublicId
            }
        })
            .finally(() => refetch());
    };

    const currencies = supportedCurrencies.map(currency => currency.code).sort();
    return <SimpleCrudList
        title={'KONTA'}
        editTitle={'Edytuj'}
        createTitle={'Dodaj'}
        list={
            accounts
                .sort(ComparatorBuilder.comparing<GQLAccount>(account => account.order).build())
                .map(account => {
                    return {
                        publicId: account.publicId,
                        name: account.name,
                        visible: account.visible,
                        currentBalance: new Decimal(account.currentBalance.amount),
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
        rowContainerProvider={(sx: SxProps<Theme>, additionalProperties: any) => {
            return <Card sx={{marginBottom: '10px', ...sx}} {...additionalProperties}></Card>;
        }}
        entityDisplay={(account, index) => {
            return <Box dir={'column'} key={account.publicId} sx={{paddingLeft: '15px'}}>
                <div>{account.name}</div>
                <div style={{
                    color: account.currentBalance.toNumber() < 0 ? theme.palette.error.main : theme.palette.text.disabled,
                    paddingLeft: '15px'
                }}>
                    Stan konta: {formatBalance(account.currency, account.currentBalance)}
                </div>
                {account.creditLimitAmount.toNumber() > 0 && (
                    <div style={{
                        color: theme.palette.text.disabled,
                        paddingLeft: '15px'
                    }}>
                        Limit kredytowy: {formatBalance(account.currency, account.creditLimitAmount)}
                    </div>)}
                {!account.visible && (
                    <div style={{
                        color: theme.palette.warning.main,
                        paddingLeft: '15px'
                    }}>
                        Ukryte z interfejsu
                    </div>)}
            </Box>;
        }}
        enableDndReorder={true}
        onReorder={event => reorderAccount(event.id, event.aboveId, event.belowId)}
    />
}