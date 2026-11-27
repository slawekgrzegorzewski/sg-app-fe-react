import React, {useState} from 'react';
import {useQuery} from '@apollo/client/react';
import {
    Alert,
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    Paper,
    Stack,
    TextField,
    Typography
} from '@mui/material';
import dayjs from 'dayjs';
import CloseIcon from '@mui/icons-material/Close';
import {
    CounterpartyKind,
    GetCounterparties,
    GetCounterpartiesQuery,
    CounterpartyInput,
} from '../../types';
import {ErrorDisplay, LoadingIndicator} from '../../application/components/QueryState';
import {counterpartyTaxIdKey, getPastedTaxId} from '../utils/taxId';
import {useCounterpartyConflict} from './CounterpartyConflictDialog';

const taxIdPattern = /^(?=.*\p{N})[\p{L}\p{N}]+(?:[ ./-][\p{L}\p{N}]+)*$/u;

type Props = {
    kind: CounterpartyKind;
};

export function CounterpartyManagement({kind}: Props) {
    const {data, loading, error, refetch} = useQuery<GetCounterpartiesQuery>(GetCounterparties, {
        fetchPolicy: 'network-only',
    });
    const [taxIdSearch, setTaxIdSearch] = useState('');
    const [registryLoading, setRegistryLoading] = useState(false);
    const [registryMessage, setRegistryMessage] = useState('');
    const taxIdSearchKey = counterpartyTaxIdKey(taxIdSearch);
    const counterparties = (data?.counterparties ?? [])
        .filter(counterparty => counterparty.kind === kind)
        .sort(
                (left, right) => left.name.localeCompare(right.name, 'pl'));
    const visibleCounterparties = counterparties.filter(
            counterparty => !taxIdSearchKey || counterpartyTaxIdKey(counterparty.taxId ?? '').includes(taxIdSearchKey));
    const canSearchRegistry = /^[0-9]{10}$/.test(taxIdSearchKey) && !visibleCounterparties.some(
            counterparty => counterpartyTaxIdKey(counterparty.taxId ?? '') === taxIdSearchKey);
    const isClient = kind === CounterpartyKind.Client;
    const title = isClient ? 'Klienci' : 'Dostawcy';
    const addLabel = isClient ? 'Dodaj klienta' : 'Dodaj dostawcę';
    const editLabel = isClient ? 'Edytuj klienta' : 'Edytuj dostawcę';
    const dialogId = `counterparty-${kind}-title`;
    const [draft, setDraft] = useState<CounterpartyInput | null>(null);
    const [publicId, setPublicId] = useState<string | null>(null);
    const [taxIdValidationRequested, setTaxIdValidationRequested] = useState(false);
    const invalidTaxId = !taxIdPattern.test(draft?.taxId?.trim() ?? '') || (draft?.taxId?.trim().length ?? 0) > 100;
    const showTaxIdError = taxIdValidationRequested && invalidTaxId;
    const state = useCounterpartyConflict();

    async function searchRegistry() {
        setRegistryLoading(true);
        setRegistryMessage('');
        const controller = new AbortController();
        const timeout = window.setTimeout(() => controller.abort(), 10000);
        try {
            const date = dayjs().format('YYYY-MM-DD');
            const endpoint = 'https://wykazpodatnikowvat.mf.gov.pl/api/search/nip';
            const response = await fetch(
                    `${endpoint}/${taxIdSearchKey}?date=${date}`,
                    {credentials: 'omit', signal: controller.signal});
            if (!response.ok) {
                throw new Error('Błąd HTTP wykazu');
            }
            const body = await response.json();
            const subject = body?.result?.subject;
            if (subject === null) {
                setRegistryMessage('Nie znaleziono kontrahenta w Wykazie podatników VAT.');
                return;
            }
            if (subject?.nip !== taxIdSearchKey || typeof subject.name !== 'string' || !subject.name.trim()) {
                throw new Error('Niepełne dane w odpowiedzi wykazu');
            }
            const address = [subject.residenceAddress, subject.workingAddress].find(
                    value => typeof value === 'string' && value.trim()) ?? '';
            state.reset();
            setTaxIdValidationRequested(false);
            setPublicId(null);
            setDraft({kind, name: subject.name.trim(), address: address.trim(), taxId: taxIdSearchKey, active: true});
        } catch {
            setRegistryMessage('Nie udało się pobrać danych z Wykazu podatników VAT. Spróbuj ponownie.');
        } finally {
            window.clearTimeout(timeout);
            setRegistryLoading(false);
        }
    }

    async function submit(
            input: CounterpartyInput,
            id: string | null) {
        try {
            const saved = await state.save(input, id);
            if (!saved) {
                return;
            }
            await refetch();
            setDraft(null);
        } catch {
            return;
        }
    }

    if (loading && !data) {
        return <LoadingIndicator label={`Ładowanie: ${title.toLowerCase()}...`}/>;
    }
    if (error) {
        return <ErrorDisplay
            error={error}
            onRetry={() => void refetch()}
        />;
    }
    return (
        <Paper
            variant="outlined"
            sx={{p: 2, flex: 1, width: '100%', minWidth: 0}}
        >
            <Stack spacing={2}>
                <Typography
                    variant="h5"
                    component="h2"
                >{title} ({counterparties.length})</Typography>
                <Button
                    variant="outlined"
                    color="inherit"
                    disabled={state.loading || registryLoading}
                    onClick={() => {
                        state.reset();
                        setTaxIdValidationRequested(false);
                        setPublicId(null);
                        setDraft({kind, name: '', address: '', taxId: '', active: true});
                    }}
                >{addLabel}</Button>
                <TextField
                    id={`counterparty-${kind}-tax-id-search`}
                    label="Szukaj po NIP-ie"
                    type="search"
                    size="small"
                    value={taxIdSearch}
                    disabled={registryLoading}
                    onChange={event => {
                        setTaxIdSearch(event.target.value);
                        setRegistryMessage('');
                    }}
                />
                {canSearchRegistry && <Button
                    variant="outlined"
                    loading={registryLoading}
                    disabled={state.loading || registryLoading}
                    onClick={() => void searchRegistry()}
                >Pobierz z Wykazu podatników VAT</Button>}
                {registryMessage && <Alert severity="info">{registryMessage}</Alert>}
                {state.error && !draft && <ErrorDisplay
                    title="Nie udało się zapisać kontrahenta"
                    error={state.error}
                />}
                {!counterparties.length &&
                    <Typography color="text.secondary">{isClient ? 'Brak klientów.' : 'Brak dostawców.'}</Typography>}
                {counterparties.length > 0 && visibleCounterparties.length === 0 &&
                    <Typography role="status" color="text.secondary">Brak kontrahentów o podanym NIP-ie.</Typography>}
                {visibleCounterparties.map(counterparty => (
                    <Box
                        key={counterparty.publicId}
                        sx={{overflowWrap: 'anywhere'}}
                    >
                        <Typography>{counterparty.name}{!counterparty.active && ' · Zarchiwizowany'}</Typography>
                        <Typography
                            variant="body2"
                            color="text.secondary"
                        >{counterparty.address} {counterparty.taxId && `· NIP: ${counterparty.taxId}`}</Typography>
                        <Stack
                            direction="row"
                            spacing={1}
                            useFlexGap
                            flexWrap="wrap"
                        >
                            <Button
                                color="inherit"
                                disabled={state.loading || registryLoading}
                                onClick={() => {
                                    state.reset();
                                    setTaxIdValidationRequested(false);
                                    setPublicId(counterparty.publicId);
                                    setDraft({
                                        kind: counterparty.kind,
                                        name: counterparty.name,
                                        address: counterparty.address,
                                        taxId: counterparty.taxId,
                                        active: counterparty.active
                                    });
                                }}
                            >{editLabel}</Button>
                            <Button
                                color="inherit"
                                disabled={state.loading || registryLoading}
                                onClick={() => void submit({
                                    kind: counterparty.kind,
                                    name: counterparty.name,
                                    address: counterparty.address,
                                    taxId: counterparty.taxId,
                                    active: !counterparty.active
                                }, counterparty.publicId)}
                            >
                                {counterparty.active ? 'Archiwizuj kontrahenta' : 'Przywróć kontrahenta'}
                            </Button>
                        </Stack>
                    </Box>
                ))}
            </Stack>
            <Dialog
                open={Boolean(draft)}
                onClose={() => !state.loading && setDraft(null)}
                fullWidth
                maxWidth="sm"
                aria-labelledby={dialogId}
            >
                <Box
                    component="form"
                    onSubmit={event => {
                        event.preventDefault();
                        setTaxIdValidationRequested(true);
                        if (draft?.name.trim() && !invalidTaxId) {
                            void submit(draft, publicId);
                        }
                    }}
                >
                    <DialogTitle id={dialogId}>{publicId ? editLabel : addLabel}</DialogTitle>
                    <IconButton
                        aria-label="Zamknij formularz kontrahenta"
                        disabled={state.loading}
                        onClick={() => setDraft(null)}
                        sx={{position: 'absolute', right: 8, top: 8}}
                    ><CloseIcon/></IconButton>
                    <DialogContent dividers>
                        {draft && <Stack spacing={2}>
                            <TextField
                                id={`counterparty-${kind}-name`}
                                label="Nazwa kontrahenta"
                                required
                                fullWidth
                                disabled={state.loading}
                                value={draft.name}
                                slotProps={{htmlInput: {maxLength: 500}}}
                                onChange={event => setDraft({...draft, name: event.target.value})}
                            />
                            <TextField
                                id={`counterparty-${kind}-address`}
                                label="Adres kontrahenta"
                                fullWidth
                                multiline
                                disabled={state.loading}
                                value={draft.address}
                                slotProps={{htmlInput: {maxLength: 2000}}}
                                onChange={event => setDraft({...draft, address: event.target.value})}
                            />
                            <TextField
                                id={`counterparty-${kind}-tax-id`}
                                label="NIP kontrahenta"
                                fullWidth
                                disabled={state.loading}
                                value={draft.taxId}
                                error={showTaxIdError}
                                helperText={showTaxIdError
                                        ? 'Wpisz identyfikator podatkowy: litery, cyfry oraz spacje, kropki, ukośniki lub łączniki między nimi (do 100 znaków).'
                                        : undefined}
                                slotProps={{
                                    htmlInput: {
                                        maxLength: 100,
                                        'aria-required': true,
                                        onPaste: (event: React.ClipboardEvent<HTMLInputElement>) => {
                                            const taxId = getPastedTaxId(event);
                                            setDraft({...draft, taxId});
                                        },
                                    },
                                }}
                                onChange={event => setDraft({...draft, taxId: event.target.value})}
                            />
                            <Typography
                                variant="body2"
                                color="text.secondary"
                            >Zmiany w katalogu nie zmieniają danych
                                zapisanych dokumentów.</Typography>
                            {state.error &&
                                <ErrorDisplay
                                    title="Nie udało się zapisać kontrahenta"
                                    error={state.error}
                                />}
                        </Stack>}
                    </DialogContent>
                    <DialogActions>
                        <Button
                            color="inherit"
                            disabled={state.loading}
                            onClick={() => setDraft(null)}
                        >Anuluj</Button>
                        <Button
                            type="submit"
                            variant="contained"
                            disabled={state.loading || !draft?.name.trim()}
                        >Zapisz
                            kontrahenta</Button>
                    </DialogActions>
                </Box>
            </Dialog>
            {state.dialog}
        </Paper>
    );
}
