import React, {useState} from 'react';
import {
    Alert,
    Box,
    Button,
    Checkbox,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControlLabel,
    IconButton,
    Stack,
    TextField,
    Typography
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import {useMutation} from '@apollo/client/react';
import {
    CounterpartyFieldsFragment,
    CounterpartyInput,
    SaveCounterpartyWithConflict,
    SaveCounterpartyWithConflictMutation
} from '../../types';
import {ErrorDisplay} from '../../application/components/QueryState';

export function counterpartyInput(counterparty: CounterpartyFieldsFragment): CounterpartyInput {
    return {
        kind: counterparty.kind,
        name: counterparty.name,
        address: counterparty.address,
        taxId: counterparty.taxId,
        active: counterparty.active,
    };
}

type Conflict = {
    existing: CounterpartyFieldsFragment;
    incoming: CounterpartyInput;
    document: boolean;
    changedExternally?: boolean;
    resolve: (value: CounterpartyFieldsFragment | null) => void;
};

type Props = {
    conflict: Conflict;
    busy: boolean;
    error?: Error;
    onCancel: () => void;
    onUseExisting: () => void;
    onSave: (input: CounterpartyInput) => void;
};

const fields = [
    ['name', 'Nazwa kontrahenta'],
    ['address', 'Adres kontrahenta'],
    ['taxId', 'NIP kontrahenta'],
] as const;

function CounterpartyConflictDialog({conflict, busy, error, onCancel, onUseExisting, onSave}: Props) {
    const [merged, setMerged] = useState(conflict.incoming);
    const {existing, incoming, document} = conflict;
    const inactive = document && !existing.active;
    return (
        <Dialog
            open
            fullWidth
            maxWidth="lg"
            onClose={() => !busy && onCancel()}
            aria-labelledby="counterparty-conflict-title"
        >
            <DialogTitle id="counterparty-conflict-title" sx={{pr: 7}}>
                Kontrahent o tym NIP-ie już istnieje
            </DialogTitle>
            <IconButton
                aria-label="Zamknij porównanie kontrahentów"
                disabled={busy}
                onClick={onCancel}
                sx={{position: 'absolute', right: 8, top: 8}}
            ><CloseIcon/></IconButton>
            <DialogContent dividers>
                <Stack spacing={2}>
                    <Alert severity="info">
                        Wybierz istniejący wpis, zastąp go nowymi danymi albo przygotuj wynik scalenia.
                        Zmiany katalogu nie zmienią danych wcześniejszych dokumentów.
                    </Alert>
                    {conflict.changedExternally && <Alert severity="warning">
                        Dane w katalogu zmieniły się podczas porównywania. Sprawdź aktualne istniejące dane
                        i ponownie wybierz sposób zapisu.
                    </Alert>}
                    {inactive && <Alert severity="warning">
                        Istniejący wpis jest zarchiwizowany. Aby użyć go w dokumencie, przywróć go podczas scalania.
                    </Alert>}
                    {error && <ErrorDisplay title="Nie udało się zapisać kontrahenta" error={error}/>}
                    <Box sx={{display: 'grid', gridTemplateColumns: {xs: '1fr', md: '1fr 1.2fr 1fr'}, gap: 2}}>
                        <Stack component="section" aria-label="Istniejące dane" spacing={2} sx={{minWidth: 0}}>
                            <Typography variant="h6" component="h3">Istniejące dane</Typography>
                            {fields.map(
                                    ([key, label]) => (
                                        <Box key={key} sx={{overflowWrap: 'anywhere'}}>
                                            <Typography variant="caption" color="text.secondary">{label}</Typography>
                                            <Typography sx={{whiteSpace: 'pre-wrap'}}>{existing[key] || 'Brak danych'}</Typography>
                                            <Button
                                                size="small"
                                                color="inherit"
                                                disabled={busy}
                                                onClick={() => setMerged(
                                                        {...merged, [key]: existing[key]})}
                                            >{`Użyj istniejącego: ${label.toLowerCase()}`}</Button>
                                        </Box>
                                    ))}
                            <Typography>{existing.active ? 'Aktywny' : 'Zarchiwizowany'}</Typography>
                        </Stack>
                        <Stack component="section" aria-label="Wynik scalenia" spacing={2} sx={{minWidth: 0}}>
                            <Typography variant="h6" component="h3">Wynik scalenia</Typography>
                            {fields.map(
                                    ([key, label]) => (
                                        <TextField
                                            key={key}
                                            id={`merged-counterparty-${key}`}
                                            label={label}
                                            value={merged[key]}
                                            required={key === 'name'}
                                            fullWidth
                                            multiline={key === 'address'}
                                            disabled={busy}
                                            slotProps={{
                                                input: {readOnly: key === 'taxId'},
                                                htmlInput: {maxLength: key === 'address' ? 2000 : 500},
                                            }}
                                            onChange={event => setMerged(
                                                    {...merged, [key]: event.target.value})}
                                        />
                                    ))}
                            <FormControlLabel
                                label="Aktywny kontrahent"
                                control={<Checkbox
                                    color="default"
                                    checked={merged.active}
                                    disabled={busy}
                                    onChange={event => setMerged(
                                            {...merged, active: event.target.checked})}
                                />}
                            />
                        </Stack>
                        <Stack component="section" aria-label="Nowe dane" spacing={2} sx={{minWidth: 0}}>
                            <Typography variant="h6" component="h3">Nowe dane</Typography>
                            {fields.map(
                                    ([key, label]) => (
                                        <Box key={key} sx={{overflowWrap: 'anywhere'}}>
                                            <Typography variant="caption" color="text.secondary">{label}</Typography>
                                            <Typography sx={{whiteSpace: 'pre-wrap'}}>{incoming[key] || 'Brak danych'}</Typography>
                                            <Button
                                                size="small"
                                                color="inherit"
                                                disabled={busy}
                                                onClick={() => setMerged(
                                                        {...merged, [key]: incoming[key]})}
                                            >{`Użyj nowego: ${label.toLowerCase()}`}</Button>
                                        </Box>
                                    ))}
                            <Typography>{incoming.active ? 'Aktywny' : 'Zarchiwizowany'}</Typography>
                        </Stack>
                    </Box>
                </Stack>
            </DialogContent>
            <DialogActions sx={{flexWrap: 'wrap', gap: 1}}>
                <Button color="inherit" disabled={busy} onClick={onCancel}>Anuluj</Button>
                <Button disabled={busy || inactive} onClick={onUseExisting}>Użyj istniejącego wpisu</Button>
                <Button
                    disabled={busy || !incoming.name.trim() || (document && !incoming.active)}
                    onClick={() => onSave(incoming)}
                >Nadpisz nowymi danymi</Button>
                <Button
                    variant="contained"
                    disabled={busy || !merged.name.trim() || (document && !merged.active)}
                    onClick={() => onSave(merged)}
                >Zapisz scalone dane</Button>
            </DialogActions>
        </Dialog>
    );
}

export function useCounterpartyConflict() {
    const [mutate, state] = useMutation<SaveCounterpartyWithConflictMutation>(SaveCounterpartyWithConflict);
    const [conflict, setConflict] = useState<Conflict | null>(null);
    const [revision, setRevision] = useState(0);

    function review(
            existing: CounterpartyFieldsFragment,
            incoming: CounterpartyInput,
            document = false): Promise<CounterpartyFieldsFragment | null> {
        state.reset();
        setRevision(
                value => value + 1);
        return new Promise(
                resolve => setConflict(
                        {existing, incoming, document, resolve}));
    }

    function finish(value: CounterpartyFieldsFragment | null) {
        state.reset();
        conflict?.resolve(value);
        setConflict(null);
    }

    async function save(
            input: CounterpartyInput,
            publicId: string | null) {
        const response = await mutate(
                {variables: {publicId, input}});
        const result = response.data?.saveCounterpartyWithConflict;
        if (!result) {
            throw new Error('Nie otrzymano wyniku zapisu kontrahenta');
        }
        if (result.conflict) {
            return review(result.conflict, input);
        }
        return result.saved ?? null;
    }

    async function resolve(input: CounterpartyInput) {
        if (!conflict) {
            return;
        }
        try {
            const response = await mutate(
                    {variables: {
                        publicId: conflict.existing.publicId,
                        input,
                        expected: counterpartyInput(conflict.existing),
                    }});
            const result = response.data?.saveCounterpartyWithConflict;
            if (result?.conflict) {
                setConflict(
                        {...conflict, existing: result.conflict, incoming: input, changedExternally: true});
                setRevision(
                        value => value + 1);
                return;
            }
            if (result?.saved) {
                finish(result.saved);
            }
        } catch {
            return;
        }
    }

    return {
        save,
        review,
        loading: state.loading,
        error: state.error,
        reset: state.reset,
        dialog: conflict && <CounterpartyConflictDialog
            key={revision}
            conflict={conflict}
            busy={state.loading}
            error={state.error}
            onCancel={() => finish(null)}
            onUseExisting={() => finish(conflict.existing)}
            onSave={input => void resolve(input)}
        />,
    };
}
