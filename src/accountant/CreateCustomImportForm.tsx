import * as React from "react";
import {JSX, useState} from "react";
import {GQLAccount, GQLBankTransactionToImport, GQLBillingCategory, GQLPiggyBank} from "./model/types";
import {BillingElementDTO, CreateBillingElementForm} from "./CreateBillingElementForm";
import {CreateTransferForm, TransferDTO} from "./CreateTransferForm";
import {Box, Button, Dialog, DialogContent, Stack} from "@mui/material";
import Decimal from "decimal.js";
import {CustomImportSummary} from "./CustomImportSummary";
import Typography from "@mui/material/Typography";
import {formatCurrency} from "../utils/functions";
import {transactionCustomImportSummary} from "./utils/customImportSummary";

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
    const transactionToCustomImportSummaries = transactionCustomImportSummary(bankTransactions, accountsWithAssignedBankAccounts, billingElements, transfers);
    const canCreateCustomImport = transactionToCustomImportSummaries.length > 0 &&
        transactionToCustomImportSummaries.map(t => t.balanceAfterImport.isZero()).reduce((p, c) => p && c, true);
    const findAccount = (accountPublicId: string) => {
        let found = accountsWithAssignedBankAccounts.filter(account => account.publicId === accountPublicId);
        if (!found || found.length === 0)
            found = accountsWithoutAssignedBankAccounts.filter(account => account.publicId === accountPublicId);
        return found;
    }

    function transferDescription(transfer: TransferDTO) {
        const fromAccount = findAccount(transfer.fromAccountPublicId || '');
        const toAccount = findAccount(transfer.toAccountPublicId || '');
        return <Typography>
            <span>Transfer </span>
            {(fromAccount && toAccount && fromAccount.length > 0 && toAccount.length > 0) && <>
                <Box component="span" sx={{fontWeight: 900}}>
                    {formatCurrency(fromAccount[0].currentBalance.currency.code, new Decimal(transfer.amount))}
                </Box>
                <span> z </span>
                <Box component="span" sx={{fontWeight: 900}}>
                    {fromAccount[0].name}
                </Box>
                <span> na </span>
                <Box component="span" sx={{fontWeight: 900}}>
                    {toAccount[0].name}
                </Box>
            </>}
        </Typography>;
    }

    function billingElementDescription(be: BillingElementDTO) {
        const affectedAccount = findAccount(be.affectedAccountPublicId);
        return <Typography>
            {(be.billingElementType === 'Expense' ? 'Wydatek ' : 'Przychód ')}
            <Box component="span" sx={{fontWeight: 900}}>
                {affectedAccount.map(account =>
                    formatCurrency(account.currentBalance.currency.code, new Decimal(be.amount))
                )}
            </Box>
            {(be.billingElementType === 'Expense' ? ' z ' : 'na ')}
            <Box component="span" sx={{fontWeight: 900}}>
                {affectedAccount.map(account => account.name)}
            </Box>
        </Typography>;
    }

    return <Stack direction={"column"} spacing={4} alignItems={"center"}>
        <CustomImportSummary accountsWithAssignedBankAccounts={accountsWithAssignedBankAccounts}
                             transactionToCustomImportSummaries={transactionToCustomImportSummaries}/>
        <Typography>Elementy do stworzenia</Typography>
        {
            billingElements.map(be => {
                    return <Stack direction={'row'} justifyContent={'flex-start'} alignItems={'center'} width={'100%'}
                                  onClick={() => {
                                      setEditBillingElement(be);
                                  }}>
                        {billingElementDescription(be)}
                        <Button
                            onClick={(e) => {
                                e.stopPropagation();
                                setBillingElements([...billingElements.filter(billingElement => billingElement !== be)]);
                            }}>
                            usuń
                        </Button>
                    </Stack>;
                }
            )
        }
        {
            transfers.map(transfer => {
                return <Stack direction={'row'} justifyContent={'flex-start'} alignItems={'center'} width={'100%'}
                              onClick={() => setEditTransfer(transfer)}>
                    {transferDescription(transfer)}
                    <Button
                        onClick={(e) => {
                            e.stopPropagation();
                            setTransfers([...transfers.filter(t => t !== transfer)]);
                        }}>
                        usuń
                    </Button>
                </Stack>;
            })
        }
        {
            editBillingElement &&
            <Dialog open={true} maxWidth={"lg"} fullWidth={false}>
                <DialogContent>
                    <CreateBillingElementForm accounts={accountsInvolvedInImportingTransactions}
                                              billingCategories={billingCategories}
                                              piggyBanks={piggyBanks}
                                              billingElementToCreate={editBillingElement}
                                              onClose={(be) => {
                                                  if (be) {
                                                      setBillingElements([be, ...billingElements.filter(billingElement => billingElement !== editBillingElement)]);
                                                  }
                                                  setEditBillingElement(null);
                                              }}
                                              alwaysEditable={true}/>
                </DialogContent>
            </Dialog>
        }
        {
            editTransfer &&
            <Dialog open={true} maxWidth={"lg"} fullWidth={false}>
                <DialogContent>
                    <CreateTransferForm
                        accounts={[...accountsInvolvedInImportingTransactions, ...accountsWithoutAssignedBankAccounts]}
                        transferToCreate={{...editTransfer, possibleDays: editTransfer.day ? [editTransfer.day] : []}}
                        onClose={(transfer) => {
                            if (transfer) {
                                setTransfers([transfer, ...transfers.filter(t => t !== editTransfer)]);
                                console.log(JSON.stringify(transfer));
                            }
                            setEditTransfer(null);
                        }}
                        alwaysEditable={true}/>
                </DialogContent>
            </Dialog>
        }
        {
            !editBillingElement && !editTransfer &&
            <Stack direction={"row"} spacing={4} alignItems={"center"} justifyContent={"space-evenly"}>
                <Button variant="text"
                        type="submit"
                        sx={{flexGrow: 1}}
                        onClick={e => {
                            const be = {
                                billingElementType: 'Income',
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
                    Dodaj przychód
                </Button>
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
                    })}
                    disabled={!canCreateCustomImport}
            >
                Potwierdź
            </Button>
            <Button
                variant="text" sx={{flexGrow: 1}}
                onClick={(e) => onClose(null)}>
                Anuluj
            </Button>
        </Stack>
    </Stack>;
}