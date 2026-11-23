import React, {useContext, useState} from 'react';
import {useMutation, useQuery} from '@apollo/client/react';
import {
    Alert,
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    MenuItem,
    Paper,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableFooter,
    TableRow,
    TextField,
    Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import dayjs from 'dayjs';
import Decimal from 'decimal.js';
import {
    AccountingDocumentFieldsFragment,
    AccountingDocumentInput,
    AccountingDocumentType,
    CounterpartyKind,
    CompanyAccounting as CompanyAccountingQuery,
    CompanyAccountingQuery as CompanyAccountingData,
    CompanyLedgerEntryInput,
    UpdateCompanyLedgerEntry,
    UpdateAccountingDocument,
    CompanyLedgerFieldsFragment,
    CreateAccountingDocument,
    CreateAccountingDocumentMutation,
    CreateCounterpartyFromDocument,
    CreateCounterpartyFromDocumentMutation,
    CreateCompanyLedgerEntry,
    CreateCompanyLedgerEntryMutation,
    LedgerColumn,
} from '../types';
import {MonthNavigation} from '../application/components/MonthNavigation';
import {AccountantSettingsContext} from '../application/components/dispatchers/AccountantDispatcher';
import {ErrorDisplay, LoadingIndicator} from '../application/components/QueryState';

const amount = (value: number) => value.toLocaleString(
    'pl-PL',
    {minimumFractionDigits: 2, maximumFractionDigits: 2});

function formatConversion(
    entry: CompanyLedgerFieldsFragment['entries'][number],
    currency: string) {
    if (entry.includedAmount == null) {
        return 'Wpis historyczny';
    }
    const original = `${amount(entry.includedAmount)} ${entry.accountingDocument.currency}`;
    if (entry.accountingDocument.currency === currency) {
        return original;
    }
    if (entry.exchangeRate == null) {
        return `${original} · kurs nieuzupełniony`;
    }
    const converted = new Decimal(entry.includedAmount).mul(entry.exchangeRate)
        .toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();
    return `${original} × ${entry.exchangeRate} = ${amount(converted)} ${currency}`;
}

const documentFields = [
    ['documentNumber', 'Numer dokumentu'],
    ['netAmount', 'Kwota netto'],
    ['vatAmount', 'Kwota VAT'],
    ['currency', 'Waluta dokumentu'],
    ['documentDate', 'Data dokumentu'],
    ['counterparty', 'Kontrahent'],
    ['counterpartyAddress', 'Adres kontrahenta'],
    ['counterpartyTaxId', 'NIP kontrahenta'],
    ['ksefNumber', 'Numer KSeF'],
    ['description', 'Opis'],
] as const;

const documentTypes = [
    [AccountingDocumentType.SalesVatInvoice, 'Faktura VAT sprzedaży'],
    [AccountingDocumentType.PurchaseVatInvoice, 'Faktura VAT zakupu'],
    [AccountingDocumentType.Receipt, 'Paragon'],
    [AccountingDocumentType.Zus, 'ZUS'],
    [AccountingDocumentType.InsurancePolicy, 'Polisa'],
    [AccountingDocumentType.Other, 'Inny dokument'],
] as const;

const ledgerColumns = [
    [LedgerColumn.Sales, 'Sprzedaż towarów i usług'],
    [LedgerColumn.OtherIncome, 'Pozostałe przychody'],
    [LedgerColumn.GoodsAndMaterials, 'Zakup towarów i materiałów'],
    [LedgerColumn.PurchaseCosts, 'Koszty uboczne zakupu'],
    [LedgerColumn.Remuneration, 'Wynagrodzenia w gotówce i w naturze'],
    [LedgerColumn.OtherExpense, 'Pozostałe wydatki'],
] as const;

function isIncomeColumn(column?: LedgerColumn) {
    return column === LedgerColumn.Sales || column === LedgerColumn.OtherIncome;
}

function requiredCounterpartyKind(documentType?: AccountingDocumentType) {
    switch (documentType) {
        case AccountingDocumentType.SalesVatInvoice:
            return CounterpartyKind.Client;
        case AccountingDocumentType.PurchaseVatInvoice:
        case AccountingDocumentType.Zus:
        case AccountingDocumentType.InsurancePolicy:
            return CounterpartyKind.Supplier;
        default:
            return null;
    }
}

function defaultLedgerColumn(documentType?: AccountingDocumentType) {
    return documentType === AccountingDocumentType.SalesVatInvoice
        ? LedgerColumn.Sales
        : LedgerColumn.OtherExpense;
}

export function CompanyAccounting() {
    const {accountantSettings} = useContext(AccountantSettingsContext);
    const [month, setMonth] = useState(
        dayjs().format('YYYY-MM'));
    const [message, setMessage] = useState('');
    const [editingEntry, setEditingEntry] = useState<CompanyLedgerFieldsFragment['entries'][number] | null>(null);
    const [entryDraft, setEntryDraft] = useState<CompanyLedgerEntryInput | null>(null);
    const [selectedDocument, setSelectedDocument] = useState<AccountingDocumentFieldsFragment | null>(null);
    const [creating, setCreating] = useState(false);
    const [editingDocument, setEditingDocument] = useState<AccountingDocumentFieldsFragment | null>(null);
    const [draft, setDraft] = useState<AccountingDocumentInput | null>(null);
    const validMonth = /^\d{4}-(0[1-9]|1[0-2])$/.test(month);
    const {data, loading, error, refetch} = useQuery<CompanyAccountingData>(
        CompanyAccountingQuery,
        {
            variables: {yearMonth: month},
            skip: !accountantSettings.isCompany || !validMonth,
            fetchPolicy: 'network-only',
        });
    const [createEntry, entryState] = useMutation<CreateCompanyLedgerEntryMutation>(CreateCompanyLedgerEntry);
    const [updateEntry, updateState] = useMutation(UpdateCompanyLedgerEntry);
    const [createDocument, createState] = useMutation<CreateAccountingDocumentMutation>(CreateAccountingDocument);
    const [createCounterpartyFromDocument, fromDocumentState] = useMutation<CreateCounterpartyFromDocumentMutation>(CreateCounterpartyFromDocument);
    const [updateDocument, documentUpdateState] = useMutation(UpdateAccountingDocument);
    const busy = documentUpdateState.loading || updateState.loading || entryState.loading || createState.loading || fromDocumentState.loading;
    const [fromDocumentKind, setFromDocumentKind] = useState(CounterpartyKind.Supplier);
    const counterparties = data?.counterparties ?? [];
    const ledger = data?.companyLedger;
    const availableDocuments = data?.companyLedgerAvailableDocuments.filter(document => !document.postedToLedger) ?? [];
    const ledgerCurrency = ledger?.currency ?? 'PLN';
    const entryDocument = editingEntry?.accountingDocument ?? availableDocuments.find(
        document => document.publicId === entryDraft?.accountingDocumentPublicId);
    const documentAvailable = Boolean(entryDocument && (editingEntry || !entryDocument.postedToLedger));
    const sameCurrency = entryDocument?.currency === ledgerCurrency;
    const isIncomeEntry = isIncomeColumn(entryDraft?.ledgerColumn);
    const canChooseEntryDirection = entryDocument?.documentType !== AccountingDocumentType.SalesVatInvoice
        && entryDocument?.documentType !== AccountingDocumentType.PurchaseVatInvoice
        && entryDocument?.documentType !== AccountingDocumentType.Zus
        && entryDocument?.documentType !== AccountingDocumentType.InsurancePolicy;
    const availableLedgerColumns = ledgerColumns.filter(
        ([column]) => isIncomeColumn(column) === isIncomeEntry);
    const strategies = data?.ledgerCalculationStrategies ?? [];
    const entryStrategy = strategies.find(strategy => strategy.publicId === entryDraft?.calculationStrategyPublicId);
    const percentageParameters = entryStrategy?.parameters.__typename === 'NetAndVatPercentageParameters'
        ? entryStrategy.parameters
        : null;
    const documentAmountsKnown = entryDocument?.netAmount != null && entryDocument?.vatAmount != null;
    let includedAmount = '';
    let convertedAmount = '';
    let invalidAmountOverride = false;
    let deductibleVatAmount = '';
    let nonDeductibleVatAmount = '';
    let costBasis = '';
    if (entryDraft && percentageParameters && documentAmountsKnown && documentAvailable) {
        try {
            const net = new Decimal(entryDocument.netAmount!);
            const vat = new Decimal(entryDocument.vatAmount!);
            const deductibleVat = vat.mul(percentageParameters.deductibleVatPercentage)
                .div(100)
                .toDecimalPlaces(2, Decimal.ROUND_DOWN);
            const nonDeductibleVat = vat.minus(deductibleVat);
            const base = net.plus(nonDeductibleVat);
            deductibleVatAmount = deductibleVat.toFixed(2).replace('.', ',');
            nonDeductibleVatAmount = nonDeductibleVat.toFixed(2).replace('.', ',');
            costBasis = base.toFixed(2).replace('.', ',');
            includedAmount = base.mul(percentageParameters.costPercentage)
                .div(100)
                .toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
                .toFixed(2);
            const effectiveAmount = new Decimal(entryDraft.amountOverride ?? includedAmount);
            if (!effectiveAmount.isFinite() || effectiveAmount.decimalPlaces() > 2
                    || effectiveAmount.abs().gte('100000000000000000')) {
                invalidAmountOverride = entryDraft.amountOverride != null;
                throw new Error('Nieprawidłowa kwota');
            }
            const rate = new Decimal(sameCurrency ? '1' : entryDraft.exchangeRate);
            if (rate.lte(0) || rate.decimalPlaces() > 8) {
                throw new Error('Nieprawidłowy kurs');
            }
            convertedAmount = effectiveAmount.mul(rate).toFixed(2, Decimal.ROUND_HALF_UP).replace('.', ',');
        } catch {
            convertedAmount = '';
        }
    }

    async function handleCreateEntry(event: React.FormEvent) {
        event.preventDefault();
        if (!entryDraft || !entryStrategy || !convertedAmount || !documentAmountsKnown || !documentAvailable) {
            return;
        }
        const input = {
            ...entryDraft,
            ...(entryDraft.amountOverride != null
                ? {amountOverride: new Decimal(entryDraft.amountOverride).toFixed(2)}
                : {}),
            exchangeRate: sameCurrency ? '1' : entryDraft.exchangeRate,
            ...(isIncomeEntry ? {researchAndDevelopmentExpense: '0', researchAndDevelopmentDescription: ''} : {}),
        };
        try {
            if (editingEntry) {
                await updateEntry({variables: {publicId: editingEntry.publicId, input}});
            } else {
                await createEntry({variables: {input}});
            }
            setEntryDraft(null);
            setMessage(editingEntry ? 'Zapisano zmiany wpisu.' : 'Dodano wpis do księgi.');
            await refetch();
        } catch {
            setMessage('');
        }
    }

    function closeDocumentForm() {
        if (!busy) {
            setCreating(false);
            setSelectedDocument(editingDocument);
        }
    }

    async function handleCreate(event: React.FormEvent) {
        event.preventDefault();
        try {
            if (editingDocument) {
                await updateDocument({variables: {publicId: editingDocument.publicId, input: draft}});
            } else {
                await createDocument(
                        {variables: {input: draft}});
            }
            setMessage(editingDocument ? 'Zapisano zmiany dokumentu.' : 'Dodano dokument księgowy.');
            setCreating(false);
            await refetch();
        } catch {
            setMessage('');
        }
    }

    if (!accountantSettings.isCompany) {
        return <Alert severity="info">Aby korzystać z tej strony, włącz tryb firmowy w ustawieniach
            księgowości.</Alert>;
    }

    const columns = [
        ['providedGoodsAndServicesValue', 'Sprzedaż towarów i usług'],
        ['otherIncome', 'Pozostałe przychody'],
        ['totalIncome', 'Razem przychody'],
        ['purchasedGoodsAndMaterialsValue', 'Zakup towarów i materiałów'],
        ['additionalCostOfPurchase', 'Koszty uboczne zakupu'],
        ['remunerationInCashOrInKind', 'Wynagrodzenia w gotówce i w naturze'],
        ['otherExpense', 'Pozostałe wydatki'],
        ['totalExpense', 'Razem wydatki'],
        ['additionalColumnValue', 'Kolumna dodatkowa'],
        ['researchAndDevelopmentExpense', 'Koszty działalności B+R'],
    ] as const;

    return (
        <Stack alignItems="center" sx={{width: '100%', px: {xs: 1, sm: 2}, py: 2}}>
            <Stack spacing={3} sx={{width: '100%', maxWidth: 960, minWidth: 0}}>
                <Typography variant="h3">Księgowość firmy</Typography>
                <Paper variant="outlined" sx={{p: {xs: 2, sm: 3}}}>
                    <Stack spacing={2}>
                        <Typography variant="h5" component="h2">Miesiąc księgowy</Typography>
                        <MonthNavigation
                            month={dayjs(`${month}-01`)}
                            disabled={busy}
                            onChange={selectedMonth => {
                                setMonth(selectedMonth.format('YYYY-MM'));
                                setMessage('');
                            }}
                        />
                        <Typography variant="body2" color="text.secondary">
                            Dokument może pozostać poza KPiR. Wpis księgi obejmuje wybraną część kwoty dokumentu,
                            przeliczoną na PLN.
                        </Typography>
                        <Button
                            variant="contained"
                            disabled={!validMonth || loading || Boolean(error) || busy || !availableDocuments.length || !strategies.length}
                            onClick={() => {
                                entryState.reset();
                                updateState.reset();
                                setEditingEntry(null);
                                setEntryDraft({
                                    accountingDocumentPublicId: availableDocuments[0]?.publicId ?? '',
                                    calculationStrategyPublicId: strategies[0]?.publicId ?? '',
                                    exchangeRate: availableDocuments[0]?.currency === ledgerCurrency ? '1' : '',
                                    ledgerColumn: defaultLedgerColumn(availableDocuments[0]?.documentType),
                                    ledgerMonth: month,
                                    entryDate: availableDocuments[0]?.documentDate ?? `${month}-01`,
                                    entryOrder: Math.max(0, ...(ledger?.entries.map(entry => entry.entryOrder) ?? [])) + 1,
                                    additionalColumnValue: '0',
                                    researchAndDevelopmentExpense: '0',
                                    researchAndDevelopmentDescription: '',
                                    comments: '',
                                });
                            }}
                        >
                            Dodaj wpis do księgi
                        </Button>
                        {!strategies.length && !loading && !error && <Alert severity="info">
                            Brak dostępnych strategii przeliczenia do KPiR. Dodanie wpisu wymaga konfiguracji strategii
                            przez administratora.
                        </Alert>}
                        {!availableDocuments.length && !loading && !error && (
                            <Typography color="text.secondary">Brak niezaksięgowanych dokumentów z tego lub wcześniejszych miesięcy.</Typography>
                        )}
                        {message && <Alert severity="success">{message}</Alert>}
                    </Stack>
                </Paper>
                {loading && <LoadingIndicator label="Ładowanie księgowości firmy…"/>}
                {error && (
                    <Stack spacing={1}>
                        <ErrorDisplay title="Nie udało się pobrać danych księgowości firmy" error={error}/>
                        <Button color="inherit" onClick={() => void refetch()}>
                            Ponów
                        </Button>
                    </Stack>
                )}
                <Paper variant="outlined" sx={{p: 2, minWidth: 0}}>
                    <Typography variant="h5" component="h2" sx={{mb: 2}}>
                        Księga przychodów i rozchodów ({ledger?.entries.length ?? 0})
                    </Typography>
                    {!ledger?.entries.length && (
                        <Typography color="text.secondary">
                            Brak wpisów w tym miesiącu. Dodaj wpis na podstawie dokumentu księgowego.
                        </Typography>
                    )}
                    {ledger && (
                        <TableContainer>
                            <Table size="small" aria-label="Księga przychodów i rozchodów">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Lp.</TableCell>
                                        <TableCell>Data zdarzenia</TableCell>
                                        <TableCell>Dokument</TableCell>
                                        <TableCell>Przeliczenie do PLN</TableCell>
                                        <TableCell>Kontrahent</TableCell>
                                        <TableCell>Opis</TableCell>
                                        {columns.map(
                                            ([key, label]) => (
                                                <TableCell key={key} align="right">
                                                    {label}
                                                </TableCell>
                                            ))}
                                        <TableCell>Opis kosztów B+R</TableCell>
                                        <TableCell>Uwagi</TableCell>
                                        <TableCell/>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {ledger.entries.map(
                                        entry => (
                                            <TableRow key={entry.publicId}>
                                                <TableCell>{entry.entryOrder}</TableCell>
                                                <TableCell sx={{whiteSpace: 'nowrap'}}>
                                                    {dayjs(entry.entryDate).format('DD.MM.YYYY')}
                                                </TableCell>
                                                <TableCell>
                                                    <Button
                                                        color="inherit"
                                                        onClick={() => setSelectedDocument(entry.accountingDocument)}
                                                    >
                                                        {entry.accountingDocument.documentNumber}
                                                    </Button>
                                                </TableCell>
                                                <TableCell sx={{whiteSpace: 'nowrap'}}>
                                                    {formatConversion(entry, ledgerCurrency)}
                                                </TableCell>
                                                <TableCell>
                                                    {entry.accountingDocument.counterparty ||
                                                        entry.accountingDocument.counterpartyTaxId ||
                                                        '—'}
                                                </TableCell>
                                                <TableCell>{entry.accountingDocument.description}</TableCell>
                                                {columns.map(
                                                    ([key]) => (
                                                        <TableCell
                                                            key={key}
                                                            align="right"
                                                            sx={{
                                                                whiteSpace: 'nowrap',
                                                                fontVariantNumeric: 'tabular-nums'
                                                            }}
                                                        >
                                                            {amount(
                                                                entry[key] ?? 0)}
                                                        </TableCell>
                                                    ))}
                                                <TableCell>{entry.researchAndDevelopmentDescription}</TableCell>
                                                <TableCell>{entry.comments}</TableCell>
                                                <TableCell>
                                                    <Button disabled={busy} onClick={() => {
                                                        entryState.reset();
                                                        updateState.reset();
                                                        setEditingEntry(entry);
                                                        setEntryDraft({
                                                            accountingDocumentPublicId: entry.accountingDocument.publicId,
                                                            calculationStrategyPublicId: strategies.some(strategy => strategy.publicId === entry.calculationStrategyPublicId)
                                                                    ? entry.calculationStrategyPublicId!
                                                                    : '',
                                                            amountOverride: entry.includedAmount == null ? null : String(entry.includedAmount),
                                                            exchangeRate: String(entry.exchangeRate ?? 1),
                                                            ledgerColumn: entry.ledgerColumn ?? defaultLedgerColumn(entry.accountingDocument.documentType),
                                                            ledgerMonth: month,
                                                            entryDate: entry.entryDate,
                                                            entryOrder: entry.entryOrder,
                                                            additionalColumnValue: String(entry.additionalColumnValue ?? 0),
                                                            researchAndDevelopmentExpense: String(entry.researchAndDevelopmentExpense ?? 0),
                                                            researchAndDevelopmentDescription: entry.researchAndDevelopmentDescription ?? '',
                                                            comments: entry.comments,
                                                        });
                                                    }}>Edytuj wpis</Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                </TableBody>
                                <TableFooter>
                                    {[
                                        {label: 'Podsumowanie miesiąca', values: ledger.monthSummary},
                                        {label: 'Podsumowanie od początku roku', values: ledger.yearToDateSummary},
                                    ].map(({label, values}) => values && (
                                        <TableRow
                                            key={label}
                                            sx={{bgcolor: 'action.hover', '& th, & td': {fontWeight: 700, color: 'text.primary'}}}
                                        >
                                            <TableCell component="th" scope="row" colSpan={6}>
                                                {label} (PLN)
                                            </TableCell>
                                            {columns.map(
                                                    ([key]) => (
                                                        <TableCell
                                                            key={key}
                                                            align="right"
                                                            sx={{whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums'}}
                                                        >
                                                            {amount(values[key])}
                                                        </TableCell>
                                                    ))}
                                            <TableCell colSpan={3}/>
                                        </TableRow>
                                    ))}
                                </TableFooter>
                            </Table>
                        </TableContainer>
                    )}
                </Paper>
                <Paper variant="outlined" sx={{p: 2}}>
                    <Stack spacing={2}>
                        <Typography variant="h5" component="h2">
                            Dokumenty księgowe ({data?.companyAccountingDocuments.length ?? 0})
                        </Typography>
                        <Button
                            color="inherit"
                            variant="outlined"
                            disabled={!validMonth}
                            onClick={() => {
                                createState.reset();
                                setDraft(
                                    {
                                        documentType: AccountingDocumentType.PurchaseVatInvoice,
                                        netAmount: '',
                                        vatAmount: '',
                                        currency: 'PLN',
                                        documentNumber: '',
                                        documentDate: `${month}-01`,
                                        counterparty: '',
                                        counterpartyAddress: '',
                                        counterpartyTaxId: '',
                                        ksefNumber: '',
                                        description: '',
                                    });
                                setEditingDocument(null);
                                createState.reset();
                                documentUpdateState.reset();
                                setCreating(true);
                            }}
                        >
                            Dodaj dokument księgowy
                        </Button>
                        {Boolean(data?.companyAccountingDocuments.length) && data?.companyAccountingDocuments.every(document => document.postedToLedger) && (
                            <Alert severity="info">Wszystkie dokumenty z tego miesiąca są już ujęte w KPiR.</Alert>
                        )}
                        {!data?.companyAccountingDocuments.length && (
                            <Typography color="text.secondary">Brak dokumentów księgowych w tym miesiącu.</Typography>
                        )}
                        {data?.companyAccountingDocuments.map(
                            document => (
                                <Box key={document.publicId} sx={{overflowWrap: 'anywhere'}}>
                                    <Button color="inherit" onClick={() => setSelectedDocument(document)}>
                                        {document.documentNumber}
                                    </Button>
                                    <Typography variant="body2">
                                        {documentTypes.find(([type]) => type === document.documentType)?.[1]}
                                        {' · Brutto: '}{document.amount == null ? 'Kwota nieuzupełniona' : amount(document.amount)}
                                        {' '}{document.currency} · {document.description}
                                        {document.postedToLedger && ' · Ujęty w KPiR'}
                                    </Typography>
                                </Box>
                            ))}
                    </Stack>
                </Paper>
            </Stack>
            <Dialog
                open={Boolean(selectedDocument)}
                onClose={() => setSelectedDocument(null)}
                fullWidth
                maxWidth="sm"
                aria-labelledby="accounting-document-title"
            >
                <DialogTitle id="accounting-document-title" sx={{pr: 7}}>
                    Dokument księgowy
                </DialogTitle>
                <IconButton
                    aria-label="Zamknij dokument"
                    onClick={() => setSelectedDocument(null)}
                    sx={{position: 'absolute', right: 8, top: 8}}
                >
                    <CloseIcon/>
                </IconButton>
                <DialogContent dividers>
                    <Stack spacing={2} sx={{overflowWrap: 'anywhere'}}>
                        {selectedDocument && (
                            <Typography>{documentTypes.find(([type]) => type === selectedDocument.documentType)?.[1]}</Typography>
                        )}
                        {selectedDocument && !selectedDocument.counterpartyPublicId && !requiredCounterpartyKind(selectedDocument.documentType) && (
                            <TextField id="document-counterparty-kind" label="Typ kontrahenta z dokumentu" select fullWidth disabled={busy} value={fromDocumentKind} onChange={event => setFromDocumentKind(event.target.value as CounterpartyKind)}>
                                <MenuItem value={CounterpartyKind.Client}>Klient</MenuItem>
                                <MenuItem value={CounterpartyKind.Supplier}>Dostawca</MenuItem>
                            </TextField>
                        )}
                        {selectedDocument && !selectedDocument.counterpartyPublicId && (
                            <Button disabled={busy || !selectedDocument.counterparty.trim()} onClick={async () => {
                                try {
                                    const result = await createCounterpartyFromDocument({variables: {documentPublicId: selectedDocument.publicId, kind: requiredCounterpartyKind(selectedDocument.documentType) ?? fromDocumentKind}});
                                    setSelectedDocument({...selectedDocument, counterpartyPublicId: result.data?.createCounterpartyFromDocument.publicId});
                                    await refetch();
                                } catch {
                                    return;
                                }
                            }}>Utwórz kontrahenta z dokumentu</Button>
                        )}
                        {selectedDocument?.counterpartyPublicId && <Alert severity="info">Dokument jest powiązany z kontrahentem. Zachowuje dane z momentu zapisu.</Alert>}
                        {fromDocumentState.error && <ErrorDisplay title="Nie udało się utworzyć kontrahenta" error={fromDocumentState.error}/>}
                        {selectedDocument &&
                            documentFields.map(
                                ([key, label]) => (
                                    <Box key={key}>
                                        <Typography variant="caption" color="text.secondary">
                                            {label}
                                        </Typography>
                                        <Typography>{selectedDocument[key] === '' ? '—' : selectedDocument[key] ?? '—'}</Typography>
                                    </Box>
                                ))}
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={() => {
                            if (!selectedDocument) {
                                return;
                            }
                            setEditingDocument(selectedDocument);
                            setDraft(
                                    {
                                        documentType: selectedDocument.documentType,
                                        counterpartyPublicId: selectedDocument.counterpartyPublicId ?? null,
                                        ...Object.fromEntries(
                                                documentFields.map(([key]) => [key, selectedDocument[key] ?? ''])),
                                    } as AccountingDocumentInput);
                            createState.reset();
                            documentUpdateState.reset();
                            setSelectedDocument(null);
                            setCreating(true);
                        }}
                    >
                        Edytuj dokument
                    </Button>
                    <Button color="inherit" onClick={() => setSelectedDocument(null)}>
                        Zamknij
                    </Button>
                </DialogActions>
            </Dialog>
            <Dialog
                open={Boolean(entryDraft)}
                onClose={() => !busy && setEntryDraft(null)}
                fullWidth
                maxWidth="sm"
                aria-labelledby="create-ledger-entry-title"
            >
                <Box component="form" onSubmit={event => void handleCreateEntry(event)}
                     sx={{display: 'flex', flexDirection: 'column', minHeight: 0}}>
                    <DialogTitle id="create-ledger-entry-title" sx={{pr: 7}}>{editingEntry ? 'Edytuj wpis KPiR' : 'Dodaj wpis do księgi'}</DialogTitle>
                    <IconButton aria-label="Zamknij formularz wpisu" disabled={busy} onClick={() => setEntryDraft(null)}
                                sx={{position: 'absolute', right: 8, top: 8}}>
                        <CloseIcon/>
                    </IconButton>
                    <DialogContent dividers>
                        {entryDraft && (
                            <Stack spacing={2}>
                                <TextField select id="ledger-document" label="Dokument księgowy" fullWidth required
                                           value={documentAvailable ? entryDraft.accountingDocumentPublicId : ''}
                                           disabled={busy || Boolean(editingEntry)}
                                           helperText={editingEntry
                                               ? 'Dokument przypisany do wpisu pozostaje bez zmian.'
                                               : 'Dokumenty z tego i wcześniejszych miesięcy, nieujęte w żadnej KPiR.'}
                                           onChange={event => {
                                               const document = availableDocuments.find(
                                                   candidate => candidate.publicId === event.target.value);
                                               setEntryDraft({
                                                   ...entryDraft,
                                                   accountingDocumentPublicId: event.target.value,
                                                   entryDate: document?.documentDate ?? entryDraft.entryDate,
                                                   amountOverride: null,
                                                   ledgerColumn: defaultLedgerColumn(document?.documentType),
                                                   researchAndDevelopmentExpense: '0',
                                                   researchAndDevelopmentDescription: '',
                                                   exchangeRate: document?.currency === ledgerCurrency ? '1' : '',
                                               });
                                           }}>
                                    {(editingEntry ? [editingEntry.accountingDocument] : availableDocuments).map(document => (
                                        <MenuItem key={document.publicId} value={document.publicId}>
                                            {document.documentNumber} · {dayjs(document.documentDate).format('DD.MM.YYYY')}
                                        </MenuItem>
                                    ))}
                                </TextField>
                                {editingEntry && <Alert severity="info">
                                    Edytujesz istniejący wpis. Obecna kwota jest zachowana jako kwota po nadpisaniu.
                                    Wyczyść ją, aby przeliczyć wpis według wybranej strategii.
                                </Alert>}
                                {entryDraft && !documentAvailable && (
                                    <Alert severity="warning">Ten dokument nie jest już dostępny do wpisu w KPiR. Wybierz inny
                                        dokument.</Alert>
                                )}
                                {canChooseEntryDirection && (
                                    <TextField
                                        select
                                        id="ledger-direction"
                                        label="Rodzaj wpisu"
                                        value={isIncomeEntry ? 'income' : 'expense'}
                                        disabled={busy}
                                        onChange={event => setEntryDraft(
                                            {
                                                ...entryDraft,
                                                ledgerColumn: event.target.value === 'income'
                                                    ? LedgerColumn.Sales
                                                    : LedgerColumn.OtherExpense,
                                                researchAndDevelopmentExpense: '0',
                                                researchAndDevelopmentDescription: '',
                                            })}
                                    >
                                        <MenuItem value="income">Przychód</MenuItem>
                                        <MenuItem value="expense">Wydatek</MenuItem>
                                    </TextField>
                                )}
                                <TextField
                                    select
                                    id="ledger-column"
                                    label="Kolumna KPiR"
                                    value={entryDraft.ledgerColumn}
                                    disabled={busy}
                                    onChange={event => setEntryDraft({
                                        ...entryDraft,
                                        ledgerColumn: event.target.value as LedgerColumn
                                    })}
                                >
                                    {availableLedgerColumns.map(([key, label]) => <MenuItem key={key}
                                                                                            value={key}>{label}</MenuItem>)}
                                </TextField>
                                <Typography>
                                    Netto: {entryDocument?.netAmount == null ? 'do uzupełnienia' : amount(entryDocument.netAmount)}
                                    {' · VAT: '}{entryDocument?.vatAmount == null ? 'do uzupełnienia' : amount(entryDocument.vatAmount)}
                                    {' · Brutto: '}{entryDocument?.amount == null ? 'do uzupełnienia' : amount(entryDocument.amount)} {entryDocument?.currency}
                                </Typography>
                                {!documentAmountsKnown && <Alert severity="warning">
                                    Dokument historyczny nie ma podziału na netto i VAT. Uzupełnij dane dokumentu przed
                                    utworzeniem wpisu.
                                </Alert>}
                                <TextField
                                    select
                                    id="ledger-strategy"
                                    label="Strategia przeliczenia"
                                    sx={{'& .MuiSelect-select': {whiteSpace: 'normal', overflowWrap: 'anywhere'}}}
                                    value={entryDraft.calculationStrategyPublicId}
                                    required
                                    disabled={busy}
                                    onChange={event => setEntryDraft({
                                        ...entryDraft,
                                        calculationStrategyPublicId: event.target.value,
                                        amountOverride: null,
                                    })}
                                >
                                    {strategies.map(strategy => <MenuItem key={strategy.publicId}
                                                                          value={strategy.publicId}
                                                                          sx={{
                                                                              whiteSpace: 'normal',
                                                                              overflowWrap: 'anywhere'
                                                                          }}>
                                        {strategy.name}
                                    </MenuItem>)}
                                </TextField>
                                {percentageParameters ? <>
                                    <Typography variant="body2" color="text.secondary">
                                        Koszt: {String(percentageParameters.costPercentage).replace('.', ',')}% ·
                                        Odliczenie
                                        VAT: {String(percentageParameters.deductibleVatPercentage).replace('.', ',')}%
                                    </Typography>
                                    {documentAmountsKnown && <>
                                        <Typography variant="body2" color="text.secondary">
                                            VAT do odliczenia: {deductibleVatAmount} {entryDocument?.currency}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            VAT nieodliczony: {nonDeductibleVatAmount} {entryDocument?.currency}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            Podstawa kosztu (netto + VAT
                                            nieodliczony): {costBasis} {entryDocument?.currency}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            Podstawa kosztu × procent kosztu / 100
                                            {includedAmount && ` = ${includedAmount.replace('.', ',')} ${entryDocument?.currency}`}
                                        </Typography>
                                    </>}
                                </> : <Alert severity="warning">Ten typ strategii nie jest obsługiwany przez
                                    formularz.</Alert>}
                                <TextField
                                    id="ledger-amount-override"
                                    label={`Kwota po nadpisaniu (${entryDocument?.currency ?? ''})`}
                                    type="number"
                                    fullWidth
                                    value={entryDraft.amountOverride ?? ''}
                                    disabled={busy || !documentAmountsKnown || !documentAvailable || !percentageParameters}
                                    error={invalidAmountOverride}
                                    slotProps={{htmlInput: {step: '0.01'}}}
                                    helperText={invalidAmountOverride
                                        ? 'Kwota może mieć maksymalnie 17 cyfr przed przecinkiem i 2 po przecinku.'
                                        : 'Puste pole przywraca wynik strategii. Kwota przed przeliczeniem na PLN.'}
                                    onChange={event => setEntryDraft(
                                        {...entryDraft, amountOverride: event.target.value || null})}
                                />
                                {!sameCurrency && <TextField
                                    id="ledger-exchange-rate"
                                    label={`Kurs do ${ledgerCurrency}`}
                                    type="number"
                                    value={entryDraft.exchangeRate}
                                    required
                                    disabled={busy}
                                    slotProps={{htmlInput: {step: '0.00000001', min: '0.00000001'}}}
                                    helperText={`Ile ${ledgerCurrency} za 1 ${entryDocument?.currency ?? 'jednostkę waluty dokumentu'}`}
                                    onChange={event => setEntryDraft({...entryDraft, exchangeRate: event.target.value})}
                                />}
                                <Alert severity="info">Kwota w wybranej kolumnie
                                    KPiR: {convertedAmount || '—'} {ledgerCurrency}</Alert>
                                <TextField
                                    id="ledger-date"
                                    label="Data zdarzenia"
                                    type="date"
                                    fullWidth
                                    required
                                    value={entryDraft.entryDate}
                                    disabled={busy}
                                    helperText="Data może pochodzić z wcześniejszego miesiąca. Wpis trafi do wybranej KPiR."
                                    sx={theme => ({colorScheme: theme.palette.mode})}
                                    slotProps={{
                                        inputLabel: {shrink: true},
                                        htmlInput: {max: dayjs(`${month}-01`).endOf('month').format('YYYY-MM-DD')},
                                    }}
                                    onChange={event => setEntryDraft(
                                            {...entryDraft, entryDate: event.target.value})}
                                />
                                <TextField id="ledger-order" label="Numer wpisu" type="number" fullWidth required
                                           value={entryDraft.entryOrder} disabled={busy}
                                           slotProps={{htmlInput: {min: 1, step: 1}}}
                                           onChange={event => setEntryDraft({
                                               ...entryDraft,
                                               entryOrder: Number(event.target.value)
                                           })}/>
                                {columns.filter(([key]) => key === 'additionalColumnValue'
                                    || (!isIncomeEntry && key === 'researchAndDevelopmentExpense')).map(([key, label]) => (
                                    <TextField key={key} id={`ledger-${key}`} label={label} type="number" required
                                               fullWidth
                                               value={String(entryDraft[key as keyof CompanyLedgerEntryInput])}
                                               disabled={busy}
                                               slotProps={{htmlInput: {step: '0.01'}}}
                                               onChange={event => setEntryDraft({
                                                   ...entryDraft,
                                                   [key]: event.target.value
                                               })}/>
                                ))}
                                {!isIncomeEntry &&
                                    <TextField id="ledger-rd-description" label="Opis kosztów B+R" fullWidth
                                               value={entryDraft.researchAndDevelopmentDescription} disabled={busy}
                                               onChange={event => setEntryDraft({
                                                   ...entryDraft,
                                                   researchAndDevelopmentDescription: event.target.value
                                               })}/>}
                                <TextField id="ledger-comments" label="Uwagi" fullWidth multiline
                                           value={entryDraft.comments} disabled={busy}
                                           onChange={event => setEntryDraft({
                                               ...entryDraft,
                                               comments: event.target.value
                                           })}/>
                                {(entryState.error || updateState.error) &&
                                    <ErrorDisplay title="Nie udało się zapisać wpisu do księgi"
                                                  error={(updateState.error ?? entryState.error)!}/>}
                            </Stack>
                        )}
                    </DialogContent>
                    <DialogActions>
                        <Button color="inherit" disabled={busy} onClick={() => setEntryDraft(null)}>Anuluj</Button>
                        <Button type="submit" variant="contained"
                                disabled={busy || !convertedAmount || !documentAmountsKnown || !documentAvailable}>{editingEntry ? 'Zapisz zmiany' : 'Zapisz wpis'}</Button>
                    </DialogActions>
                </Box>
            </Dialog>
            <Dialog
                open={creating}
                onClose={closeDocumentForm}
                fullWidth
                maxWidth="sm"
                aria-labelledby="create-accounting-document-title"
            >
                <Box component="form" onSubmit={event => void handleCreate(event)}
                     sx={{display: 'flex', flexDirection: 'column', minHeight: 0}}>
                    <DialogTitle id="create-accounting-document-title" sx={{pr: 7}}>
                        {editingDocument ? 'Edytuj dokument księgowy' : 'Dodaj dokument księgowy'}
                    </DialogTitle>
                    <IconButton
                        aria-label="Zamknij formularz"
                        disabled={busy}
                        onClick={closeDocumentForm}
                        sx={{position: 'absolute', right: 8, top: 8}}
                    >
                        <CloseIcon/>
                    </IconButton>
                    <DialogContent dividers>
                        <Stack spacing={2}>
                            {draft && (
                                <TextField
                                    select
                                    id="document-type"
                                    label="Rodzaj dokumentu"
                                    value={draft.documentType}
                                    disabled={busy || Boolean(editingDocument?.postedToLedger)}
                                    onChange={event => {
                                        const documentType = event.target.value as AccountingDocumentType;
                                        const kind = requiredCounterpartyKind(documentType);
                                        const selected = counterparties.find(item => item.publicId === draft.counterpartyPublicId);
                                        setDraft({...draft, documentType, counterpartyPublicId: kind && selected?.kind !== kind ? null : draft.counterpartyPublicId});
                                    }}
                                >
                                    {documentTypes.map(([key, label]) => <MenuItem key={key}
                                                                                   value={key}>{label}</MenuItem>)}
                                </TextField>
                            )}
                            {draft && <TextField select slotProps={{select: {displayEmpty: true}, inputLabel: {shrink: true}}} id="document-counterparty" label="Kontrahent z katalogu" fullWidth disabled={busy} value={draft.counterpartyPublicId ?? ''} helperText="Możesz wybrać kontrahenta lub wpisać dane ręcznie. Dane dokumentu pozostają edytowalne." onChange={event => {
                                const selected = counterparties.find(item => item.publicId === event.target.value);
                                setDraft({...draft, counterpartyPublicId: selected?.publicId ?? null,
                                    ...(selected ? {counterparty: selected.name, counterpartyAddress: selected.address, counterpartyTaxId: selected.taxId} : {})});
                            }}>
                                <MenuItem value="">Dane ręczne — bez kontrahenta w katalogu</MenuItem>
                                {counterparties.filter(item => (item.active || item.publicId === draft.counterpartyPublicId) && (!requiredCounterpartyKind(draft.documentType) || item.kind === requiredCounterpartyKind(draft.documentType))).map(item => <MenuItem key={item.publicId} value={item.publicId}>{item.name} · {item.kind === CounterpartyKind.Client ? 'Klient' : 'Dostawca'}{item.taxId ? ` · ${item.taxId}` : ''}</MenuItem>)}
                            </TextField>}
                            {draft &&
                                documentFields.map(
                                    ([key, label]) => (
                                        <TextField
                                            key={key}
                                            id={`accounting-document-${key}`}
                                            label={label}
                                            type={key === 'documentDate' ? 'date' : ['netAmount', 'vatAmount'].includes(key) ? 'number' : 'text'}
                                            sx={theme => ({colorScheme: theme.palette.mode})}
                                            value={draft[key]}
                                            required={['documentNumber', 'documentDate', 'netAmount', 'vatAmount', 'currency'].includes(key)}
                                            fullWidth
                                            disabled={busy || (key === 'currency' && Boolean(editingDocument?.postedToLedger))}
                                            slotProps={{
                                                inputLabel: {shrink: true},
                                                htmlInput: {
                                                    step: '0.01', ...(key === 'currency' ? {
                                                        pattern: '[A-Z]{3}',
                                                        maxLength: 3
                                                    } : {})
                                                }
                                            }}
                                            onChange={event =>
                                                setDraft(
                                                    current =>
                                                        current ? {
                                                            ...current,
                                                            [key]: key === 'currency' ? event.target.value.toUpperCase() : event.target.value
                                                        } : null)
                                            }
                                        />
                                    ))}
                            {editingDocument?.postedToLedger && (
                                <Alert severity="info">
                                    Dokument jest ujęty w KPiR. Edycja nie przelicza zapisanego wpisu.
                                    Aby zmienić rozliczenie, użyj „Edytuj wpis”. Rodzaj i waluta pozostają stałe.
                                </Alert>
                            )}
                            {(createState.error || documentUpdateState.error) && (
                                <ErrorDisplay title="Nie udało się zapisać dokumentu księgowego"
                                              error={documentUpdateState.error ?? createState.error!}/>
                            )}
                        </Stack>
                    </DialogContent>
                    <DialogActions>
                        <Button color="inherit" disabled={busy} onClick={closeDocumentForm}>
                            Anuluj
                        </Button>
                        <Button color="primary" type="submit" variant="contained" disabled={busy}>
                            {editingDocument ? 'Zapisz zmiany dokumentu' : 'Zapisz dokument'}
                        </Button>
                    </DialogActions>
                </Box>
            </Dialog>
        </Stack>
    );
}
