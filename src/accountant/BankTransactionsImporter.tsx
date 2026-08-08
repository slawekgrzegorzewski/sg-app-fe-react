import {ErrorDisplay} from '../application/components/QueryState';
import React, {JSX, useMemo, useState} from 'react';
import {useMutation, useQuery} from '@apollo/client/react';
import {
    Account,
    BankTransactionsToImport,
    BankTransactionsToImportQuery,
    BankTransactionToImport,
    BillingCategory,
    CreateExpense,
    CreateExpenseMutation,
    CreateIncome,
    CreateIncomeMutation,
    CreateTransfer,
    CreateTransferMutation,
    ImportBankTransactions,
    ImportBankTransactionsMutation,
    MutuallyCancel,
    MutuallyCancelMutation,
    PiggyBank,
} from '../types';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import {Dayjs} from 'dayjs';
import {BillingElementDTO, CreateBillingElementForm} from './CreateBillingElementForm';
import {CreateTransferForm, TransferDTO} from './CreateTransferForm';
import ConfirmationDialog from '../utils/dialogs/ConfirmationDialog';
import {
    BankTransactionsToImportPicker,
    isBillingElementToCreate,
    isCustomImport,
    isTransactionsToMutuallyCancel,
    isTransferToCreate,
} from './BankTransactionsToImportPicker';
import {CreateCustomImportForm} from './CreateCustomImportForm';
import {Dialog, DialogContent, useMediaQuery} from '@mui/material';
import {almostFullHeightDialog} from '../utils/theme/utils';

export interface BankTransactionsImporterProps {
    onRefetch: () => Promise<void>;
}

function currencyOfAccount(accounts: Account[], accountPublicId: string): string {
    const account = accounts.find(candidate => candidate.publicId === accountPublicId);
    if (!account) {
        throw new Error(`Nie można zaimportować: konto ${accountPublicId} nie jest dostępne.`);
    }
    return account.currentBalance.currency.code;
}

function billingElementVariables(
    billingElement: BillingElementDTO,
    accounts: Account[],
    bankTransactionPublicIds: string[]
) {
    return {
        accountPublicId: billingElement.affectedAccountPublicId!,
        description: billingElement.description!,
        amount: billingElement.amount!,
        currency: currencyOfAccount(accounts, billingElement.affectedAccountPublicId!),
        categoryPublicId: billingElement.category!.publicId,
        date: billingElement.date!.format('YYYY-MM-DD'),
        piggyBankPublicId: billingElement.piggyBank?.publicId ?? null,
        bankTransactionPublicIds: bankTransactionPublicIds,
    };
}

