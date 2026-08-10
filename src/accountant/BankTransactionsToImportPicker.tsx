import React, {JSX, useState} from 'react';
import {BillingElementType} from './model/BillingElementType';
import {
    Box,
    Button,
    ButtonBase,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Paper,
    Stack,
    useMediaQuery,
} from '@mui/material';
import Typography from '@mui/material/Typography';
import {minDate, trimDateToDay} from '../utils/functions';
import dayjs, {Dayjs} from 'dayjs';
import 'dayjs/locale/pl';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import {ComparatorBuilder} from '../utils/comparator-builder';
import Decimal from 'decimal.js';
import {BillingElementDTO} from './CreateBillingElementForm';
import {TransferDTO} from './CreateTransferForm';
import {Account, BankTransactionToImport, CurrencyInfo, MonetaryAmount} from '../types';
import {almostFullHeightDialog} from '../utils/theme/utils';
import {FormattedMoneyText} from '../application/components/FormattedMoneyText';
import {StandOutText} from '../application/components/StandOutText';

type BillingElementImport = {importType: 'billingElement'; data: BillingElementDTO};
type TransferImport = {importType: 'transfer'; data: TransferDTO & {possibleDays: Dayjs[]}};
type MutuallyIgnoreImport = {importType: 'mutuallyIgnore'};
type CustomImport = {importType: 'custom'};
export type ImportDecision = BillingElementImport | TransferImport | MutuallyIgnoreImport | CustomImport;

export type PickOption = {
    selectedBankTransactions: BankTransactionToImport[];
    importDecision: ImportDecision;
};

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
    description: string;
    amount: Decimal;
    currency: CurrencyInfo;
    accountPublicId: string;
    date: Dayjs;
};

export type TransferToImport = {
    description: string;
    currency: CurrencyInfo;
    possibleDates: Dayjs[];
    fromAccountPublicId?: string;
    fromCurrency?: CurrencyInfo;
    toAccountPublicId?: string;
    toCurrency?: CurrencyInfo;
    fromAccountDebit: Decimal;
    toAccountCredit: Decimal;
};

export type TransactionsToIgnore = {
    balance: MonetaryAmount;
};

export type ImportType = 'debit' | 'credit' | 'transfer' | 'ignore';

export type PossibleImports = Record<Extract<ImportType, 'debit' | 'credit'>, BillingElementToImport | null> &
    Record<Extract<ImportType, 'transfer'>, TransferToImport | null> &
    Record<Extract<ImportType, 'ignore'>, TransactionsToIgnore | null>;

function isValidTransfer(transfer: null) {
    let validTransfer = false;
    if (transfer !== 'not possible' && transfer !== null) {
        const transferToImport = transfer as TransferToImport;
        validTransfer =
            !transferToImport.fromAccountDebit?.isZero() &&
            !transferToImport.toAccountCredit?.isZero() &&
            transferToImport.fromAccountDebit?.isPositive() &&
            transferToImport.toAccountCredit?.isPositive() &&
            (transferToImport.fromCurrency?.code !== transferToImport.toCurrency?.code ||
                transferToImport.fromAccountDebit.equals(transferToImport.toAccountCredit));
    }
    return validTransfer;
}

