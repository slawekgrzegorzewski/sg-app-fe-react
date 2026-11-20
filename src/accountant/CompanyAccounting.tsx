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
    TableRow,
    TextField,
    Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import dayjs from 'dayjs';
import {
    AccountingDocumentFieldsFragment,
    AccountingDocumentInput,
    CompanyAccounting as CompanyAccountingQuery,
    CompanyAccountingQuery as CompanyAccountingData,
    CompanyLedgerEntryInput,
    CreateAccountingDocument,
    CreateAccountingDocumentMutation,
    CreateCompanyLedgerEntry,
    CreateCompanyLedgerEntryMutation,
} from '../types';
import {AccountantSettingsContext} from '../application/components/dispatchers/AccountantDispatcher';
import {ErrorDisplay, LoadingIndicator} from '../application/components/QueryState';

const amount = (value: number) => value.toLocaleString(
    'pl-PL',
    {minimumFractionDigits: 2, maximumFractionDigits: 2});

const documentFields = [
    ['documentNumber', 'Document number'],
    ['documentDate', 'Document date'],
    ['counterparty', 'Counterparty'],
    ['counterpartyAddress', 'Counterparty address'],
    ['counterpartyTaxId', 'Counterparty tax ID'],
    ['ksefNumber', 'KSeF number'],
    ['description', 'Description'],
] as const;