export function BankTransactionsImporter({onRefetch}: BankTransactionsImporterProps): JSX.Element {
    const isTouchDevice = useMediaQuery('(pointer: coarse)');
    const {loading, error, data} = useQuery<BankTransactionsToImportQuery>(BankTransactionsToImport);
    const [showDialog, setShowDialog] = useState(false);
    const [selectedBankAccountTransactionsToImport, setSelectedBankAccountTransactionsToImport] = useState<
        BankTransactionToImport[]
    >([]);
    const [createExpenseMutation] = useMutation<CreateExpenseMutation>(CreateExpense);
    const [createIncomeMutation] = useMutation<CreateIncomeMutation>(CreateIncome);
    const [createTransferMutation] = useMutation<CreateTransferMutation>(CreateTransfer);
    const [mutuallyCancelMutation] = useMutation<MutuallyCancelMutation>(MutuallyCancel);
    const [importBankTransactionsMutation] = useMutation<ImportBankTransactionsMutation>(ImportBankTransactions);
    const [billingElementToCreate, setBillingElementToCreate] = useState<BillingElementDTO | null>(null);
    const [transferToCreate, setTransferToCreate] = useState<(TransferDTO & {possibleDays: Dayjs[]}) | null>(null);
    const [transactionsToMutuallyCancelPublicId, setTransactionsToMutuallyCancelPublicId] = useState<string[] | null>(
        null
    );
    const [transactionsToCustomImport, setTransactionsToCustomImport] = useState<BankTransactionToImport[] | null>(
        null
    );

    const mappedAccounts = useMemo(() => (data?.financeManagement.accounts as Account[]) ?? [], [data]);

    const reset = () => {
        setShowDialog(false);
        setBillingElementToCreate(null);
        setTransferToCreate(null);
        setTransactionsToMutuallyCancelPublicId(null);
        setTransactionsToCustomImport(null);
        setSelectedBankAccountTransactionsToImport([]);
    };

    function transactionsToImportButtonText(transactionsCount: number) {
        return transactionsCount === 1
            ? '1 transakcja do zaimportowania'
            : transactionsCount + ' transakcji do zaimportowania';
    }

    if (error) {
        return <ErrorDisplay error={error} title={'Nie udało się sprawdzić transakcji do zaimportowania'} />;
    }
    if (loading || !data || data.bankTransactionsToImport.length <= 0) {
        return <></>;
    } else {
        if (!showDialog) {
            return (
                <Button sx={{alignSelf: 'center', mt: 2}} onClick={() => setShowDialog(true)}>
                    {transactionsToImportButtonText(data.bankTransactionsToImport.length)}
                </Button>
            );
        } else if (showDialog) {
            if (
                !billingElementToCreate &&
                !transferToCreate &&
                !transactionsToMutuallyCancelPublicId &&
                !transactionsToCustomImport
            ) {
                return (
                    <BankTransactionsToImportPicker
                        accounts={mappedAccounts}
                        bankTransactions={data.bankTransactionsToImport as BankTransactionToImport[]}
                        onClose={pickOption => {
                            setSelectedBankAccountTransactionsToImport(pickOption?.selectedBankTransactions || []);
                            if (pickOption) {
                                if (isBillingElementToCreate(pickOption.importDecision)) {
                                    setBillingElementToCreate(pickOption.importDecision.data);
                                } else if (isTransferToCreate(pickOption.importDecision)) {
                                    setTransferToCreate(pickOption.importDecision.data);
                                } else if (isTransactionsToMutuallyCancel(pickOption.importDecision)) {
                                    setTransactionsToMutuallyCancelPublicId(
                                        pickOption.selectedBankTransactions.map(t => t.transactionPublicId)
                                    );
                                } else if (isCustomImport(pickOption.importDecision)) {
                                    setTransactionsToCustomImport(pickOption.selectedBankTransactions);
                                }
                            } else {
                                setShowDialog(false);
                            }
                        }}
                    />
                );
            } else if (billingElementToCreate) {
                return (
                    <Dialog open={true} maxWidth={'lg'} fullWidth={false}>
                        <DialogContent>
                            <CreateBillingElementForm
                                accounts={mappedAccounts}
                                billingCategories={data.financeManagement.billingCategories as BillingCategory[]}
                                piggyBanks={data.financeManagement.piggyBanks as PiggyBank[]}
                                billingElementToCreate={billingElementToCreate}
                                onClose={billingElementDTO => {
                                    if (!billingElementDTO) reset();
                                    else {
                                        const variables = {
                                            variables: billingElementVariables(
                                                billingElementDTO,
                                                mappedAccounts,
                                                selectedBankAccountTransactionsToImport.map(
                                                    bankTransaction => bankTransaction.transactionPublicId
                                                )
                                            ),
                                        };
                                        (billingElementDTO.billingElementType === 'Income'
                                            ? createIncomeMutation(variables)
                                            : createExpenseMutation(variables)
                                        ).then(() => {
                                            reset();
                                            onRefetch();
                                        });
                                    }
                                }}
                            />
                        </DialogContent>
                    </Dialog>
                );
            } else if (transferToCreate) {
                return (
                    <Dialog open={true} maxWidth={'lg'} fullWidth={false}>
                        <DialogContent>
                            <CreateTransferForm
                                accounts={mappedAccounts}
                                transferToCreate={transferToCreate}
                                onClose={transferToCreate => {
                                    if (!transferToCreate) reset();
                                    else {
                                        const variables = {
                                            variables: {
                                                fromAccountPublicId: transferToCreate.fromAccountPublicId!,
                                                toAccountPublicId: transferToCreate.toAccountPublicId!,
                                                fromAmount: transferToCreate.fromAmount!,
                                                toAmount: transferToCreate.toAmount!,
                                                description: transferToCreate.description!,
                                                date: transferToCreate.day!.format('YYYY-MM-DD'),
                                                bankTransactionPublicIds: selectedBankAccountTransactionsToImport.map(
                                                    bankTransaction => bankTransaction.transactionPublicId!
                                                ),
                                            },
                                        };
                                        createTransferMutation(variables).then(() => onRefetch());
                                    }
                                }}
                            />
                        </DialogContent>
                    </Dialog>
                );
            } else if (transactionsToMutuallyCancelPublicId) {
                return (
                    <ConfirmationDialog
                        companionObject={transactionsToMutuallyCancelPublicId}
                        title={'Na pewno anulować wzajemnie zaznaczone transakcje?'}
                        message={'Na pewno anulować wzajemnie zaznaczone transakcje?'}
                        open={true}
                        onConfirm={(entity: string[]) => {
                            const variables = {
                                variables: {
                                    transactionsPublicId: entity,
                                },
                            };
                            return mutuallyCancelMutation(variables).then(() => onRefetch());
                        }}
                        onCancel={() => {
                            reset();
                            return Promise.resolve();
                        }}
                    />
                );
            } else if (transactionsToCustomImport) {
                return (
                    <Dialog
                        open={true}
                        fullScreen={isTouchDevice}
                        maxWidth={false}
                        sx={[
                            almostFullHeightDialog,
                            {
                                '& .MuiDialog-paper': {
                                    width: isTouchDevice ? '100%' : '800px',
                                    maxWidth: isTouchDevice ? '100%' : '800px',
                                },
                            },
                        ]}
                    >
                        <DialogContent>
                            <CreateCustomImportForm
                                accountsWithAssignedBankAccounts={mappedAccounts.filter(a => a.bankAccount)}
                                accountsWithoutAssignedBankAccounts={mappedAccounts.filter(a => !a.bankAccount)}
                                billingCategories={data.financeManagement.billingCategories as BillingCategory[]}
                                piggyBanks={data.financeManagement.piggyBanks as PiggyBank[]}
                                bankTransactions={transactionsToCustomImport}
                                onClose={customImportResult => {
                                    if (!customImportResult) reset();
                                    else {
                                        const variables = {
                                            variables: {
                                                bankTransactionPublicIds: selectedBankAccountTransactionsToImport.map(
                                                    bankTransaction => bankTransaction.transactionPublicId
                                                ),
                                                expenses: customImportResult.billingElements
                                                    .filter(
                                                        billingElementToCreate =>
                                                            billingElementToCreate.billingElementType === 'Expense'
                                                    )
                                                    .map(billingElementToCreate =>
                                                        billingElementVariables(
                                                            billingElementToCreate,
                                                            mappedAccounts,
                                                            selectedBankAccountTransactionsToImport.map(
                                                                bankTransaction => bankTransaction.transactionPublicId
                                                            )
                                                        )
                                                    ),
                                                incomes: customImportResult.billingElements
                                                    .filter(
                                                        billingElementToCreate =>
                                                            billingElementToCreate.billingElementType === 'Income'
                                                    )
                                                    .map(billingElementToCreate =>
                                                        billingElementVariables(
                                                            billingElementToCreate,
                                                            mappedAccounts,
                                                            selectedBankAccountTransactionsToImport.map(
                                                                bankTransaction => bankTransaction.transactionPublicId
                                                            )
                                                        )
                                                    ),
                                                transfers: customImportResult.transfers.map(transferToCreate => {
                                                    return {
                                                        fromAccountPublicId: transferToCreate.fromAccountPublicId!,
                                                        toAccountPublicId: transferToCreate.toAccountPublicId!,
                                                        fromAmount: transferToCreate.fromAmount!,
                                                        toAmount: transferToCreate.toAmount!,
                                                        description: transferToCreate.description!,
                                                        date: transferToCreate.day!.format('YYYY-MM-DD'),
                                                        bankTransactionPublicIds:
                                                            selectedBankAccountTransactionsToImport.map(
                                                                bankTransaction => bankTransaction.transactionPublicId!
                                                            ),
                                                    };
                                                }),
                                            },
                                        };
                                        importBankTransactionsMutation(variables).then(() => {
                                            reset();
                                            onRefetch();
                                        });
                                    }
                                }}
                            />
                        </DialogContent>
                    </Dialog>
                );
            } else {
                return <Typography>WTF?</Typography>;
            }
        } else {
            return <Typography>WTF2?</Typography>;
        }
    }
}