export function BankTransactionsToImportPicker({
    accounts,
    bankTransactions,
    onClose,
}: BankTransactionsToImportPickerProps): JSX.Element {
    const [selectedBankAccountTransactionsToImport, setSelectedBankAccountTransactionsToImport] = useState<
        BankTransactionToImport[]
    >([]);
    const isTouchDevice = useMediaQuery('(pointer: coarse)');
    const [possibleImports, setPossibleImports] = useState<PossibleImports>({
        debit: null,
        credit: null,
        transfer: null,
        ignore: null,
    });

    function onBankTransactionToImportClicked(accounts: Account[], bankTransactionToImport: BankTransactionToImport) {
        const addTransactionToBillingElement = (
            billingElementType: BillingElementType,
            billingElement: BillingElementToImport | 'not possible' | null,
            transaction: BankTransactionToImport,
            currency: CurrencyInfo
        ) => {
            if (billingElement === 'not possible') {
                return billingElement;
            }
            const transactionIsCredit = isCredit(transaction);
            const transactionIdDebit = isDebit(transaction);
            if (!transactionIsCredit && !transactionIdDebit) {
                return 'not possible';
            }
            const amount = transactionIsCredit
                ? billingElementType === 'Income'
                    ? transaction.credit
                    : -transaction.credit
                : billingElementType === 'Expense'
                  ? transaction.debit
                  : -transaction.debit;
            const accountPublicId = transactionIdDebit
                ? transaction.sourceAccountPublicId
                : transaction.destinationAccountPublicId;
            if (!billingElement) {
                billingElement = {
                    accountPublicId: accountPublicId,
                    description: transaction.description,
                    amount: new Decimal(amount),
                    currency: currency,
                    date: dayjs(transaction.timeOfTransaction),
                } as BillingElementToImport;
            } else {
                if (billingElement.accountPublicId === accountPublicId) {
                    billingElement = {
                        accountPublicId: accountPublicId,
                        description: transaction.description + '\n' + billingElement.description,
                        amount: billingElement.amount.plus(new Decimal(amount)),
                        currency: billingElement.currency,
                        date: minDate([
                            billingElement.date,
                            dayjs(trimDateToDay(dayjs(transaction.timeOfTransaction))),
                        ]),
                    } as BillingElementToImport;
                } else {
                    billingElement = 'not possible';
                }
            }
            return billingElement;
        };

        const addTransactionToTransfer = (
            transfer: TransferToImport | 'not possible' | null,
            transaction: BankTransactionToImport
        ) => {
            if (transfer === 'not possible') {
                return transfer;
            }

            const fromCurrency = accounts.find(
                account =>
                    account.publicId ===
                    ((transfer as TransferToImport)?.fromAccountPublicId || transaction.sourceAccountPublicId)
            )?.currentBalance.currency;

            const toCurrency = accounts.find(
                account =>
                    account.publicId ===
                    ((transfer as TransferToImport)?.toAccountPublicId || transaction.destinationAccountPublicId)
            )?.currentBalance.currency;

            const transactionDate = dayjs(transaction.timeOfTransaction).startOf('day').add(12, 'hours');
            if (!transfer) {
                transfer = {
                    fromAccountPublicId: transaction.sourceAccountPublicId,
                    toAccountPublicId: transaction.destinationAccountPublicId,
                    description: transaction.description,
                    fromAccountDebit: new Decimal(transaction.debit),
                    fromCurrency: fromCurrency,
                    toAccountCredit: new Decimal(transaction.credit),
                    toCurrency: toCurrency,
                    possibleDates: [transactionDate],
                } as TransferToImport;
            } else {
                if (
                    (!transfer.fromAccountPublicId ||
                        !transaction.sourceAccountPublicId ||
                        transfer.fromAccountPublicId === transaction.sourceAccountPublicId) &&
                    (!transfer.toAccountPublicId ||
                        !transaction.destinationAccountPublicId ||
                        transfer.toAccountPublicId === transaction.destinationAccountPublicId) &&
                    (transfer.toAccountPublicId || transaction.sourceAccountPublicId) !==
                        (transfer.fromAccountPublicId || transaction.sourceAccountPublicId)
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
                    transfer = 'not possible';
                }
            }
            return transfer;
        };

        const addTransactionToIgnore = (
            ignore: TransactionsToIgnore | 'not possible' | null,
            transaction: BankTransactionToImport
        ) => {
            if (transaction.destinationAccountPublicId && transaction.sourceAccountPublicId) {
                ignore = 'not possible';
            } else if (!transaction.destinationAccountPublicId && !transaction.sourceAccountPublicId) {
                ignore = 'not possible';
            } else if (ignore !== 'not possible') {
                const amount = transaction.destinationAccountPublicId ? transaction.credit : -transaction.debit;
                const currency = accounts
                    .filter(
                        ba =>
                            ba.publicId ===
                            (transaction.destinationAccountPublicId || transaction.sourceAccountPublicId)
                    )
                    .map(ba => ba.currentBalance.currency)[0];
                if (!ignore) {
                    ignore = {
                        balance: {
                            amount: amount,
                            currency: {
                                code: currency.code,
                                description: currency.description,
                            },
                        },
                    };
                } else if (currency.code === ignore.balance.currency.code) {
                    ignore = {
                        balance: {
                            amount: ignore.balance.amount + amount,
                            currency: ignore.balance.currency,
                        },
                    };
                } else {
                    ignore = 'not possible';
                }
            }
            return ignore;
        };

        const alreadySelected = selectedBankAccountTransactionsToImport.some(t => t.id === bankTransactionToImport.id);
        const newBankTransactionsToImport = alreadySelected
            ? selectedBankAccountTransactionsToImport.filter(t => t.id !== bankTransactionToImport.id)
            : [...selectedBankAccountTransactionsToImport, bankTransactionToImport];
        let income: BillingElementToImport | 'not possible' | null = null;
        let expense: BillingElementToImport | 'not possible' | null = null;
        let transfer: TransferToImport | 'not possible' | null = null;
        let ignore: TransactionsToIgnore | 'not possible' | null = null;

        newBankTransactionsToImport.forEach(transaction => {
            const sourceAccount = transaction.sourceAccountPublicId
                ? findAccount(accounts, transaction.sourceAccountPublicId)
                : null;
            const destinationAccount = transaction.destinationAccountPublicId
                ? findAccount(accounts, transaction.destinationAccountPublicId)
                : null;
            const currency = isDebit(transaction)
                ? sourceAccount!.currentBalance.currency
                : destinationAccount!.currentBalance.currency;
            income = addTransactionToBillingElement('Income', income, transaction, currency);
            expense = addTransactionToBillingElement('Expense', expense, transaction, currency);
            transfer = addTransactionToTransfer(transfer, transaction);
            ignore = addTransactionToIgnore(ignore, transaction);
        });
        setSelectedBankAccountTransactionsToImport([...newBankTransactionsToImport]);
        setPossibleImports({
            credit:
                income === 'not possible' ||
                income === null ||
                (income as BillingElementToImport).amount.lessThanOrEqualTo(new Decimal(0))
                    ? null
                    : income,
            debit:
                expense === 'not possible' ||
                expense === null ||
                (expense as BillingElementToImport).amount.lessThanOrEqualTo(new Decimal(0))
                    ? null
                    : expense,
            transfer: isValidTransfer(transfer) ? transfer : null,
            ignore:
                ignore === 'not possible' || ignore === null || (ignore as TransactionsToIgnore).balance.amount !== 0
                    ? null
                    : ignore,
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

    function pickBillingElement(billingElementType: BillingElementType, billingElement: BillingElementToImport) {
        onClose({
            selectedBankTransactions: selectedBankAccountTransactionsToImport,
            importDecision: {
                importType: 'billingElement',
                data: {
                    billingElementType,
                    publicId: '',
                    affectedAccountPublicId: billingElement.accountPublicId,
                    amount: billingElement.amount,
                    category: null,
                    date: billingElement.date,
                    description: billingElement.description,
                    piggyBank: null,
                },
            },
        });
    }

    function pickTransfer(transfer: TransferToImport) {
        onClose({
            selectedBankTransactions: selectedBankAccountTransactionsToImport,
            importDecision: {
                importType: 'transfer',
                data: {
                    fromAccountPublicId: transfer.fromAccountPublicId,
                    toAccountPublicId: transfer.toAccountPublicId,
                    day: transfer.possibleDates.length === 1 ? transfer.possibleDates[0] : null,
                    fromAmount: transfer.fromAccountDebit,
                    toAmount: transfer.toAccountCredit,
                    description: transfer.description,
                    possibleDays: transfer.possibleDates,
                },
            },
        });
    }

    const numberOfSelectedTransactions = selectedBankAccountTransactionsToImport.length;
    const actionButtonSx = {flex: {xs: '1 1 100%', sm: '0 1 auto'}};

    return (
        <Dialog
            onClose={() => onClose(null)}
            open={true}
            fullScreen={isTouchDevice}
            maxWidth={false}
            sx={[
                almostFullHeightDialog,
                {
                    '& .MuiDialog-paper': {
                        width: isTouchDevice ? '100%' : '960px',
                        maxWidth: isTouchDevice ? '100%' : '960px',
                    },
                },
            ]}
        >
            <DialogTitle
                onClick={e => e.stopPropagation()}
                sx={{
                    px: {xs: 2, sm: 3},
                    py: 2,
                }}
            >
                <Stack direction="row" alignItems="center" justifyContent="space-between" gap={2}>
                    <Typography variant="h4" component="span">
                        <StandOutText standOutBy="both">Import transakcji</StandOutText>
                    </Typography>
                    <IconButton aria-label="Zamknij" onClick={() => onClose(null)} edge="end">
                        <CloseIcon />
                    </IconButton>
                </Stack>
            </DialogTitle>
            <DialogContent dividers onClick={e => e.stopPropagation()} sx={{px: {xs: 1, sm: 2}, py: 2}}>
                <Stack
                    spacing={1.5}
                    sx={{
                        width: '100%',
                        maxWidth: 920,
                        mx: 'auto',
                    }}
                >
                    <Typography variant="body2" color="text.secondary">
                        Zaznacz transakcje, a następnie wybierz sposób ich zaksięgowania.
                    </Typography>

                    <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1}>
                        <Typography variant="h5">Transakcje</Typography>
                        <Chip
                            size="small"
                            variant="outlined"
                            color={numberOfSelectedTransactions > 0 ? 'success' : 'default'}
                            label={`Wybrano: ${numberOfSelectedTransactions} z ${bankTransactions.length}`}
                        />
                    </Stack>
                    {[...bankTransactions]
                        .sort(
                            ComparatorBuilder.comparingByDate<BankTransactionToImport>(t =>
                                dayjs(t.timeOfTransaction).toDate()
                            ).build()
                        )
                        .map(bankTransactionToImport => {
                            const sourceAccount = findAccount(accounts, bankTransactionToImport.sourceAccountPublicId!);
                            const destinationAccount = findAccount(
                                accounts,
                                bankTransactionToImport.destinationAccountPublicId!
                            );
                            const selected = !!selectedBankAccountTransactionsToImport.find(
                                t => t.id === bankTransactionToImport.id
                            );
                            return (
                                <Paper
                                    variant="outlined"
                                    key={bankTransactionToImport.id}
                                    sx={{
                                        overflow: 'hidden',
                                        borderColor: selected ? 'success.main' : 'divider',
                                        borderWidth: selected ? 2 : 1,
                                        bgcolor: selected ? 'action.selected' : 'background.paper',
                                    }}
                                >
                                    <ButtonBase
                                        aria-pressed={selected}
                                        aria-label={`Transakcja ${bankTransactionToImport.description}`}
                                        onClick={() =>
                                            onBankTransactionToImportClicked(accounts, bankTransactionToImport)
                                        }
                                        sx={{display: 'block', width: '100%', p: {xs: 1.5, sm: 2}, textAlign: 'left'}}
                                    >
                                        <Stack spacing={1.25}>
                                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                                                <Typography variant="body2" color="text.secondary">
                                                    {dayjs(bankTransactionToImport.timeOfTransaction)
                                                        .locale('pl')
                                                        .format('D MMMM YYYY')}
                                                </Typography>
                                                {selected && (
                                                    <Stack direction="row" alignItems="center" spacing={0.5}>
                                                        <CheckCircleIcon color="success" fontSize="small" />
                                                        <Typography variant="caption" color="success.main">
                                                            Wybrano
                                                        </Typography>
                                                    </Stack>
                                                )}
                                            </Stack>

                                            <Typography>{bankTransactionToImport.description}</Typography>

                                            <Stack direction={{xs: 'column', sm: 'row'}} spacing={1}>
                                                {sourceAccount && (
                                                    <Box sx={{flex: 1, p: 1, borderRadius: 1, bgcolor: 'action.hover'}}>
                                                        <Typography variant="caption" color="text.secondary">
                                                            Z konta
                                                        </Typography>
                                                        <Stack
                                                            direction="row"
                                                            justifyContent="space-between"
                                                            alignItems="baseline"
                                                            gap={1}
                                                        >
                                                            <Typography variant="body2">
                                                                {sourceAccount.name}
                                                            </Typography>
                                                            <FormattedMoneyText
                                                                money={{
                                                                    amount: -bankTransactionToImport.debit,
                                                                    currency:
                                                                        sourceAccount.currentBalance.currency.code,
                                                                }}
                                                                parenthesizeNegative
                                                            >
                                                                {formattedValue => <>{formattedValue}</>}
                                                            </FormattedMoneyText>
                                                        </Stack>
                                                    </Box>
                                                )}
                                                {destinationAccount && (
                                                    <Box sx={{flex: 1, p: 1, borderRadius: 1, bgcolor: 'action.hover'}}>
                                                        <Typography variant="caption" color="text.secondary">
                                                            Na konto
                                                        </Typography>
                                                        <Stack
                                                            direction="row"
                                                            justifyContent="space-between"
                                                            alignItems="baseline"
                                                            gap={1}
                                                        >
                                                            <Typography variant="body2">
                                                                {destinationAccount.name}
                                                            </Typography>
                                                            <FormattedMoneyText
                                                                money={{
                                                                    amount: bankTransactionToImport.credit,
                                                                    currency:
                                                                        destinationAccount.currentBalance.currency.code,
                                                                }}
                                                                parenthesizeNegative
                                                            >
                                                                {formattedValue => <>{formattedValue}</>}
                                                            </FormattedMoneyText>
                                                        </Stack>
                                                    </Box>
                                                )}
                                            </Stack>
                                        </Stack>
                                    </ButtonBase>
                                </Paper>
                            );
                        })}
                    {bankTransactions.length === 0 && (
                        <Paper variant="outlined" sx={{p: 4, textAlign: 'center'}}>
                            <Typography color="text.secondary">Brak transakcji do zaimportowania.</Typography>
                        </Paper>
                    )}
                </Stack>
            </DialogContent>
            <DialogActions
                sx={{
                    px: {xs: 1.5, sm: 3},
                    py: 2,
                    '& > :not(style) ~ :not(style)': {ml: 0},
                }}
            >
                <Stack spacing={1} sx={{width: '100%'}}>
                    <Typography variant="caption" color="text.secondary" textAlign="center">
                        {numberOfSelectedTransactions === 0
                            ? 'Zaznacz co najmniej jedną transakcję.'
                            : `Wybierz sposób importu dla ${numberOfSelectedTransactions} zaznaczonych transakcji.`}
                    </Typography>
                    <Stack direction="row" flexWrap="wrap" justifyContent="center" gap={1}>
                        {possibleImports.credit && (
                            <Button
                                color="success"
                                variant="contained"
                                sx={actionButtonSx}
                                onClick={() => pickBillingElement('Income', possibleImports.credit!)}
                            >
                                Utwórz dochód
                            </Button>
                        )}
                        {possibleImports.debit && (
                            <Button
                                color="error"
                                variant="contained"
                                sx={actionButtonSx}
                                onClick={() => pickBillingElement('Expense', possibleImports.debit!)}
                            >
                                Utwórz wydatek
                            </Button>
                        )}
                        {possibleImports.transfer && (
                            <Button
                                variant="contained"
                                sx={actionButtonSx}
                                onClick={() => pickTransfer(possibleImports.transfer!)}
                            >
                                {possibleImports.transfer.fromCurrency?.code ===
                                possibleImports.transfer.toCurrency?.code
                                    ? 'Utwórz transfer'
                                    : 'Transfer z wymianą walut'}
                            </Button>
                        )}
                        {possibleImports.ignore && (
                            <Button
                                color="warning"
                                variant="outlined"
                                sx={actionButtonSx}
                                onClick={() =>
                                    onClose({
                                        selectedBankTransactions: selectedBankAccountTransactionsToImport,
                                        importDecision: {importType: 'mutuallyIgnore'},
                                    })
                                }
                            >
                                Anuluj wzajemnie
                            </Button>
                        )}
                        {numberOfSelectedTransactions > 0 && (
                            <Button
                                color="secondary"
                                variant="outlined"
                                sx={actionButtonSx}
                                onClick={() =>
                                    onClose({
                                        selectedBankTransactions: selectedBankAccountTransactionsToImport,
                                        importDecision: {importType: 'custom'},
                                    })
                                }
                            >
                                Własny import
                            </Button>
                        )}
                    </Stack>
                </Stack>
            </DialogActions>
        </Dialog>
    );
}
