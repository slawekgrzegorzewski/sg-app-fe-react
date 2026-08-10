import {useMutation} from '@apollo/client/react';
import {
    Account,
    AssignBankAccountToAccount,
    AssignBankAccountToAccountMutation,
    BankAccount,
    CreateAccount,
    CreateAccountMutation,
    CurrencyInfo,
    DeleteAccount,
    DeleteAccountMutation,
    DeleteBankAccountAssignment,
    DeleteBankAccountAssignmentMutation,
    ReorderAccount,
    ReorderAccountMutation,
    UpdateAccount,
    UpdateAccountMutation,
} from '../../types';
import * as React from 'react';
import {useState} from 'react';
import * as Yup from 'yup';
import {AutocompleteEditorField, BooleanEditorField, EditorField} from '../../utils/forms/Form';
import {SimpleCrudList} from '../../application/components/SimpleCrudList';
import {ComparatorBuilder} from '../../utils/comparator-builder';
import Decimal from 'decimal.js';
import {formatBalance} from '../../utils/functions';
import {Chip, IconButton, Stack, Tooltip} from '@mui/material';
import {Visibility, VisibilityOff} from '@mui/icons-material';
import Typography from '@mui/material/Typography';
import {PickBankAccountButton} from './PickBankAccountButton';
import ConfirmationDialog from '../../utils/dialogs/ConfirmationDialog';
import {FormattedMoneyText} from '../../application/components/FormattedMoneyText';
import {StandOutText} from '../../application/components/StandOutText';
import LinkOffRoundedIcon from '@mui/icons-material/LinkOffRounded';

type AccountDTO = {
    publicId: string;
    name: string;
    visible: boolean;
    bankAccount?: BankAccountDTO;
    currentBalance: Decimal;
    currency: string;
    creditLimitAmount: Decimal;
    order: number;
};

type BankAccountDTO = {
    publicId: string;
    iban: string;
};

const ACCOUNT_FORM = (currencies: string[], account?: AccountDTO) => {
    return {
        presentation: 'dialog' as const,
        submitLabel: account ? 'Zapisz zmiany' : 'Dodaj konto',
        submitColor: 'secondary' as const,
        validationSchema: Yup.object({
            publicId: account ? Yup.string().required() : Yup.string(),
            name: Yup.string().required('Wymagana'),
            visible: Yup.boolean().required(),
            currency: Yup.string()
                .matches(
                    new RegExp(currencies.map(currency => '^' + currency + '$').join('|')),
                    'Waluta spoza dozwolonej listy'
                )
                .required('Wymagana'),
            creditLimitAmount: Yup.number().required(),
        }),
        initialValues: {
            publicId: account?.publicId || '',
            name: account?.name || '',
            visible: account?.visible || false,
            currency: account?.currency || '',
            creditLimitAmount: account?.creditLimitAmount || 0,
        } as AccountDTO,
        fields: [
            {
                label: 'PublicId',
                type: 'HIDDEN',
                key: 'publicId',
                editable: true,
            } as EditorField,
            {
                label: 'Nazwa',
                type: 'TEXT',
                key: 'name',
                editable: true,
            } as EditorField,
            {
                label: 'Widoczne',
                type: 'CHECKBOX',
                key: 'visible',
                editable: true,
                icon: <VisibilityOff />,
                checkedIcon: <Visibility />,
            } as BooleanEditorField,
            {
                label: 'Waluta',
                type: 'AUTOCOMPLETE',
                options: currencies,
                getOptionLabel: (option: any) => option,
                isOptionEqualToValue: (option: any, value: any) => option === value,
                key: 'currency',
                editable: !account,
            } as AutocompleteEditorField,
            {
                label: 'Limit kredytowy',
                type: 'NUMBER',
                key: 'creditLimitAmount',
                editable: true,
            } as EditorField,
        ],
    };
};

export interface AccountsManagementProps {
    accounts: Account[];
    notAssignedBankAccounts: BankAccount[];
    supportedCurrencies: CurrencyInfo[];
    refetch: () => void;
}

