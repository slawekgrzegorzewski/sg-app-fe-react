import * as React from 'react';
import {Alert, AlertTitle, Button, CircularProgress, Stack} from '@mui/material';
import Typography from '@mui/material/Typography';

export type LoadingIndicatorProps = {
    label?: string;
};

export function LoadingIndicator({label = 'Ładowanie...'}: LoadingIndicatorProps) {
    return (
        <Stack
            direction={'row'}
            spacing={2}
            alignItems={'center'}
            sx={{padding: 2}}
            role={'status'}
            aria-live={'polite'}
        >
            <CircularProgress size={20} />
            <Typography>{label}</Typography>
        </Stack>
    );
}

export type ErrorDisplayProps = {
    /** Anything with a message; Apollo errors and plain Errors both fit. */
    error?: {message?: string} | null;
    title?: string;
    onRetry?: () => void;
};

/**
 * Replaces the bare `<>Error...</>` placeholders. Showing the message and offering a
 * retry is the difference between a dead end and a recoverable state.
 */
export function ErrorDisplay({error, title = 'Nie udało się pobrać danych', onRetry}: ErrorDisplayProps) {
    return (
        <Alert
            severity={'error'}
            sx={{margin: 2}}
            action={
                onRetry ? (
                    <Button color={'inherit'} size={'small'} onClick={onRetry}>
                        Ponów
                    </Button>
                ) : undefined
            }
        >
            <AlertTitle>{title}</AlertTitle>
            {error?.message}
        </Alert>
    );
}
