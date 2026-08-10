import * as React from 'react';
import {Box, Dialog, DialogContent, DialogTitle, IconButton} from '@mui/material';
import Form, {FormProps} from '../forms/Form';
import CloseIcon from '@mui/icons-material/Close';

export interface FormDialogProps<T> {
    dialogTitle: React.JSX.Element;
    dialogOptions?: any;
    open: boolean;
    onConfirm: (object: T) => Promise<void>;
    onCancel: () => Promise<void>;
    formProps: Omit<FormProps<T>, 'onSave' | 'onCancel'>;
    children?: React.JSX.Element;
}

export function FormDialog<T>(props: FormDialogProps<T>) {
    let {open, dialogTitle, onConfirm, onCancel, formProps, children, dialogOptions} = props;
    const dialogTitleId = React.useId();

    const handleClick = (e: React.MouseEvent<HTMLElement>) => {
        e.stopPropagation();
    };

    return (
        <Dialog
            open={open}
            maxWidth="sm"
            fullWidth
            aria-labelledby={dialogTitleId}
            slotProps={{
                backdrop: {
                    'data-testid': 'form-dialog-backdrop',
                } as React.ComponentPropsWithoutRef<'div'>,
            }}
            {...dialogOptions}
            onClose={() => {
                void onCancel();
            }}
        >
            <Box display="flex" alignItems="center" onClick={handleClick}>
                <DialogTitle id={dialogTitleId} sx={{flex: 1, minWidth: 0, px: {xs: 2, sm: 3}, py: 2}}>
                    <Box sx={{minWidth: 0}}>{dialogTitle}</Box>
                </DialogTitle>
                <IconButton autoFocus aria-label="Zamknij" onClick={() => void onCancel()} sx={{mr: {xs: 1, sm: 2}}}>
                    <CloseIcon />
                </IconButton>
            </Box>
            <DialogContent dividers onClick={handleClick} sx={{px: {xs: 2, sm: 3}, py: 2.5}}>
                <>
                    <Form
                        onSave={onConfirm}
                        onCancel={onCancel}
                        {...formProps}
                        presentation={formProps.presentation ?? 'dialog'}
                    />
                    {children && children}
                </>
            </DialogContent>
        </Dialog>
    );
}
