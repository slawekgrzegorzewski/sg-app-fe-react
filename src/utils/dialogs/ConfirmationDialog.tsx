import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    Stack,
    Typography,
} from '@mui/material';
import * as React from 'react';
import CloseIcon from '@mui/icons-material/Close';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';

export interface ConfirmationDialogProps<T> {
    companionObject: T;
    title: React.ReactNode;
    message: React.ReactNode;
    open: boolean;
    onConfirm: (companionObject: T) => Promise<void>;
    onCancel: (companionObject: T) => Promise<void>;
    confirmLabel?: string;
    cancelLabel?: string;
    tone?: 'default' | 'danger';
}

export default function ConfirmationDialog<T>(props: ConfirmationDialogProps<T>) {
    const dialogTitleId = React.useId();
    const {
        title,
        message,
        open,
        onConfirm,
        onCancel,
        companionObject,
        confirmLabel = 'Potwierdź',
        cancelLabel = 'Anuluj',
        tone = 'default',
    } = props;

    const handleCancel = (e?: React.SyntheticEvent) => {
        e?.stopPropagation();
        void onCancel(companionObject);
    };

    const handleConfirm = (e: React.MouseEvent<HTMLElement>) => {
        e.stopPropagation();
        void onConfirm(companionObject);
    };

    return (
        <Dialog onClose={() => handleCancel()} open={open} fullWidth maxWidth="xs" aria-labelledby={dialogTitleId}>
            <DialogTitle
                id={`${dialogTitleId}-container`}
                onClick={e => e.stopPropagation()}
                sx={{px: {xs: 2, sm: 3}, py: 2}}
            >
                <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
                    <Stack direction="row" alignItems="center" spacing={1.5}>
                        {tone === 'danger' && (
                            <Box
                                sx={{
                                    display: 'flex',
                                    p: 0.75,
                                    borderRadius: 1,
                                    color: 'error.main',
                                    bgcolor: 'action.hover',
                                }}
                            >
                                <WarningAmberRoundedIcon />
                            </Box>
                        )}
                        <Typography id={dialogTitleId} variant="h4" component="span">
                            {title}
                        </Typography>
                    </Stack>
                    <IconButton autoFocus aria-label="Zamknij" edge="end" onClick={handleCancel}>
                        <CloseIcon />
                    </IconButton>
                </Stack>
            </DialogTitle>
            <DialogContent dividers onClick={e => e.stopPropagation()} sx={{px: {xs: 2, sm: 3}, py: 2.5}}>
                <Typography component="div" color="text.secondary">
                    {message}
                </Typography>
            </DialogContent>
            <DialogActions sx={{px: {xs: 2, sm: 3}, py: 2, gap: 1}}>
                <Button onClick={handleCancel} sx={{flex: {xs: 1, sm: '0 0 auto'}}}>
                    {cancelLabel}
                </Button>
                <Button
                    variant="contained"
                    color={tone === 'danger' ? 'error' : 'secondary'}
                    onClick={handleConfirm}
                    sx={{flex: {xs: 1, sm: '0 0 auto'}}}
                >
                    {confirmLabel}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
