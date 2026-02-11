import {useMutation} from "@apollo/client/react";
import {
    AssignBankAccountToAccount,
    AssignBankAccountToAccountMutation,
    CreateAccount,
    CreateAccountMutation,
    DeleteAccount,
    DeleteAccountMutation,
    DeleteBankAccountAssignment,
    DeleteBankAccountAssignmentMutation,
    ReorderAccount,
    ReorderAccountMutation,
    UpdateAccount,
    UpdateAccountMutation
} from "../../types";
import * as React from "react";
import {useRef, useState} from "react";
import * as Yup from "yup";
import {AutocompleteEditorField, BooleanEditorField, EditorField} from "../../utils/forms/Form";
import {SimpleCrudList} from "../../application/components/SimpleCrudList";
import {ComparatorBuilder} from "../../utils/comparator-builder";
import Decimal from "decimal.js";
import {formatBalance} from "../../utils/functions";
import {Card, Stack, Theme, useTheme} from "@mui/material";
import {GQLAccount, GQLBankAccount, GQLCurrencyInfo} from "../model/types";
import {SxProps} from "@mui/system";
import {Visibility, VisibilityOff} from "@mui/icons-material";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import {PickBankAccountButton} from "./PickBankAccountButton";
import {FormDialog} from "../../utils/dialogs/FormDialog";
import ConfirmationDialog from "../../utils/dialogs/ConfirmationDialog";

type AccountDTO = {
    publicId: string,
    name: string,
    visible: boolean,
    bankAccount?: BankAccountDTO,
    currentBalance: Decimal,
    currency: string,
    creditLimitAmount: Decimal,
    order: number
}

type BankAccountDTO = {
    publicId: string,
    iban: string
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
    notAssignedBankAccounts: GQLBankAccount[],
    supportedCurrencies: GQLCurrencyInfo[],
    refetch: () => void
}

