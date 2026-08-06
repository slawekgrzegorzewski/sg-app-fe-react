import {clickableProps} from "../application/components/clickable";
import React, {JSX, useState} from "react";
import {BillingElementType} from "./model/types";
import {Dialog, DialogContent, DialogTitle, Stack} from "@mui/material";
import Typography from "@mui/material/Typography";
import Grid from "@mui/material/Grid";
import {formatCurrency, minDate, trimDateToDay} from "../utils/functions";
import dayjs, {Dayjs} from "dayjs";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";
import {ComparatorBuilder} from "../utils/comparator-builder";
import {DebugDisplayObject} from "../utils/DebugDisplayObject";
import Decimal from "decimal.js";
import {BillingElementDTO} from "./CreateBillingElementForm";
import {TransferDTO} from "./CreateTransferForm";
import {Account, BankTransactionToImport, CurrencyInfo, MonetaryAmount} from "../types";

type BillingElementImport = { importType: 'billingElement', data: BillingElementDTO };
type TransferImport = { importType: 'transfer', data: TransferDTO & { possibleDays: Dayjs[] } };
type MutuallyIgnoreImport = { importType: 'mutuallyIgnore' };
type CustomImport = { importType: 'custom' };
export type ImportDecision = BillingElementImport | TransferImport | MutuallyIgnoreImport | CustomImport

export type PickOption = {
    selectedBankTransactions: BankTransactionToImport[],
    importDecision: ImportDecision
}

export function isBillingElementToCreate(importDecision: ImportDecision): importDecision is BillingElementImport {
    return importDecision.importType === 'billingElement';
}

export function isTransferToCreate(importDecision: ImportDecision): importDecision is TransferImport {
    return importDecision.importType === 'transfer';
}

export function isTransactionsToMutuallyCancel(importDecision: ImportDecision): importDecision is MutuallyIgnoreImport {
    return importDecision.importType === 'mutuallyIgnore';
}

export function isCustomImport(importDecision: ImportDecision): importDecision is CustomImport {
    return importDecision.importType === 'custom';
}

export interface BankTransactionsToImportPickerProps {
    accounts: Account[];
    bankTransactions: BankTransactionToImport[];
    onClose: (pickOption: PickOption | null) => void;
}

export type BillingElementToImport = {
    description: string,
    amount: Decimal,
    currency: CurrencyInfo,
    accountPublicId: string,
    date: Dayjs,
};

export type TransferToImport = {
    description: string,
    currency: CurrencyInfo,
    possibleDates: Dayjs[],
    fromAccountPublicId?: string,
    fromCurrency?: CurrencyInfo,
    toAccountPublicId?: string,
    toCurrency?: CurrencyInfo,
    fromAccountDebit: Decimal,
    toAccountCredit: Decimal
};

export type TransactionsToIgnore = {
    balance: MonetaryAmount
};

export type ImportType = 'debit' | 'credit' | 'transfer' | 'ignore';

export type PossibleImports = Record<Extract<ImportType, 'debit' | 'credit'>, BillingElementToImport | null>
    & Record<Extract<ImportType, 'transfer'>, TransferToImport | null>
    & Record<Extract<ImportType, 'ignore'>, TransactionsToIgnore | null>;

function isValidTransfer(transfer: null) {
    let validTransfer = false;
    if (transfer !== 'not possible' && transfer !== null) {
        const transferToImport = transfer as TransferToImport;
        validTransfer = !transferToImport.fromAccountDebit?.isZero() && !transferToImport.toAccountCredit?.isZero() &&
            transferToImport.fromAccountDebit?.isPositive() && transferToImport.toAccountCredit?.isPositive() &&
            (
                transferToImport.fromCurrency?.code !== transferToImport.toCurrency?.code ||
                transferToImport.fromAccountDebit.equals(transferToImport.toAccountCredit)
            );
    }
    return validTransfer;
}

