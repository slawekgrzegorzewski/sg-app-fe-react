import React, {JSX, useContext, useState} from "react";
import {useMutation, useQuery} from "@apollo/client/react";
import {
    BankTransactionsToImport,
    BankTransactionsToImportQuery,
    CreateExpense,
    CreateExpenseMutation,
    CreateIncome,
    CreateIncomeMutation,
    CreateTransfer,
    CreateTransferMutation,
    MutuallyCancel,
    MutuallyCancelMutation
} from "../types";
import Button from "@mui/material/Button";
import {
    GQLBankTransactionToImport,
    mapAccount,
    mapBankTransactionToImport,
    mapBillingCategory,
    mapPiggyBank
} from "./model/types";
import Typography from "@mui/material/Typography";
import {Dayjs} from "dayjs";
import Form from "../utils/forms/Form";
import {BillingElementDTO, CreateBillingElementForm} from "./CreateBillingElementForm";
import {ShowBackdropContext} from "../utils/DrawerAppBar";
import {TRANSFER_FORM_PROPERTIES, TransferDTO} from "./CreateTransferForm";
import ConfirmationDialog from "../utils/dialogs/ConfirmationDialog";
import {
    BankTransactionsToImportPicker,
    isBillingElementToCreate,
    isTransactionsToMutuallyCancel,
    isTransferToCreate
} from "./BankTransactionsToImportPicker";

export interface BankTransactionsImporterProps {
    onRefetch: () => Promise<void>
}

