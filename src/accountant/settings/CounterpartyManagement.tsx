import React, {useState} from 'react';
import {useMutation, useQuery} from '@apollo/client/react';
import {
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
import CloseIcon from '@mui/icons-material/Close';
import {
    CounterpartyKind,
    GetCounterparties,
    GetCounterpartiesQuery,
    CounterpartyInput,
    SaveCounterparty,
    SaveCounterpartyMutation
} from '../../types';
import {ErrorDisplay, LoadingIndicator} from '../../application/components/QueryState';

type Props = {
    kind: CounterpartyKind;
};

export function CounterpartyManagement({kind}: Props) {
    const {data, loading, error, refetch} = useQuery<GetCounterpartiesQuery>(GetCounterparties, {
        fetchPolicy: 'network-only',
    });
    const counterparties = (data?.counterparties ?? [])
        .filter(counterparty => counterparty.kind === kind)
        .sort(
                (left, right) => left.name.localeCompare(right.name, 'pl'));
    const isClient = kind === CounterpartyKind.Client;
    const title = isClient ? 'Klienci' : 'Dostawcy';
    const addLabel = isClient ? 'Dodaj klienta' : 'Dodaj dostawcę';
    const editLabel = isClient ? 'Edytuj klienta' : 'Edytuj dostawcę';
    const dialogId = `counterparty-${kind}-title`;
    const [draft, setDraft] = useState<CounterpartyInput | null>(null);
    const [publicId, setPublicId] = useState<string | null>(null);
    const [save, state] = useMutation<SaveCounterpartyMutation>(SaveCounterparty);

    async function submit(
            input: CounterpartyInput,
            id: string | null) {
        try {
            await save({variables: {publicId: id, input}});
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
                    disabled={state.loading}
                    onClick={() => {
                        state.reset();
                        setPublicId(null);
                        setDraft({kind, name: '', address: '', taxId: '', active: true});
                    }}
                >{addLabel}</Button>
                {state.error && !draft && <ErrorDisplay
                    title="Nie udało się zapisać kontrahenta"
                    error={state.error}
                />}
                {!counterparties.length &&
                    <Typography color="text.secondary">{isClient ? 'Brak klientów.' : 'Brak dostawców.'}</Typography>}
                {counterparties.map(counterparty => (
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
                                disabled={state.loading}
                                onClick={() => {
                                    state.reset();
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
                                disabled={state.loading}
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
                        if (draft?.name.trim()) {
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
                                slotProps={{htmlInput: {maxLength: 100}}}
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
        </Paper>
    );
}