export function AccountsManagement({
                                       accounts,
                                       notAssignedBankAccounts,
                                       supportedCurrencies,
                                       refetch
                                   }: AccountsManagementProps) {

    const [createAccountMutation] = useMutation<CreateAccountMutation>(CreateAccount);
    const [updateAccountMutation] = useMutation<UpdateAccountMutation>(UpdateAccount);
    const [deleteAccountMutation] = useMutation<DeleteAccountMutation>(DeleteAccount);
    const [reorderAccountMutation] = useMutation<ReorderAccountMutation>(ReorderAccount);
    const [assignBankAccountToAccountMutation] = useMutation<AssignBankAccountToAccountMutation>(AssignBankAccountToAccount);
    const [deleteBankAccountAssignmentMutation] = useMutation<DeleteBankAccountAssignmentMutation>(DeleteBankAccountAssignment);
    const [editDialogOptions, setEditDialogOptions] = useState<{ account: AccountDTO | null }>({account: null});
    const [deleteDialogOptions, setDeleteDialogOptions] = useState<{ account: AccountDTO | null }>({account: null});
    const [deleteBankAccountAssignmentDialogOptions, setDeleteBankAccountAssignmentDialogOptions] = useState<{
        account: AccountDTO | null
    }>({account: null});
    const editTrigger: React.MutableRefObject<((accountDTO: AccountDTO) => void)> = useRef<(accountDTO: AccountDTO) => void>(() => {
    });

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

    const deleteAccount = async (account: AccountDTO): Promise<any> => {
        return await deleteAccountMutation({variables: {publicId: account.publicId}})
            .finally(() => refetch());
    };

    const assignBankAccountToAccount = async (bankAccountPublicId: string, accountPublicId: string): Promise<any> => {
        return await assignBankAccountToAccountMutation({
            variables: {
                accountPublicId: accountPublicId,
                bankAccountPublicId: bankAccountPublicId
            }
        })
            .finally(() => refetch());
    };

    const deleteBankAccountAssignment = async (accountPublicId: string): Promise<any> => {
        console.log(JSON.stringify({variables: {accountPublicId: accountPublicId}}));
        return await deleteBankAccountAssignmentMutation({variables: {accountPublicId: accountPublicId}})
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
    return <>
        <SimpleCrudList
            title={'KONTA'}
            editSettings={{
                rowClickIsTrigger: false,
                dialogTitle: 'Edytuj',
                trigger: editTrigger,
                onUpdate: updateAccount,
            }}
            createSettings={{
                showControl: true,
                dialogTitle: 'Dodaj',
                onCreate: createAccount,
            }}
            deleteSettings={{
                showControl: false,
                onDelete: deleteAccount
            }}
            list={
                accounts
                    .sort(ComparatorBuilder.comparing<GQLAccount>(account => account.order).build())
                    .map(account => {
                        return {
                            publicId: account.publicId,
                            name: account.name,
                            visible: account.visible,
                            bankAccount: account.bankAccount ? {
                                    publicId: account.bankAccount.publicId,
                                    iban: account.bankAccount.iban
                                }
                                : undefined,
                            currentBalance: new Decimal(account.currentBalance.amount),
                            currency: account.currentBalance.currency.code,
                            creditLimitAmount: new Decimal(account.creditLimit.amount),
                            order: account.order
                        } as AccountDTO
                    })
            }
            idExtractor={account => account.publicId}
            highlightRowOnHover={false}
            formSupplier={account => account ? ACCOUNT_FORM(currencies, account) : ACCOUNT_FORM(currencies)}
            rowContainerProvider={(key: string, sx: SxProps<Theme>, additionalProperties: any) => {
                return <Card key={key} sx={{marginBottom: '10px', ...sx}} {...additionalProperties}></Card>;
            }}
            entityDisplay={(account) => {
                return <Stack direction={'row'} key={account.publicId} sx={{paddingLeft: '15px'}}
                              justifyContent={'space-between'} alignItems={'baseline'}>
                    <Stack direction={'column'} alignItems={'flex-start'}>
                        <Typography variant={'body1'}>{account.name}</Typography>
                        <Stack direction={'column'} sx={{paddingLeft: '15px'}}>
                            {account.bankAccount && (
                                <Typography variant={'body2'}
                                            sx={{
                                                color: theme.palette.text.disabled
                                            }}>
                                    Powiązane z kontem bankowym: {account.bankAccount.iban}
                                </Typography>
                            )}
                            <Typography variant={'body2'}
                                        sx={{
                                            color: account.currentBalance.toNumber() < 0 ? theme.palette.error.main : theme.palette.text.disabled
                                        }}>
                                Stan konta: {formatBalance(account.currency, account.currentBalance)}
                            </Typography>
                            {account.creditLimitAmount.toNumber() > 0 && (
                                <Typography variant={'body2'}
                                            sx={{
                                                color: theme.palette.text.disabled
                                            }}>
                                    Limit kredytowy: {formatBalance(account.currency, account.creditLimitAmount)}
                                </Typography>
                            )}
                            {!account.visible && (
                                <Typography variant={'body2'}
                                            sx={{
                                                color: theme.palette.warning.main
                                            }}>
                                    Ukryte z interfejsu
                                </Typography>
                            )}
                        </Stack>
                    </Stack>
                    <Stack direction={'column'} alignItems={'flex-start'}>
                        <Stack direction={'row'}>
                            <Button onClick={() => editTrigger.current(account)}>Edytuj</Button>
                            <Button onClick={() => setDeleteDialogOptions({account: account})}>Usuń</Button>
                        </Stack>
                        {account.bankAccount &&
                            <Button onClick={() => setDeleteBankAccountAssignmentDialogOptions({account: account})}>Usuń konto</Button>}
                        {!account.bankAccount && notAssignedBankAccounts.length > 0 &&
                            <PickBankAccountButton
                                bankAccounts={notAssignedBankAccounts}
                                onPick={bankAccount => assignBankAccountToAccount(bankAccount.publicId, account.publicId)}
                                onClose={() => {
                                }}
                                text={'Przypisz konto'}
                            />}
                    </Stack>
                </Stack>;
            }}
            enableDndReorder={true}
            onReorder={event => reorderAccount(event.id, event.aboveId, event.belowId)}
        />
        {
            editDialogOptions.account && <FormDialog dialogTitle={<Typography>Edytuj konto</Typography>}
                                                     open={true}
                                                     onConfirm={value => updateAccount(value)}
                                                     onCancel={() => {
                                                         setEditDialogOptions({account: null});
                                                         return Promise.resolve();
                                                     }}
                                                     formProps={ACCOUNT_FORM(currencies, editDialogOptions.account)}
            />
        }
        {
            deleteDialogOptions.account && <ConfirmationDialog companionObject={deleteDialogOptions.account}
                                                               title={'Na pewno usunąć?'}
                                                               message={'Na pewno usunąć?'}
                                                               open={true}
                                                               onConfirm={(entity: AccountDTO) => {
                                                                   setDeleteDialogOptions({account: null});
                                                                   return deleteAccount(entity);
                                                               }}
                                                               onCancel={() => {
                                                                   setDeleteDialogOptions({account: null});
                                                                   return Promise.resolve();
                                                               }}/>
        }
        {
            deleteBankAccountAssignmentDialogOptions.account &&
            <ConfirmationDialog companionObject={deleteBankAccountAssignmentDialogOptions.account}
                                title={'Na pewno usunąć?'}
                                message={'Na pewno usunąć powiązanie z kontem bankowym?'}
                                open={true}
                                onConfirm={(entity: AccountDTO) => {
                                    setDeleteBankAccountAssignmentDialogOptions({account: null});
                                    return deleteBankAccountAssignment(entity.publicId);
                                }}
                                onCancel={() => {
                                    setDeleteBankAccountAssignmentDialogOptions({account: null});
                                    return Promise.resolve();
                                }}/>
        }
    </>
}