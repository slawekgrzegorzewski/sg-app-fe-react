import * as React from 'react';
import {Dialog, DialogContent, DialogTitle} from '@mui/material';
import Form, {FormProps} from '../forms/Form';

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

    const handleClick = (e: React.MouseEvent<HTMLElement>) => {
        e.stopPropagation();
    };

    return (
        <Dialog
            open={open}
            maxWidth={'lg'}
            fullWidth={false}
            {...dialogOptions}
            onClose={() => {
                void onCancel();
            }}
        >
            <DialogTitle onClick={handleClick}>{dialogTitle}</DialogTitle>
            <DialogContent onClick={handleClick}>
                <>
                    <Form onSave={onConfirm} onCancel={onCancel} {...formProps} />
                    {children && children}
                </>
            </DialogContent>
        </Dialog>
    );
}
