import * as React from "react";
import {JSX, useState} from "react";
import {GQLAccount, GQLBankTransactionToImport, GQLBillingCategory, GQLPiggyBank} from "./model/types";
import {BillingElementDTO, CreateBillingElementForm} from "./CreateBillingElementForm";
import {CreateTransferForm, TransferDTO} from "./CreateTransferForm";
import {Button, Stack} from "@mui/material";
import Decimal from "decimal.js";
import {CustomImportSummary} from "./CustomImportSummary";
import Typography from "@mui/material/Typography";
import {formatCurrency} from "../utils/functions";

export type CustomImportResult = {
    billingElements: BillingElementDTO[];
    transfers: TransferDTO[];
}

export interface CreateCustomImportFormProps {
    accountsWithAssignedBankAccounts: GQLAccount[],
    accountsWithoutAssignedBankAccounts: GQLAccount[],
    billingCategories: GQLBillingCategory[];
    piggyBanks: GQLPiggyBank[];
    bankTransactions: GQLBankTransactionToImport[];
    onClose: (importResult: CustomImportResult | null) => void;
}

export function CreateCustomImportForm({
                                           accountsWithAssignedBankAccounts,
                                           accountsWithoutAssignedBankAccounts,
                                           billingCategories,
                                           piggyBanks,
                                           bankTransactions,
                                           onClose
                                       }: CreateCustomImportFormProps): JSX.Element {
    const accountsInvolvedInImportingTransactionPublicIds = new Set(bankTransactions.flatMap(bt => [bt.creditBankAccountPublicId, bt.debitBankAccountPublicId]));
    const accountsInvolvedInImportingTransactions = accountsWithAssignedBankAccounts.filter(account => accountsInvolvedInImportingTransactionPublicIds.has(account.bankAccount.publicId));
    const [billingElements, setBillingElements] = useState<BillingElementDTO[]>([]);
    const [editBillingElement, setEditBillingElement] = useState<BillingElementDTO | null>(null);
    const [transfers, setTransfers] = useState<TransferDTO[]>([]);
    const [editTransfer, setEditTransfer] = useState<TransferDTO | null>(null);
    const findAccount = (accountPublicId: string) => {
        let found = accountsWithAssignedBankAccounts.filter(account => account.publicId === accountPublicId);
        if (!found || found.length === 0)
            found = accountsWithoutAssignedBankAccounts.filter(account => account.publicId === accountPublicId);
        return found;
    }
    return <Stack direction={"column"} spacing={4} alignItems={"center"}>
        <CustomImportSummary accountsWithAssignedBankAccounts={accountsWithAssignedBankAccounts}
                             importingBankTransactions={bankTransactions}
                             billingElementsToCreate={billingElements}
                             transfersToCreate={transfers}/>
        <Typography>Elementy do stworzenia</Typography>
        {
            billingElements.map(be => <Stack direction={'row'}>
                {be.billingElementType === 'Expense' ? 'Wydatek' : 'Przychód'}
                {findAccount(be.affectedAccountPublicId).map(account => formatCurrency(account.currentBalance.currency.code, new Decimal(be.amount)))}
                <Button
                    onClick={() => setBillingElements([...billingElements.filter(billingElement => billingElement !== be)])}>usuń</Button>
            </Stack>)
        }
        {
            transfers.map(transfer => {
                const fromAccount = findAccount(transfer.fromAccountPublicId || '');
                const toAccount = findAccount(transfer.toAccountPublicId || '');
                let description = 'Transfer';
                if (fromAccount && toAccount && fromAccount.length > 0 && toAccount.length > 0)
                    description = 'Transfer z ' + fromAccount[0].name +
                        ' do ' + toAccount[0].name +
                        ': ' + formatCurrency(fromAccount[0].currentBalance.currency.code, new Decimal(transfer.amount));
                return <Stack direction={'row'}>
                    {description}
                    <Button
                        onClick={() => setTransfers([...transfers.filter(t => t !== transfer)])}>usuń</Button>
                </Stack>;
            })
        }
        {
            editBillingElement &&
            <CreateBillingElementForm accounts={accountsInvolvedInImportingTransactions}
                                      billingCategories={billingCategories}
                                      piggyBanks={piggyBanks}
                                      billingElementToCreate={editBillingElement}
                                      onClose={(be) => {
                                          if (be) {
                                              setBillingElements([be, ...billingElements.filter(billingElement => billingElement !== editBillingElement)]);
                                              setEditBillingElement(null);
                                          }
                                      }}/>
        }
        {
            editTransfer &&
            <CreateTransferForm
                accounts={[...accountsInvolvedInImportingTransactions, ...accountsWithoutAssignedBankAccounts]}
                transferToCreate={{...editTransfer, possibleDays: []}}
                onClose={(transfer) => {
                    if (transfer) {
                        setTransfers([transfer, ...transfers.filter(t => t !== editTransfer)]);
                        setEditTransfer(null);
                    }
                }}/>
        }
        {
            !editBillingElement && !editTransfer &&
            <Stack direction={"row"} spacing={4} alignItems={"center"} justifyContent={"space-evenly"}>
                <Button variant="text"
                        type="submit"
                        sx={{flexGrow: 1}}
                        onClick={e => {
                            const be = {
                                billingElementType: 'Expense',
                                publicId: '',
                                affectedAccountPublicId: '',
                                amount: new Decimal(0),
                                category: null,
                                date: null,
                                description: '',
                                piggyBank: null,
                            } as BillingElementDTO;
                            setBillingElements([be, ...billingElements]);
                            setEditBillingElement(be);
                        }}>
                    Dodaj wydatek
                </Button>
                <Button variant="text"
                        type="submit"
                        sx={{flexGrow: 1}}
                        onClick={e => {
                            const transfer = {
                                day: null,
                                amount: new Decimal(0),
                                description: ''
                            } as TransferDTO;
                            setTransfers([transfer, ...transfers]);
                            setEditTransfer(transfer);
                        }}>
                    Dodaj transfer
                </Button>
            </Stack>
        }

        <Stack direction={"row"} spacing={4} alignItems={"center"} justifyContent={"space-evenly"}>
            <Button variant="text"
                    type="submit"
                    sx={{flexGrow: 1}}
                    onClick={e => onClose({
                        billingElements: billingElements,
                        transfers: transfers
                    })}>
                Potwierdź
            </Button>
            <Button
                variant="text" sx={{flexGrow: 1}}
                onClick={(e) => onClose(null)}>
                Anuluj
            </Button>
        </Stack>
    </Stack>
        ;
}