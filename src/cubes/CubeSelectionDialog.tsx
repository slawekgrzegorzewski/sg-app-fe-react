import {useId} from 'react';
import {Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Stack} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

type Props<T extends string> = {
    title: string;
    open: boolean;
    value: T;
    options: ReadonlyArray<{ value: T; label: string }>;
    onSelect: (value: T) => void;
    onClose: () => void;
};

export function CubeSelectionDialog<T extends string>({title, open, value, options, onSelect, onClose}: Props<T>) {
    const titleId = useId();
    return (
        <Dialog
            open={open}
            onClose={onClose}
            onKeyDown={event => event.stopPropagation()}
            onKeyUp={event => event.stopPropagation()}
            aria-labelledby={titleId}
            fullWidth
            maxWidth="sm"
        >
            <Stack direction="row" alignItems="center" sx={{pr: 1}}>
                <DialogTitle id={titleId} sx={{flex: 1}}>{title}</DialogTitle>
                <IconButton aria-label="Zamknij" onClick={onClose}>
                    <CloseIcon/>
                </IconButton>
            </Stack>
            <DialogContent dividers>
                <Box sx={{display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 1}}>
                    {options.map(option => (
                        <Button
                            key={option.value}
                            variant={value === option.value ? 'contained' : 'outlined'}
                            aria-pressed={value === option.value}
                            sx={{
                                minHeight: 52,
                                textTransform: 'none',
                                color: value === option.value ? 'primary.contrastText' : 'text.primary',
                            }}
                            onClick={() => onSelect(option.value)}
                        >
                            {option.label}
                        </Button>
                    ))}
                </Box>
            </DialogContent>
            <DialogActions>
                <Button color="inherit" onClick={onClose}>Anuluj</Button>
            </DialogActions>
        </Dialog>
    );
}