export function AccountsManagement({
    accounts,
    notAssignedBankAccounts,
    supportedCurrencies,
    refetch,
}: AccountsManagementProps) {
    const [createAccountMutation] = useMutation<CreateAccountMutation>(CreateAccount);
    const [updateAccountMutation] = useMutation<UpdateAccountMutation>(UpdateAccount);
    const [deleteAccountMutation] = useMutation<DeleteAccountMutation>(DeleteAccount);
    const [reorderAccountMutation] = useMutation<ReorderAccountMutation>(ReorderAccount);
    const [assignBankAccountToAccountMutation] =
        useMutation<AssignBankAccountToAccountMutation>(AssignBankAccountToAccount);
    const [deleteBankAccountAssignmentMutation] =
        useMutation<DeleteBankAccountAssignmentMutation>(DeleteBankAccountAssignment);
    const [deleteBankAccountAssignmentDialogOptions, setDeleteBankAccountAssignmentDialogOptions] = useState<{
        account: AccountDTO | null;
    }>({account: null});

    const createAccount = async (account: AccountDTO): Promise<any> => {
        return await createAccountMutation({
            variables: {
                name: account.name,
                balanceIndex: null,
                bankAccountId: null,
                visible: account.visible,
                creditLimitAmount: account.creditLimitAmount,
                creditLimitCurrency: account.currency,
            },
        }).finally(() => refetch());
    };
    const updateAccount = async (account: AccountDTO): Promise<any> => {
        return await updateAccountMutation({
            variables: {
                publicId: account.publicId,
                name: account.name,
                balanceIndex: null,
                bankAccountId: null,
                visible: account.visible,
                creditLimitAmount: account.creditLimitAmount,
                creditLimitCurrency: account.currency,
            },
        }).finally(() => refetch());
    };

    const deleteAccount = async (account: AccountDTO): Promise<any> => {
        return await deleteAccountMutation({variables: {publicId: account.publicId}}).finally(() => refetch());
    };

    const assignBankAccountToAccount = async (bankAccountPublicId: string, accountPublicId: string): Promise<any> => {
        return await assignBankAccountToAccountMutation({
            variables: {
                accountPublicId: accountPublicId,
                bankAccountPublicId: bankAccountPublicId,
            },
        }).finally(() => refetch());
    };

    const deleteBankAccountAssignment = async (accountPublicId: string): Promise<any> => {
        return await deleteBankAccountAssignmentMutation({variables: {accountPublicId: accountPublicId}}).finally(() =>
            refetch()
        );
    };

    const reorderAccount = async (
        publicId: string,
        beforeAccountPublicId: string | null,
        afterAccountPublicId: string | null
    ): Promise<any> => {
        return await reorderAccountMutation({
            variables: {
                accountPublicId: publicId,
                accountBeforePublicId: beforeAccountPublicId,
                accountAfterPublicId: afterAccountPublicId,
            },
        }).finally(() => refetch());
    };

    const currencies = supportedCurrencies.map(currency => currency.code).sort();
    return (
        <>
            <SimpleCrudList
                title="Konta"
                presentation="settings"
                emptyStateLabel="Brak kont."
                editSettings={{
                    rowClickIsTrigger: false,
                    dialogTitle: 'Edytuj konto',
                    onUpdate: updateAccount,
                }}
                createSettings={{
                    showControl: true,
                    dialogTitle: 'Dodaj konto',
                    buttonLabel: 'Dodaj konto',
                    onCreate: createAccount,
                }}
                deleteSettings={{
                    showControl: true,
                    confirmationTitle: 'Usunąć konto?',
                    confirmationMessage: account => (
                        <>
                            Czy na pewno chcesz usunąć konto <strong>{account.name}</strong>? Tej operacji nie można
                            cofnąć.
                        </>
                    ),
                    onDelete: deleteAccount,
                }}
                list={[...accounts]
                    .sort(ComparatorBuilder.comparing<Account>(account => account.order).build())
                    .map(account => {
                        return {
                            publicId: account.publicId,
                            name: account.name,
                            visible: account.visible,
                            bankAccount: account.bankAccount
                                ? {
                                      publicId: account.bankAccount.publicId,
                                      iban: account.bankAccount.iban,
                                  }
                                : undefined,
                            currentBalance: new Decimal(account.currentBalance.amount),
                            currency: account.currentBalance.currency.code,
                            creditLimitAmount: new Decimal(account.creditLimit.amount),
                            order: account.order,
                        } as AccountDTO;
                    })}
                idExtractor={account => account.publicId}
                highlightRowOnHover={false}
                formSupplier={account => (account ? ACCOUNT_FORM(currencies, account) : ACCOUNT_FORM(currencies))}
                entityDisplay={account => {
                    return (
                        <Stack
                            direction="row"
                            key={account.publicId}
                            width="100%"
                            justifyContent="space-between"
                            alignItems="flex-start"
                            gap={2}
                        >
                            <Stack direction="column" alignItems="flex-start" sx={{minWidth: 0}}>
                                <Typography variant="body1">
                                    <StandOutText standOutBy="bold">{account.name}</StandOutText>
                                </Typography>
                                <Stack direction="column">
                                    {account.bankAccount && (
                                        <Typography
                                            variant={'body2'}
                                            sx={{
                                                color: 'text.secondary',
                                            }}
                                        >
                                            Powiązane z kontem bankowym: {account.bankAccount.iban}
                                        </Typography>
                                    )}
                                    <FormattedMoneyText
                                        money={{
                                            amount: account.currentBalance,
                                            currency: account.currency,
                                        }}
                                        parenthesizeNegative
                                    >
                                        {formattedValue => <>Stan konta: {formattedValue}</>}
                                    </FormattedMoneyText>
                                    <Stack direction="row" flexWrap="wrap" gap={0.75} sx={{mt: 0.5}}>
                                        {account.creditLimitAmount.toNumber() > 0 && (
                                            <Chip
                                                size="small"
                                                variant="outlined"
                                                color="secondary"
                                                label={`Limit kredytowy: ${formatBalance(account.currency, account.creditLimitAmount)}`}
                                            />
                                        )}
                                        {!account.visible && (
                                            <Chip
                                                size="small"
                                                variant="outlined"
                                                color="warning"
                                                label="Ukryte z interfejsu"
                                            />
                                        )}
                                    </Stack>
                                </Stack>
                            </Stack>
                            <Stack direction="column" alignItems="flex-end" sx={{flexShrink: 0}}>
                                {account.bankAccount && (
                                    <Tooltip title="Odłącz konto bankowe">
                                        <IconButton
                                            size="small"
                                            aria-label={`Odłącz konto bankowe od ${account.name}`}
                                            onClick={event => {
                                                event.stopPropagation();
                                                setDeleteBankAccountAssignmentDialogOptions({account});
                                            }}
                                        >
                                            <LinkOffRoundedIcon fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                )}
                                {!account.bankAccount && notAssignedBankAccounts.length > 0 && (
                                    <PickBankAccountButton
                                        bankAccounts={notAssignedBankAccounts}
                                        onPick={bankAccount =>
                                            assignBankAccountToAccount(bankAccount.publicId, account.publicId)
                                        }
                                        onClose={() => {}}
                                        text={'Przypisz konto'}
                                    />
                                )}
                            </Stack>
                        </Stack>
                    );
                }}
                enableDndReorder={true}
                onReorder={event => reorderAccount(event.id, event.aboveId, event.belowId)}
            />
            {deleteBankAccountAssignmentDialogOptions.account && (
                <ConfirmationDialog
                    companionObject={deleteBankAccountAssignmentDialogOptions.account}
                    title="Odłączyć konto bankowe?"
                    message={
                        <>
                            Konto bankowe zostanie odłączone od{' '}
                            <strong>{deleteBankAccountAssignmentDialogOptions.account.name}</strong>. Samo konto i jego
                            transakcje nie zostaną usunięte.
                        </>
                    }
                    open={true}
                    tone="danger"
                    confirmLabel="Odłącz"
                    onConfirm={(entity: AccountDTO) => {
                        setDeleteBankAccountAssignmentDialogOptions({account: null});
                        return deleteBankAccountAssignment(entity.publicId);
                    }}
                    onCancel={() => {
                        setDeleteBankAccountAssignmentDialogOptions({account: null});
                        return Promise.resolve();
                    }}
                />
            )}
        </>
    );
}