export function BankTransactionsToImportPicker({
                                                   accounts,
                                                   bankTransactions,
                                                   onClose
                                               }: BankTransactionsToImportPickerProps): JSX.Element {

    const [selectedBankAccountTransactionsToImport, setSelectedBankAccountTransactionsToImport] = useState<BankTransactionToImport[]>([]);
    const [possibleImports, setPossibleImports] = useState<PossibleImports>({
        debit: null,
        credit: null,
        transfer: null,
        ignore: null,
    });

    function onBankTransactionToImportClicked(accounts: Account[], bankTransactionToImport: BankTransactionToImport) {

        const addTransactionToBillingElement = (
            billingElementType: BillingElementType,
            billingElement: BillingElementToImport | "not possible" | null,
            transaction: BankTransactionToImport,
            currency: CurrencyInfo) => {
            if (billingElement === 'not possible') {
                return billingElement;
            }
            const transactionIsCredit = isCredit(transaction);
            const transactionIdDebit = isDebit(transaction);
            if (!transactionIsCredit && !transactionIdDebit) {
                return 'not possible';
            }
            const amount = transactionIsCredit
                ? (billingElementType === 'Income' ? transaction.credit : -transaction.credit)
                : (billingElementType === 'Expense' ? transaction.debit : -transaction.debit);
            const accountPublicId = transactionIdDebit ? transaction.sourceAccountPublicId : transaction.destinationAccountPublicId;
            if (!billingElement) {
                billingElement = {
                    accountPublicId: accountPublicId,
                    description: transaction.description,
                    amount: new Decimal(amount),
                    currency: currency,
                    date: dayjs(transaction.timeOfTransaction)
                } as BillingElementToImport;
            } else {
                if (billingElement.accountPublicId === accountPublicId) {
                    billingElement = {
                        accountPublicId: accountPublicId,
                        description: transaction.description + '\n' + billingElement.description,
                        amount: billingElement.amount.plus(new Decimal(amount)),
                        currency: billingElement.currency,
                        date: minDate([billingElement.date, dayjs(trimDateToDay(dayjs(transaction.timeOfTransaction)))])
                    } as BillingElementToImport;
                } else {
                    billingElement = "not possible";
                }
            }
            return billingElement;
        }

        const addTransactionToTransfer = (
            transfer: TransferToImport | "not possible" | null,
            transaction: BankTransactionToImport) => {

            if (transfer === 'not possible') {
                return transfer;
            }

            const fromCurrency = accounts
                .find(account => account.publicId === ((transfer as TransferToImport)?.fromAccountPublicId || transaction.sourceAccountPublicId))
                ?.currentBalance.currency;

            const toCurrency = accounts
                .find(account => account.publicId === ((transfer as TransferToImport)?.toAccountPublicId || transaction.destinationAccountPublicId))
                ?.currentBalance.currency;

            const transactionDate = dayjs(transaction.timeOfTransaction)
                .startOf('day')
                .add(12, 'hours');
            if (!transfer) {
                transfer = {
                    fromAccountPublicId: transaction.sourceAccountPublicId,
                    toAccountPublicId: transaction.destinationAccountPublicId,
                    description: transaction.description,
                    fromAccountDebit: new Decimal(transaction.debit),
                    fromCurrency: fromCurrency,
                    toAccountCredit: new Decimal(transaction.credit),
                    toCurrency: toCurrency,
                    possibleDates: [transactionDate]
                } as TransferToImport;
            } else {
                if ((!transfer.fromAccountPublicId || !transaction.sourceAccountPublicId || transfer.fromAccountPublicId === transaction.sourceAccountPublicId)
                    && (!transfer.toAccountPublicId || !transaction.destinationAccountPublicId || transfer.toAccountPublicId === transaction.destinationAccountPublicId)
                    && ((transfer.toAccountPublicId || transaction.sourceAccountPublicId) !== (transfer.fromAccountPublicId || transaction.sourceAccountPublicId))
                ) {
                    if (transfer.possibleDates.filter(date => date.isSame(transactionDate)).length === 0) {
                        transfer.possibleDates.push(transactionDate);
                    }
                    transfer = {
                        fromAccountPublicId: transfer.fromAccountPublicId || transaction.sourceAccountPublicId,
                        toAccountPublicId: transfer.toAccountPublicId || transaction.destinationAccountPublicId,
                        description: transaction.description + '\n' + transfer.description,
                        fromAccountDebit: new Decimal(transaction.debit).plus(transfer.fromAccountDebit),
                        fromCurrency: transfer.fromCurrency || fromCurrency,
                        toAccountCredit: new Decimal(transaction.credit).plus(transfer.toAccountCredit),
                        toCurrency: transfer.toCurrency || toCurrency,
                        possibleDates: transfer.possibleDates,
                    } as TransferToImport;
                } else {
                    transfer = "not possible";
                }
            }
            return transfer;
        }

        const addTransactionToIgnore = (ignore: TransactionsToIgnore | "not possible" | null, transaction: BankTransactionToImport) => {
            if (transaction.destinationAccountPublicId && transaction.sourceAccountPublicId) {
                ignore = "not possible";
            } else if (!transaction.destinationAccountPublicId && !transaction.sourceAccountPublicId) {
                ignore = "not possible";
            } else if (ignore !== "not possible") {
                const amount = transaction.destinationAccountPublicId ? transaction.credit : -transaction.debit;
                const currency = accounts
                    .filter(ba => ba.publicId === (transaction.destinationAccountPublicId || transaction.sourceAccountPublicId))
                    .map(ba => ba.currentBalance.currency)[0];
                if (!ignore) {
                    ignore = {
                        balance: {
                            amount: amount,
                            currency: {
                                code: currency.code,
                                description: currency.description,
                            }
                        },
                    };
                } else if (currency.code === ignore.balance.currency.code) {
                    ignore = {
                        balance: {
                            amount: ignore.balance.amount + amount,
                            currency: ignore.balance.currency,
                        }
                    }
                } else {
                    ignore = "not possible";
                }
            }
            return ignore;
        }

        const alreadySelected = selectedBankAccountTransactionsToImport
            .some(t => t.id === bankTransactionToImport.id);
        const newBankTransactionsToImport = alreadySelected
            ? selectedBankAccountTransactionsToImport.filter(t => t.id !== bankTransactionToImport.id)
            : [...selectedBankAccountTransactionsToImport, bankTransactionToImport];
        let income: BillingElementToImport | 'not possible' | null = null;
        let expense: BillingElementToImport | 'not possible' | null = null;
        let transfer: TransferToImport | 'not possible' | null = null;
        let ignore: TransactionsToIgnore | 'not possible' | null = null;

        newBankTransactionsToImport.forEach((transaction) => {
            const sourceAccount = transaction.sourceAccountPublicId ? findAccount(accounts, transaction.sourceAccountPublicId) : null;
            const destinationAccount = transaction.destinationAccountPublicId ? findAccount(accounts, transaction.destinationAccountPublicId) : null;
            const currency = isDebit(transaction)
                ? sourceAccount!.currentBalance.currency
                : destinationAccount!.currentBalance.currency;
            income = addTransactionToBillingElement('Income', income, transaction, currency);
            expense = addTransactionToBillingElement('Expense', expense, transaction, currency);
            transfer = addTransactionToTransfer(transfer, transaction);
            ignore = addTransactionToIgnore(ignore, transaction);
        })
        setSelectedBankAccountTransactionsToImport([...newBankTransactionsToImport]);
        setPossibleImports({
            credit: (income === "not possible" || income === null || (income as BillingElementToImport).amount.lessThanOrEqualTo(new Decimal(0))) ? null : income,
            debit: (expense === "not possible" || expense === null || (expense as BillingElementToImport).amount.lessThanOrEqualTo(new Decimal(0))) ? null : expense,
            transfer: isValidTransfer(transfer) ? transfer : null,
            ignore: (ignore === "not possible" || ignore === null || (ignore as TransactionsToIgnore).balance.amount !== 0) ? null : ignore,
        });
    }

    function isDebit(bankTransactionToImport: BankTransactionToImport) {
        return bankTransactionToImport.credit === 0 && bankTransactionToImport.debit > 0;
    }

    function isCredit(bankTransactionToImport: BankTransactionToImport) {
        return bankTransactionToImport.credit > 0 && bankTransactionToImport.debit === 0;
    }

    function findAccount(accounts: Account[], accountPublicId: string) {
        return accounts.find(account => accountPublicId === account.publicId);
    }

    return <Dialog onClose={() => onClose(null)}
                   open={true}
                   fullScreen={true}>
        <DialogTitle onClick={e => e.stopPropagation()}>
            <Stack direction={'row'} justifyContent={'space-between'}>
                <Typography variant={"h4"}>Wybierz transakcja do zaimportowania</Typography>
                <IconButton onClick={() => onClose(null)}>
                    <CloseIcon/>
                </IconButton>
            </Stack>
        </DialogTitle>
        <DialogContent onClick={e => e.stopPropagation()}>
            <Stack>
                {
                    ([...bankTransactions]
                        .sort(ComparatorBuilder.comparingByDate<BankTransactionToImport>(t => dayjs(t.timeOfTransaction).toDate()).build())
                        .map(bankTransactionToImport => {
                            const sourceAccount = findAccount(accounts, bankTransactionToImport.sourceAccountPublicId!);
                            const destinationAccount = findAccount(accounts, bankTransactionToImport.destinationAccountPublicId!);
                            const selected = !!selectedBankAccountTransactionsToImport
                                .find(t => t.id === bankTransactionToImport.id);
                            return (<Grid container
                                          key={bankTransactionToImport.id}
                                          role={'button'}
                                          tabIndex={0}
                                          aria-pressed={selected}
                                          aria-label={`Transakcja ${bankTransactionToImport.description}`}
                                          onKeyDown={event => {
                                              if (event.key === 'Enter' || event.key === ' ') {
                                                  event.preventDefault();
                                                  onBankTransactionToImportClicked(accounts, bankTransactionToImport);
                                              }
                                          }}
                                          sx={{
                                              padding: '3px',
                                              marginBottom: '20px',
                                              border: '1px solid gray',
                                              cursor: 'pointer',
                                              ...(selected
                                                  ? {
                                                      color: 'primary.contrastText',
                                                      backgroundColor: 'primary.main',
                                                  }
                                                  : {})
                                          }}
                                          onClick={() => onBankTransactionToImportClicked(accounts, bankTransactionToImport)}>
                                <Grid size={5}>
                                    <Typography>Od: {sourceAccount?.name}</Typography>
                                </Grid>
                                <Grid
                                    size={2}><Typography>{sourceAccount ? formatCurrency(sourceAccount.currentBalance.currency.code, bankTransactionToImport.debit) : ''}</Typography>
                                </Grid>
                                <Grid size={5}>
                                    <Typography>Data:</Typography>
                                </Grid>
                                <Grid size={5}>
                                    <Typography>Do: {destinationAccount?.name}</Typography>
                                </Grid>
                                <Grid size={2}>
                                    <Typography>{destinationAccount ? formatCurrency(destinationAccount.currentBalance.currency.code, bankTransactionToImport.credit) : ''}</Typography>
                                </Grid>
                                <Grid size={5}>
                                    <Typography>{dayjs(bankTransactionToImport.timeOfTransaction).locale('pl').format('DD MMMM')}</Typography>
                                </Grid>
                                <Grid size={12}>
                                    <Typography>{bankTransactionToImport.description}</Typography>
                                </Grid>
                            </Grid>);
                        }))
                }
                {
                    possibleImports.credit && <Stack direction={'column'}>
                        <Typography {...clickableProps(() => {
                            onClose({
                                selectedBankTransactions: selectedBankAccountTransactionsToImport,
                                importDecision: {
                                    importType: 'billingElement',
                                    data: {
                                        billingElementType: 'Income',
                                        publicId: '',
                                        affectedAccountPublicId: possibleImports.credit!.accountPublicId,
                                        amount: possibleImports.credit!.amount,
                                        category: null,
                                        date: possibleImports.credit!.date,
                                        description: possibleImports.credit!.description,
                                        piggyBank: null,
                                    }
                                }
                            })
                        })}>
                            Przychód
                        </Typography>
                        <DebugDisplayObject object={possibleImports.credit}/>
                    </Stack>
                }
                {
                    possibleImports.debit && <Stack direction={'column'}>
                        <Typography {...clickableProps(() => {
                            onClose({
                                selectedBankTransactions: selectedBankAccountTransactionsToImport,
                                importDecision: {
                                    importType: 'billingElement',
                                    data: {
                                        billingElementType: 'Expense',
                                        publicId: '',
                                        affectedAccountPublicId: possibleImports.debit!.accountPublicId,
                                        amount: possibleImports.debit!.amount,
                                        category: null,
                                        date: possibleImports.debit!.date,
                                        description: possibleImports.debit!.description,
                                        piggyBank: null,
                                    }
                                }
                            })
                        })}>
                            Wydatek
                        </Typography>
                        <DebugDisplayObject object={possibleImports.debit}/>
                    </Stack>
                }
                {
                    possibleImports.transfer &&
                    <Stack direction={'column'}>
                        <Typography {...clickableProps(() => {
                            onClose({
                                selectedBankTransactions: selectedBankAccountTransactionsToImport,
                                importDecision: {
                                    importType: 'transfer',
                                    data: {
                                        fromAccountPublicId: possibleImports.transfer!.fromAccountPublicId,
                                        toAccountPublicId: possibleImports.transfer!.toAccountPublicId,
                                        day: possibleImports.transfer!.possibleDates.length === 1 ? possibleImports.transfer!.possibleDates[0] : null,
                                        fromAmount: possibleImports.transfer!.fromAccountDebit,
                                        toAmount: possibleImports.transfer!.toAccountCredit,
                                        description: possibleImports.transfer!.description,
                                        possibleDays: possibleImports.transfer!.possibleDates,
                                    }
                                }
                            })
                        })}>
                            {possibleImports.transfer.fromCurrency!.code === possibleImports.transfer.toCurrency!.code ? 'Transfer bez wymiany walut' : 'Transfer z wymianą walut'}
                        </Typography>
                        <DebugDisplayObject object={possibleImports.transfer}/>
                    </Stack>
                }
                {
                    possibleImports.ignore && <Stack direction={'column'}>
                        <Typography {...clickableProps(() => {
                            onClose({
                                selectedBankTransactions: selectedBankAccountTransactionsToImport,
                                importDecision: {
                                    importType: 'mutuallyIgnore'
                                }
                            })
                        })}>
                            Wzajemnie ignoruj
                        </Typography>
                        <DebugDisplayObject object={possibleImports.ignore}/>
                    </Stack>
                }
                {
                    selectedBankAccountTransactionsToImport.length > 0 && <Stack direction={'column'}>
                        <Typography {...clickableProps(() => {
                            onClose({
                                selectedBankTransactions: selectedBankAccountTransactionsToImport,
                                importDecision: {importType: 'custom'}
                            })
                        })}>
                            Własny import
                        </Typography>
                    </Stack>
                }
            </Stack>
        </DialogContent>
    </Dialog>
}