export function BankTransactionsImporter({onRefetch}: BankTransactionsImporterProps): JSX.Element {

    const {loading, error, data} = useQuery<BankTransactionsToImportQuery>(BankTransactionsToImport);
    const [showDialog, setShowDialog] = useState(false);
    const [selectedBankAccountTransactionsToImport, setSelectedBankAccountTransactionsToImport] = useState<GQLBankTransactionToImport[]>([]);
    const [createExpenseMutation] = useMutation<CreateExpenseMutation>(CreateExpense);
    const [createIncomeMutation] = useMutation<CreateIncomeMutation>(CreateIncome);
    const [createTransferMutation] = useMutation<CreateTransferMutation>(CreateTransfer);
    const [mutuallyCancelMutation] = useMutation<MutuallyCancelMutation>(MutuallyCancel);
    const [billingElementToCreate, setBillingElementToCreate] = useState<BillingElementDTO | null>(null);
    const [transferToCreate, setTransferToCreate] = useState<TransferDTO & { possibleDays: Dayjs[] } | null>(null);
    const [transactionsToMutuallyCancelPublicId, setTransactionsToMutuallyCancelPublicId] = useState<string[] | null>(null);
    const {setShowBackdrop} = useContext(ShowBackdropContext);
    const reset = () => {
        setShowDialog(false);
        setBillingElementToCreate(null);
        setTransferToCreate(null);
        setTransactionsToMutuallyCancelPublicId(null);
        setSelectedBankAccountTransactionsToImport([]);
    }

    function transactionsToImportButtonText(transactionsCount: number) {
        return transactionsCount === 1
            ? "1 transakcja do zaimportowania"
            : transactionsCount + " transakcji do zaimportowania";
    }

    if (loading || error || !data || data.bankTransactionsToImport.length <= 0) {
        return <></>
    } else {
        if (!showDialog) {
            return <Button
                onClick={() => setShowDialog(true)}>
                {transactionsToImportButtonText(data.bankTransactionsToImport.length)}
            </Button>;
        } else if (showDialog) {
            if (!billingElementToCreate && !transferToCreate && !transactionsToMutuallyCancelPublicId) {
                return <BankTransactionsToImportPicker
                    accounts={data.financeManagement.accounts.map(mapAccount)}
                    bankTransactions={data.bankTransactionsToImport.map(mapBankTransactionToImport)}
                    onClose={(pickOption) => {
                        setSelectedBankAccountTransactionsToImport(pickOption?.selectedBankTransactions || []);
                        if (pickOption && isBillingElementToCreate(pickOption.elementToCreate)) {
                            setBillingElementToCreate(pickOption.elementToCreate);
                        }
                        if (pickOption && isTransferToCreate(pickOption.elementToCreate)) {
                            setTransferToCreate(pickOption.elementToCreate);
                        }
                        if (pickOption && isTransactionsToMutuallyCancel(pickOption.elementToCreate)) {
                            setTransactionsToMutuallyCancelPublicId(pickOption.elementToCreate);
                        }
                    }}/>;
            } else if (billingElementToCreate) {
                return <CreateBillingElementForm
                    accounts={data.financeManagement.accounts.map(mapAccount)}
                    billingCategories={data.financeManagement.billingCategories.map(mapBillingCategory)}
                    piggyBanks={data.financeManagement.piggyBanks.map(mapPiggyBank)}
                    billingElementToCreate={billingElementToCreate}
                    onClose={(billingElementDTO) => {
                        if (!billingElementDTO) reset();
                        else {
                            const variables = {
                                variables: {
                                    accountPublicId: billingElementDTO.affectedAccountPublicId!,
                                    description: billingElementDTO.description!,
                                    amount: billingElementDTO.amount!,
                                    currency: data.financeManagement.accounts.map(mapAccount).find(account => account.publicId === billingElementDTO.affectedAccountPublicId!)!.currentBalance.currency.code,
                                    categoryPublicId: billingElementDTO.category!.publicId,
                                    date: billingElementDTO.date!.format("YYYY-MM-DD"),
                                    piggyBankPublicId: billingElementDTO.piggyBank?.publicId ? billingElementDTO.piggyBank!.publicId : null,
                                    bankTransactionPublicIds: selectedBankAccountTransactionsToImport.map(bankTransaction => bankTransaction.transactionPublicId)
                                }
                            };
                            setShowBackdrop(true);
                            (billingElementDTO.billingElementType === 'Income'
                                ? createIncomeMutation(variables)
                                : createExpenseMutation(variables))
                                .then(() => {
                                    reset();
                                    onRefetch();
                                })
                                .finally(() => setShowBackdrop(false));
                        }
                    }}/>;
            } else if (transferToCreate) {
                return <Form
                    onSave={(transferDTO) => {
                        const variables = {
                            variables: {
                                fromAccountPublicId: transferDTO.fromAccountPublicId!,
                                toAccountPublicId: transferDTO.toAccountPublicId!,
                                amount: transferDTO.amount!,
                                description: transferDTO.description!,
                                date: transferDTO.day!.format('YYYY-MM-DD'),
                                bankTransactionPublicIds: selectedBankAccountTransactionsToImport.map(bankTransaction => bankTransaction.transactionPublicId!),
                            }
                        };
                        setShowBackdrop(true);
                        createTransferMutation(variables)
                            .then(() => onRefetch())
                            .finally(() => setShowBackdrop(false));
                    }}
                    onCancel={reset}
                    {...TRANSFER_FORM_PROPERTIES(
                        transferToCreate,
                        data.financeManagement.accounts.map(mapAccount),
                        transferToCreate.possibleDays
                    )}
                />;
            } else if (transactionsToMutuallyCancelPublicId) {
                return <ConfirmationDialog companionObject={transactionsToMutuallyCancelPublicId}
                                           title={'Na pewno anulować wzajemnie zaznaczone transakcje?'}
                                           message={'Na pewno anulować wzajemnie zaznaczone transakcje?'}
                                           open={true}
                                           onConfirm={(entity: string[]) => {
                                               const variables = {
                                                   variables: {
                                                       transactionsPublicId: entity
                                                   }
                                               };
                                               setShowBackdrop(true);
                                               return mutuallyCancelMutation(variables)
                                                   .then(() => onRefetch())
                                                   .finally(() => setShowBackdrop(false));
                                           }}
                                           onCancel={() => {
                                               reset();
                                               return Promise.resolve();
                                           }}/>
            } else {
                return <Typography>WTF?</Typography>;
            }
        } else {
            return <Typography>WTF2?</Typography>;
        }
    }
}