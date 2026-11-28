import {useEffect, useRef, useState} from 'react';
import {useApolloClient, useMutation, useQuery} from '@apollo/client/react';
import {Accordion, AccordionDetails, AccordionSummary, Alert, Button, MenuItem, Stack, TextField, Typography} from '@mui/material';
import dayjs from 'dayjs';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
    DownloadKsefInvoiceXml,
    DownloadKsefInvoiceXmlQuery,
    GetKsefImportInvoices,
    GetKsefImportInvoicesQuery,
    GetKsefImports,
    GetKsefImportsQuery,
    KsefImportStatus,
    KsefInvoiceDirection,
    KsefInvoiceStatus,
    StartKsefImport,
    StartKsefImportMutation,
} from '../types';
import {ErrorDisplay, LoadingIndicator} from '../application/components/QueryState';

const statusLabels = {
    [KsefImportStatus.Pending]: 'Oczekuje',
    [KsefImportStatus.Running]: 'Pobieranie',
    [KsefImportStatus.Completed]: 'Zakończony',
    [KsefImportStatus.Failed]: 'Przerwany',
};

type KsefImportPanelProps = {
    onImported: () => Promise<unknown>;
};

export function KsefImportPanel({onImported}: KsefImportPanelProps) {
    const [dateFrom, setDateFrom] = useState(dayjs().startOf('month').format('YYYY-MM-DD'));
    const [dateTo, setDateTo] = useState(dayjs().format('YYYY-MM-DD'));
    const [direction, setDirection] = useState(KsefInvoiceDirection.Purchase);
    const [selectedId, setSelectedId] = useState('all');
    const [page, setPage] = useState(0);
    const [message, setMessage] = useState('');
    const [downloadingId, setDownloadingId] = useState('');
    const client = useApolloClient();
    const {data, loading, error, refetch, startPolling, stopPolling} = useQuery<GetKsefImportsQuery>(
            GetKsefImports,
            {fetchPolicy: 'network-only'});
    const [startImport, startState] = useMutation<StartKsefImportMutation>(StartKsefImport);
    const invoices = useQuery<GetKsefImportInvoicesQuery>(
            GetKsefImportInvoices,
            {variables: {importPublicId: selectedId === 'all' ? null : selectedId, page}, skip: !selectedId, fetchPolicy: 'network-only'});
    const runs = data?.ksefImports ?? [];
    const active = runs.some(run => run.status === KsefImportStatus.Pending || run.status === KsefImportStatus.Running);
    const observed = useRef(new Map<string, string>());
    const onImportedRef = useRef(onImported);
    onImportedRef.current = onImported;
    const invoiceRefetch = invoices.refetch;
    const busy = startState.loading || active;

    useEffect(() => {
        if (active) {
            startPolling(3000);
        } else {
            stopPolling();
        }
        return stopPolling;
    }, [active, startPolling, stopPolling]);

    useEffect(() => {
        for (const run of data?.ksefImports ?? []) {
            const previous = observed.current.get(run.publicId);
            observed.current.set(run.publicId, run.status);
            if (previous && previous !== run.status
                    && (run.status === KsefImportStatus.Completed || run.status === KsefImportStatus.Failed)) {
                void onImportedRef.current().catch(() => setMessage('Odśwież listę dokumentów księgowych.'));
                if (selectedId === run.publicId || selectedId === 'all') {
                    void invoiceRefetch().catch(() => setMessage('Odśwież wynik importu.'));
                }
            }
        }
    }, [data, selectedId, invoiceRefetch]);

    async function start() {
        setMessage('');
        try {
            const response = await startImport({variables: {input: {dateFrom, dateTo, direction}}});
            const run = response.data?.startKsefImport;
            if (run) {
                observed.current.set(run.publicId, run.status);
                setSelectedId(run.publicId);
                setPage(0);
            }
            await refetch();
        } catch (failure) {
            setMessage(failure instanceof Error ? failure.message : 'Nie udało się uruchomić importu.');
        }
    }

    async function download(publicId: string) {
        setDownloadingId(publicId);
        setMessage('');
        try {
            const response = await client.query<DownloadKsefInvoiceXmlQuery>(
                    {query: DownloadKsefInvoiceXml, variables: {publicId}, fetchPolicy: 'no-cache'});
            const file = response.data?.ksefInvoiceXml;
            if (!file) {
                throw new Error('Brak pliku XML');
            }
            const bytes = Uint8Array.from(atob(file.contentBase64), character => character.charCodeAt(0));
            const url = URL.createObjectURL(new Blob([bytes], {type: 'application/xml'}));
            const link = document.createElement('a');
            link.href = url;
            link.download = file.fileName;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.setTimeout(() => URL.revokeObjectURL(url), 1000);
        } catch {
            setMessage('Nie udało się pobrać XML faktury.');
        } finally {
            setDownloadingId('');
        }
    }

    return (
        <Accordion variant="outlined" disableGutters>
            <AccordionSummary expandIcon={<ExpandMoreIcon />} aria-controls="ksef-import-content" id="ksef-import-header">
                <Typography variant="h5" component="h2">Import z KSeF</Typography>
            </AccordionSummary>
            <AccordionDetails id="ksef-import-content">
            <Stack spacing={2}>
                {loading && !data && <LoadingIndicator label="Sprawdzanie dostępu do KSeF..." />}
                {error && <ErrorDisplay error={error} onRetry={() => void refetch()} />}
                {data && !data.ksefConnection.configured && (
                    <Alert severity="info">
                        Skonfiguruj na serwerze token KSeF z uprawnieniem tylko do odczytu dla tej firmy.
                    </Alert>
                )}
                {data?.ksefConnection.configured && (
                    <>
                        <Typography variant="body2">
                            NIP: {data.ksefConnection.nip} · Środowisko: {data.ksefConnection.environment === 'PRODUCTION' ? 'produkcyjne' : 'testowe (' + data.ksefConnection.environment + ')'}
                        </Typography>
                        {data.ksefConnection.environment !== 'PRODUCTION' && (
                            <Alert severity="warning">
                                Środowisko testowe. Importuj dane do osobnej domeny testowej.
                            </Alert>
                        )}
                        <Typography variant="body2" color="text.secondary">
                            Wybierz okres zapisania faktur w KSeF (do 100 dni). Data dokumentu pochodzi z faktury.
                            Importowane dokumenty wymagają osobnej decyzji o ujęciu w KPiR.
                        </Typography>
                        <Stack direction={{xs: 'column', sm: 'row'}} gap={2}>
                            <TextField
                                id="ksef-date-from"
                                type="date"
                                label="Zapis w KSeF od"
                                value={dateFrom}
                                onChange={event => setDateFrom(event.target.value)}
                                slotProps={{inputLabel: {shrink: true}}}
                            />
                            <TextField
                                id="ksef-date-to"
                                type="date"
                                label="Zapis w KSeF do"
                                value={dateTo}
                                onChange={event => setDateTo(event.target.value)}
                                slotProps={{inputLabel: {shrink: true}}}
                            />
                            <TextField
                                id="ksef-direction"
                                select
                                label="Faktury"
                                value={direction}
                                onChange={event => setDirection(event.target.value as KsefInvoiceDirection)}
                                sx={{minWidth: 150}}
                            >
                                <MenuItem value={KsefInvoiceDirection.Purchase}>Zakupowe</MenuItem>
                                <MenuItem value={KsefInvoiceDirection.Sales}>Sprzedażowe</MenuItem>
                            </TextField>
                        </Stack>
                        <Button
                            variant="outlined"
                            disabled={busy || !dateFrom || !dateTo || dateFrom > dateTo}
                            onClick={() => void start()}
                        >
                            {busy ? 'Import w toku' : 'Pobierz faktury z KSeF'}
                        </Button>
                    </>
                )}
                {message && <Alert severity="error">{message}</Alert>}
                {data && (
                    <TextField
                        id="ksef-import-history"
                        select
                        label="Wynik importu"
                        value={selectedId}
                        onChange={event => {
                            setSelectedId(event.target.value);
                            setPage(0);
                        }}
                    >
                        <MenuItem value="all">Wszystkie pobrane faktury</MenuItem>
                        {runs.map(run => (
                            <MenuItem key={run.publicId} value={run.publicId}>
                                {dayjs(run.createdAt).format('DD.MM.YYYY HH:mm')} · {run.direction === KsefInvoiceDirection.Purchase
                                        ? 'Zakupy' : 'Sprzedaż'} · {statusLabels[run.status]}
                            </MenuItem>
                        ))}
                    </TextField>
                )}
                {runs.filter(run => run.publicId === selectedId).map(run => (
                    <Stack key={run.publicId} spacing={1} aria-live="polite">
                        <Typography variant="body2">
                            {statusLabels[run.status]} · Nowe dokumenty: {run.importedCount} · Pominięte duplikaty: {run.duplicateCount}
                            {' · '}Do sprawdzenia: {run.reviewCount}
                        </Typography>
                        {run.errorMessage && <Alert severity="error">{run.errorMessage}</Alert>}
                        {run.effectiveTo && (
                            <Typography variant="caption">
                                Zakres danych KSeF do: {dayjs(run.effectiveTo).format('DD.MM.YYYY HH:mm:ss')}.
                                Aby pobrać najnowsze faktury, ponów import tego okresu.
                            </Typography>
                        )}
                    </Stack>
                ))}
                {invoices.loading && <LoadingIndicator label="Ładowanie wyniku importu..." />}
                {invoices.error && <ErrorDisplay error={invoices.error} onRetry={() => void invoices.refetch()} />}
                {invoices.data?.ksefImportInvoices.map(invoice => (
                    <Stack key={invoice.publicId} spacing={0.5} sx={{overflowWrap: 'anywhere'}}>
                        <Typography>{invoice.invoiceNumber}</Typography>
                        <Typography variant="caption">{invoice.ksefNumber}</Typography>
                        {invoice.status === KsefInvoiceStatus.ReviewRequired
                                ? <Alert severity="warning">{invoice.reviewReason}</Alert>
                                : <Typography variant="body2">Dokument dostępny w dokumentach księgowych.</Typography>}
                        <Button
                            disabled={!!downloadingId}
                            onClick={() => void download(invoice.publicId)}
                            sx={{alignSelf: 'flex-start'}}
                        >
                            Pobierz XML
                        </Button>
                    </Stack>
                ))}
                {selectedId && (
                    <Stack direction="row" gap={1}>
                        <Button disabled={page === 0 || invoices.loading} onClick={() => setPage(page - 1)}>Poprzednie</Button>
                        <Button
                            disabled={invoices.loading || (invoices.data?.ksefImportInvoices.length ?? 0) < 50}
                            onClick={() => setPage(page + 1)}
                        >
                            Następne
                        </Button>
                        <Button onClick={() => void invoices.refetch()}>Odśwież wynik</Button>
                    </Stack>
                )}
            </Stack>
            </AccordionDetails>
        </Accordion>
    );
}