export function CompanyAccounting() {
    const {accountantSettings} = useContext(AccountantSettingsContext);
    const [month, setMonth] = useState(
        dayjs().format('YYYY-MM'));
    const [message, setMessage] = useState('');
    const [entryDraft, setEntryDraft] = useState<CompanyLedgerEntryInput | null>(null);
    const [selectedDocument, setSelectedDocument] = useState<AccountingDocumentFieldsFragment | null>(null);
    const [creating, setCreating] = useState(false);
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
    const [createDocument, createState] = useMutation<CreateAccountingDocumentMutation>(CreateAccountingDocument);
    const busy = entryState.loading || createState.loading;
    const ledger = data?.companyLedger;

    async function handleCreateEntry(event: React.FormEvent) {
        event.preventDefault();
        try {
            await createEntry({variables: {input: entryDraft}});
            setEntryDraft(null);
            setMessage('Ledger entry created.');
            await refetch();
        } catch {
            setMessage('');
        }
    }

    async function handleCreate(event: React.FormEvent) {
        event.preventDefault();
        try {
            await createDocument(
                {variables: {input: draft}});
            setCreating(false);
            await refetch();
        } catch {
            setMessage('');
        }
    }

    if (!accountantSettings.isCompany) {
        return <Alert severity="info">Enable company accounting in Accountant settings to use this page.</Alert>;
    }

    const columns = [
        ['providedGoodsAndServicesValue', 'Sales of goods and services'],
        ['otherIncome', 'Other income'],
        ['totalIncome', 'Total income'],
        ['purchasedGoodsAndMaterialsValue', 'Goods and materials'],
        ['additionalCostOfPurchase', 'Purchase costs'],
        ['remunerationInCashOrInKind', 'Remuneration'],
        ['otherExpense', 'Other expenses'],
        ['totalExpense', 'Total expenses'],
        ['additionalColumnValue', 'Additional column'],
        ['researchAndDevelopmentExpense', 'Research and development'],
    ] as const;

    return (
        <Stack alignItems="center" sx={{width: '100%', px: {xs: 1, sm: 2}, py: 2}}>
            <Stack spacing={3} sx={{width: '100%', maxWidth: 960, minWidth: 0}}>
                <Typography variant="h3">Company accounting</Typography>
                <Paper variant="outlined" sx={{p: {xs: 2, sm: 3}}}>
                    <Stack spacing={2}>
                        <Typography variant="h5" component="h2">Accounting month</Typography>
                        <TextField
                            id="company-accounting-month"
                            label="Accounting month"
                            type="month"
                            value={month}
                            disabled={busy}
                            sx={theme => ({colorScheme: theme.palette.mode})}
                            onChange={event => {
                                setMonth(event.target.value);
                                setMessage('');
                            }}
                            slotProps={{inputLabel: {shrink: true}}}
                        />
                        <Typography variant="body2" color="text.secondary">
                            Create an accounting document, then add its amounts to the ledger. Amounts are in PLN.
                        </Typography>
                        <Button
                            variant="contained"
                            disabled={!validMonth || loading || Boolean(error) || busy || !data?.companyAccountingDocuments.length}
                            onClick={() => {
                                entryState.reset();
                                setEntryDraft({
                                    accountingDocumentPublicId: data?.companyAccountingDocuments[0]?.publicId ?? '',
                                    entryDate: `${month}-01`,
                                    entryOrder: Math.max(0, ...(ledger?.entries.map(entry => entry.entryOrder) ?? [])) + 1,
                                    providedGoodsAndServicesValue: '0',
                                    otherIncome: '0',
                                    purchasedGoodsAndMaterialsValue: '0',
                                    additionalCostOfPurchase: '0',
                                    remunerationInCashOrInKind: '0',
                                    otherExpense: '0',
                                    additionalColumnValue: '0',
                                    researchAndDevelopmentExpense: '0',
                                    researchAndDevelopmentDescription: '',
                                    comments: '',
                                });
                            }}
                        >
                            Add ledger entry
                        </Button>
                        {!data?.companyAccountingDocuments.length && !loading && !error && (
                            <Typography color="text.secondary">Create an accounting document below to add the first
                                entry.</Typography>
                        )}
                        {message && <Alert severity="success">{message}</Alert>}
                    </Stack>
                </Paper>
                {loading && <LoadingIndicator label="Loading company accounting…"/>}
                {error && (
                    <Stack spacing={1}>
                        <ErrorDisplay title="Company accounting error" error={error}/>
                        <Button color="inherit" onClick={() => void refetch()}>
                            Retry
                        </Button>
                    </Stack>
                )}
                <Paper variant="outlined" sx={{p: 2, minWidth: 0}}>
                    <Typography variant="h5" component="h2" sx={{mb: 2}}>
                        Revenue and expense ledger ({ledger?.entries.length ?? 0})
                    </Typography>
                    {!ledger?.entries.length ? (
                        <Typography color="text.secondary">
                            No ledger entries for this month. Add an entry using an accounting document.
                        </Typography>
                    ) : (
                        <TableContainer>
                            <Table size="small" aria-label="Revenue and expense ledger">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Entry</TableCell>
                                        <TableCell>Date</TableCell>
                                        <TableCell>Document</TableCell>
                                        <TableCell>Counterparty</TableCell>
                                        <TableCell>Description</TableCell>
                                        {columns.map(
                                            ([key, label]) => (
                                                <TableCell key={key} align="right">
                                                    {label}
                                                </TableCell>
                                            ))}
                                        <TableCell>R&amp;D description</TableCell>
                                        <TableCell>Comments</TableCell>
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
                                            </TableRow>
                                        ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                </Paper>
                <Paper variant="outlined" sx={{p: 2}}>
                    <Stack spacing={2}>
                        <Typography variant="h5" component="h2">
                            Accounting documents ({data?.companyAccountingDocuments.length ?? 0})
                        </Typography>
                        <Button
                            color="inherit"
                            variant="outlined"
                            disabled={!validMonth}
                            onClick={() => {
                                createState.reset();
                                setDraft(
                                    {
                                        documentNumber: '',
                                        documentDate: `${month}-01`,
                                        counterparty: '',
                                        counterpartyAddress: '',
                                        counterpartyTaxId: '',
                                        ksefNumber: '',
                                        description: '',
                                    });
                                setCreating(true);
                            }}
                        >
                            Create accounting document
                        </Button>
                        {!data?.companyAccountingDocuments.length && (
                            <Typography color="text.secondary">No accounting documents for this month.</Typography>
                        )}
                        {data?.companyAccountingDocuments.map(
                            document => (
                                <Box key={document.publicId} sx={{overflowWrap: 'anywhere'}}>
                                    <Button color="inherit" onClick={() => setSelectedDocument(document)}>
                                        {document.documentNumber}
                                    </Button>
                                    <Typography variant="body2">{document.description}</Typography>
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
                    Accounting document
                </DialogTitle>
                <IconButton
                    aria-label="Close document"
                    onClick={() => setSelectedDocument(null)}
                    sx={{position: 'absolute', right: 8, top: 8}}
                >
                    <CloseIcon/>
                </IconButton>
                <DialogContent dividers>
                    <Stack spacing={2} sx={{overflowWrap: 'anywhere'}}>
                        {selectedDocument &&
                            documentFields.map(
                                ([key, label]) => (
                                    <Box key={key}>
                                        <Typography variant="caption" color="text.secondary">
                                            {label}
                                        </Typography>
                                        <Typography>{selectedDocument[key] || '—'}</Typography>
                                    </Box>
                                ))}
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button color="inherit" onClick={() => setSelectedDocument(null)}>
                        Close
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
                <Box component="form" onSubmit={event => void handleCreateEntry(event)}>
                    <DialogTitle id="create-ledger-entry-title" sx={{pr: 7}}>Add ledger entry</DialogTitle>
                    <IconButton aria-label="Close entry form" disabled={busy} onClick={() => setEntryDraft(null)}
                                sx={{position: 'absolute', right: 8, top: 8}}>
                        <CloseIcon/>
                    </IconButton>
                    <DialogContent dividers>
                        {entryDraft && (
                            <Stack spacing={2}>
                                <TextField select id="ledger-document" label="Accounting document" fullWidth required
                                           value={entryDraft.accountingDocumentPublicId} disabled={busy}
                                           onChange={event => setEntryDraft({
                                               ...entryDraft,
                                               accountingDocumentPublicId: event.target.value
                                           })}>
                                    {data?.companyAccountingDocuments.map(document => (
                                        <MenuItem key={document.publicId} value={document.publicId}>
                                            {document.documentNumber}
                                        </MenuItem>
                                    ))}
                                </TextField>
                                <TextField id="ledger-date" label="Entry date" type="date" fullWidth required
                                           value={entryDraft.entryDate} disabled={busy}
                                           sx={theme => ({colorScheme: theme.palette.mode})}
                                           slotProps={{
                                               inputLabel: {shrink: true},
                                               htmlInput: {
                                                   min: `${month}-01`,
                                                   max: dayjs(`${month}-01`).endOf('month').format('YYYY-MM-DD')
                                               }
                                           }}
                                           onChange={event => setEntryDraft({
                                               ...entryDraft,
                                               entryDate: event.target.value
                                           })}/>
                                <TextField id="ledger-order" label="Entry number" type="number" fullWidth required
                                           value={entryDraft.entryOrder} disabled={busy}
                                           slotProps={{htmlInput: {min: 1, step: 1}}}
                                           onChange={event => setEntryDraft({
                                               ...entryDraft,
                                               entryOrder: Number(event.target.value)
                                           })}/>
                                {columns.filter(([key]) => key !== 'totalIncome' && key !== 'totalExpense').map(([key, label]) => (
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
                                <TextField id="ledger-rd-description" label="R&D description" fullWidth
                                           value={entryDraft.researchAndDevelopmentDescription} disabled={busy}
                                           onChange={event => setEntryDraft({
                                               ...entryDraft,
                                               researchAndDevelopmentDescription: event.target.value
                                           })}/>
                                <TextField id="ledger-comments" label="Comments" fullWidth multiline
                                           value={entryDraft.comments} disabled={busy}
                                           onChange={event => setEntryDraft({
                                               ...entryDraft,
                                               comments: event.target.value
                                           })}/>
                                {entryState.error &&
                                    <ErrorDisplay title="Ledger entry error" error={entryState.error}/>}
                            </Stack>
                        )}
                    </DialogContent>
                    <DialogActions>
                        <Button color="inherit" disabled={busy} onClick={() => setEntryDraft(null)}>Cancel</Button>
                        <Button type="submit" variant="contained" disabled={busy}>Create ledger entry</Button>
                    </DialogActions>
                </Box>
            </Dialog>
            <Dialog
                open={creating}
                onClose={() => !busy && setCreating(false)}
                fullWidth
                maxWidth="sm"
                aria-labelledby="create-accounting-document-title"
            >
                <Box component="form" onSubmit={event => void handleCreate(event)}>
                    <DialogTitle id="create-accounting-document-title" sx={{pr: 7}}>
                        Create accounting document
                    </DialogTitle>
                    <IconButton
                        aria-label="Close form"
                        disabled={busy}
                        onClick={() => setCreating(false)}
                        sx={{position: 'absolute', right: 8, top: 8}}
                    >
                        <CloseIcon/>
                    </IconButton>
                    <DialogContent dividers>
                        <Stack spacing={2}>
                            {draft &&
                                documentFields.map(
                                    ([key, label]) => (
                                        <TextField
                                            key={key}
                                            id={`accounting-document-${key}`}
                                            label={label}
                                            type={key === 'documentDate' ? 'date' : 'text'}
                                            sx={theme => ({colorScheme: theme.palette.mode})}
                                            value={draft[key]}
                                            required={key === 'documentNumber' || key === 'documentDate'}
                                            fullWidth
                                            disabled={busy}
                                            slotProps={{inputLabel: {shrink: true}}}
                                            onChange={event =>
                                                setDraft(
                                                    current =>
                                                        current ? {...current, [key]: event.target.value} : null)
                                            }
                                        />
                                    ))}
                            {createState.error && (
                                <ErrorDisplay title="Company accounting error" error={createState.error}/>
                            )}
                        </Stack>
                    </DialogContent>
                    <DialogActions>
                        <Button color="inherit" disabled={busy} onClick={() => setCreating(false)}>
                            Cancel
                        </Button>
                        <Button color="primary" type="submit" variant="contained" disabled={busy}>
                            Create document
                        </Button>
                    </DialogActions>
                </Box>
            </Dialog>
        </Stack>
    );
}
