import * as React from 'react';
import {JSX, useMemo, useState} from 'react';
import {BillingElementDTO, CreateBillingElementForm} from './CreateBillingElementForm';
import {CreateTransferForm, TransferDTO} from './CreateTransferForm';
import {
    Alert,
    Button,
    ButtonBase,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    Paper,
    Stack,
    useMediaQuery,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import Decimal from 'decimal.js';
import {CustomImportSummary} from './CustomImportSummary';
import Typography from '@mui/material/Typography';
import {formatCurrency} from '../utils/functions';
import {transactionCustomImportSummary} from './utils/customImportSummary';
import {Account, BankTransactionToImport, BillingCategory, PiggyBank} from '../types';
import {almostFullHeightDialog} from '../utils/theme/utils';
import {StandOutText} from '../application/components/StandOutText';

export type CustomImportResult = {
    billingElements: BillingElementDTO[];
    transfers: TransferDTO[];
};

export interface CreateCustomImportFormProps {
    accountsWithAssignedBankAccounts: Account[];
    accountsWithoutAssignedBankAccounts: Account[];
    billingCategories: BillingCategory[];
    piggyBanks: PiggyBank[];
    bankTransactions: BankTransactionToImport[];
    onClose: (importResult: CustomImportResult | null) => void;
}

export function CreateCustomImportForm({
    accountsWithAssignedBankAccounts,
    accountsWithoutAssignedBankAccounts,
    billingCategories,
    piggyBanks,
    bankTransactions,
    onClose,
}: CreateCustomImportFormProps): JSX.Element {
    const isTouchDevice = useMediaQuery('(pointer: coarse)');
    const accountsInvolvedInImportingTransactionPublicIds = new Set(
        bankTransactions.flatMap(transaction => [
            transaction.creditBankAccountPublicId,
            transaction.debitBankAccountPublicId,
        ])
    );
    const accountsInvolvedInImportingTransactions = accountsWithAssignedBankAccounts.filter(
        account =>
            account.bankAccount && accountsInvolvedInImportingTransactionPublicIds.has(account.bankAccount.publicId)
    );
    const [billingElements, setBillingElements] = useState<BillingElementDTO[]>([]);
    const [editBillingElement, setEditBillingElement] = useState<BillingElementDTO | null>(null);
    const [transfers, setTransfers] = useState<TransferDTO[]>([]);
    const [editTransfer, setEditTransfer] = useState<TransferDTO | null>(null);
    const transactionToCustomImportSummaries = useMemo(
        () =>
            transactionCustomImportSummary(
                bankTransactions,
                accountsWithAssignedBankAccounts,
                billingElements,
                transfers
            ),
        [bankTransactions, accountsWithAssignedBankAccounts, billingElements, transfers]
    );
    const canCreateCustomImport =
        transactionToCustomImportSummaries.length > 0 &&
        transactionToCustomImportSummaries.every(summary => summary.balanceAfterImport.isZero());
    const numberOfElements = billingElements.length + transfers.length;

    const findAccount = (accountPublicId: string) => {
        const assignedAccounts = accountsWithAssignedBankAccounts.filter(
            account => account.publicId === accountPublicId
        );
        return assignedAccounts.length > 0
            ? assignedAccounts
            : accountsWithoutAssignedBankAccounts.filter(account => account.publicId === accountPublicId);
    };

    function transferDescription(transfer: TransferDTO) {
        const fromAccount = findAccount(transfer.fromAccountPublicId || '');
        const toAccount = findAccount(transfer.toAccountPublicId || '');
        return (
            <Typography>
                {fromAccount.length > 0 && toAccount.length > 0 ? (
                    <>
                        <StandOutText>
                            {formatCurrency(
                                fromAccount[0].currentBalance.currency.code,
                                new Decimal(transfer.fromAmount)
                            )}
                        </StandOutText>{' '}
                        z <StandOutText>{fromAccount[0].name}</StandOutText> na{' '}
                        <StandOutText>{toAccount[0].name}</StandOutText>
                    </>
                ) : (
                    'Uzupełnij dane transferu'
                )}
            </Typography>
        );
    }

    function billingElementDescription(billingElement: BillingElementDTO) {
        const affectedAccount = findAccount(billingElement.affectedAccountPublicId);
        return (
            <Typography>
                {affectedAccount.length > 0 ? (
                    <>
                        <StandOutText>
                            {formatCurrency(
                                affectedAccount[0].currentBalance.currency.code,
                                new Decimal(billingElement.amount)
                            )}
                        </StandOutText>
                        {billingElement.billingElementType === 'Expense' ? ' z ' : ' na '}
                        <StandOutText>{affectedAccount[0].name}</StandOutText>
                    </>
                ) : (
                    'Uzupełnij dane elementu'
                )}
            </Typography>
        );
    }

    function addBillingElement(billingElementType: 'Income' | 'Expense') {
        setEditBillingElement({
            billingElementType,
            publicId: '',
            affectedAccountPublicId: '',
            amount: new Decimal(0),
            category: null,
            date: null,
            description: '',
            piggyBank: null,
        });
    }

    function addTransfer() {
        setEditTransfer({
            day: null,
            fromAmount: new Decimal(0),
            toAmount: new Decimal(0),
            description: '',
        } as TransferDTO);
    }

    return (
        <>
            <DialogTitle sx={{px: {xs: 2, sm: 3}, py: 2}}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" gap={2}>
                    <Typography variant="h4" component="span">
                        <StandOutText standOutBy="both">Własny import</StandOutText>
                    </Typography>
                    <IconButton aria-label="Zamknij" onClick={() => onClose(null)} edge="end">
                        <CloseIcon />
                    </IconButton>
                </Stack>
            </DialogTitle>

            <DialogContent dividers sx={{px: {xs: 1, sm: 2}, py: 2}}>
                <Stack spacing={3} sx={{width: '100%', maxWidth: 920, mx: 'auto'}}>
                    <Typography variant="body2" color="text.secondary">
                        Rozpisz zaznaczone transakcje na dochody, wydatki i transfery.
                    </Typography>

                    <Stack spacing={1.5}>
                        <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1}>
                            <Typography variant="h5">Bilans importu</Typography>
                            <Chip
                                size="small"
                                variant="outlined"
                                color={canCreateCustomImport ? 'success' : 'warning'}
                                label={canCreateCustomImport ? 'Bilans poprawny' : 'Bilans wymaga uzupełnienia'}
                            />
                        </Stack>
                        <CustomImportSummary
                            accountsWithAssignedBankAccounts={accountsWithAssignedBankAccounts}
                            transactionToCustomImportSummaries={transactionToCustomImportSummaries}
                        />
                        {!canCreateCustomImport && (
                            <Alert severity="warning">
                                Dodaj elementy tak, aby saldo po imporcie dla każdego konta wynosiło zero.
                            </Alert>
                        )}
                    </Stack>

                    <Stack spacing={1.5}>
                        <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1}>
                            <Typography variant="h5">Elementy do utworzenia</Typography>
                            <Chip size="small" variant="outlined" label={`Liczba elementów: ${numberOfElements}`} />
                        </Stack>

                        {numberOfElements === 0 && (
                            <Paper variant="outlined" sx={{p: 3, textAlign: 'center'}}>
                                <Typography color="text.secondary">
                                    Nie dodano jeszcze żadnych elementów do utworzenia.
                                </Typography>
                            </Paper>
                        )}

                        {billingElements.map((billingElement, index) => (
                            <Paper variant="outlined" key={`billing-element-${index}`} sx={{overflow: 'hidden'}}>
                                <Stack direction="row" alignItems="stretch">
                                    <ButtonBase
                                        aria-label="Edytuj element rozliczeniowy"
                                        onClick={() => setEditBillingElement(billingElement)}
                                        sx={{flex: 1, justifyContent: 'flex-start', p: 1.5, textAlign: 'left'}}
                                    >
                                        <Stack
                                            direction={{xs: 'column', sm: 'row'}}
                                            alignItems={{xs: 'flex-start', sm: 'center'}}
                                            spacing={1}
                                        >
                                            <Chip
                                                size="small"
                                                variant="outlined"
                                                color={
                                                    billingElement.billingElementType === 'Income' ? 'success' : 'error'
                                                }
                                                label={
                                                    billingElement.billingElementType === 'Income'
                                                        ? 'Dochód'
                                                        : 'Wydatek'
                                                }
                                            />
                                            {billingElementDescription(billingElement)}
                                        </Stack>
                                    </ButtonBase>
                                    <IconButton
                                        aria-label="Usuń element rozliczeniowy"
                                        color="error"
                                        onClick={() =>
                                            setBillingElements(
                                                billingElements.filter(candidate => candidate !== billingElement)
                                            )
                                        }
                                        sx={{borderRadius: 0, px: 2}}
                                    >
                                        <DeleteOutlineIcon />
                                    </IconButton>
                                </Stack>
                            </Paper>
                        ))}

                        {transfers.map((transfer, index) => (
                            <Paper variant="outlined" key={`transfer-${index}`} sx={{overflow: 'hidden'}}>
                                <Stack direction="row" alignItems="stretch">
                                    <ButtonBase
                                        aria-label="Edytuj transfer"
                                        onClick={() => setEditTransfer(transfer)}
                                        sx={{flex: 1, justifyContent: 'flex-start', p: 1.5, textAlign: 'left'}}
                                    >
                                        <Stack
                                            direction={{xs: 'column', sm: 'row'}}
                                            alignItems={{xs: 'flex-start', sm: 'center'}}
                                            spacing={1}
                                        >
                                            <Chip size="small" variant="outlined" color="primary" label="Transfer" />
                                            {transferDescription(transfer)}
                                        </Stack>
                                    </ButtonBase>
                                    <IconButton
                                        aria-label="Usuń transfer"
                                        color="error"
                                        onClick={() =>
                                            setTransfers(transfers.filter(candidate => candidate !== transfer))
                                        }
                                        sx={{borderRadius: 0, px: 2}}
                                    >
                                        <DeleteOutlineIcon />
                                    </IconButton>
                                </Stack>
                            </Paper>
                        ))}

                        <Stack direction={{xs: 'column', sm: 'row'}} spacing={1}>
                            <Button
                                color="success"
                                variant="outlined"
                                startIcon={<AddCircleOutlineIcon />}
                                onClick={() => addBillingElement('Income')}
                                sx={{flex: 1}}
                            >
                                Dodaj dochód
                            </Button>
                            <Button
                                color="error"
                                variant="outlined"
                                startIcon={<AddCircleOutlineIcon />}
                                onClick={() => addBillingElement('Expense')}
                                sx={{flex: 1}}
                            >
                                Dodaj wydatek
                            </Button>
                            <Button
                                variant="outlined"
                                startIcon={<AddCircleOutlineIcon />}
                                onClick={addTransfer}
                                sx={{flex: 1}}
                            >
                                Dodaj transfer
                            </Button>
                        </Stack>
                    </Stack>
                </Stack>

                {editBillingElement && (
                    <Dialog
                        open
                        onClose={() => setEditBillingElement(null)}
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
                        <DialogTitle>
                            <Typography variant="h4" component="span">
                                <StandOutText standOutBy="both">
                                    {billingElements.includes(editBillingElement) ? 'Edytuj' : 'Dodaj'}{' '}
                                    {editBillingElement.billingElementType === 'Income' ? 'dochód' : 'wydatek'}
                                </StandOutText>
                            </Typography>
                        </DialogTitle>
                        <DialogContent dividers>
                            <Stack sx={{width: '100%', maxWidth: 640, mx: 'auto'}}>
                                <CreateBillingElementForm
                                    accounts={accountsInvolvedInImportingTransactions}
                                    billingCategories={billingCategories}
                                    piggyBanks={piggyBanks}
                                    billingElementToCreate={editBillingElement}
                                    onClose={billingElement => {
                                        if (billingElement) {
                                            setBillingElements([
                                                billingElement,
                                                ...billingElements.filter(
                                                    candidate => candidate !== editBillingElement
                                                ),
                                            ]);
                                        }
                                        setEditBillingElement(null);
                                    }}
                                    alwaysEditable
                                />
                            </Stack>
                        </DialogContent>
                    </Dialog>
                )}

                {editTransfer && (
                    <Dialog
                        open
                        onClose={() => setEditTransfer(null)}
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
                        <DialogTitle>
                            <Typography variant="h4" component="span">
                                <StandOutText standOutBy="both">
                                    {transfers.includes(editTransfer) ? 'Edytuj transfer' : 'Dodaj transfer'}
                                </StandOutText>
                            </Typography>
                        </DialogTitle>
                        <DialogContent dividers>
                            <Stack sx={{width: '100%', maxWidth: 640, mx: 'auto'}}>
                                <CreateTransferForm
                                    accounts={[
                                        ...accountsInvolvedInImportingTransactions,
                                        ...accountsWithoutAssignedBankAccounts,
                                    ]}
                                    transferToCreate={{
                                        ...editTransfer,
                                        possibleDays: editTransfer.day ? [editTransfer.day] : [],
                                    }}
                                    onClose={transfer => {
                                        if (transfer) {
                                            setTransfers([
                                                transfer,
                                                ...transfers.filter(candidate => candidate !== editTransfer),
                                            ]);
                                        }
                                        setEditTransfer(null);
                                    }}
                                    alwaysEditable
                                />
                            </Stack>
                        </DialogContent>
                    </Dialog>
                )}
            </DialogContent>

            <DialogActions sx={{px: {xs: 2, sm: 3}, py: 2, gap: 1}}>
                <Button onClick={() => onClose(null)}>Anuluj</Button>
                <Button
                    variant="contained"
                    disabled={!canCreateCustomImport}
                    onClick={() => onClose({billingElements, transfers})}
                >
                    Potwierdź import
                </Button>
            </DialogActions>
        </>
    );
}
