import * as React from 'react';
import {useState} from 'react';
import {Box} from '@mui/material';
import ConfirmationDialog from '../dialogs/ConfirmationDialog';

export interface DeleteButtonProps<T> {
    object: T;
    confirmationMessage: React.ReactNode;
    onDelete: (object: T) => Promise<any>;
    onCancel: () => Promise<void>;
    buttonContent?: React.ReactNode;
    title?: React.ReactNode;
    confirmLabel?: string;
    cancelLabel?: string;
}

export function DeleteButton<T>(props: DeleteButtonProps<T>) {
    let {
        buttonContent,
        onDelete,
        onCancel,
        confirmationMessage,
        object,
        title = 'Usunąć element?',
        confirmLabel = 'Usuń',
        cancelLabel = 'Anuluj',
    } = props;

    const [confirmationDialogOpen, setConfirmationDialogOpen] = useState(false);

    function openDialog(e: React.MouseEvent<HTMLElement>) {
        setConfirmationDialogOpen(true);
        e.stopPropagation();
    }

    const doButtonAction = (action: () => Promise<void>): Promise<void> => {
        return action().finally(() => setConfirmationDialogOpen(false));
    };

    return (
        <>
            <Box onClick={openDialog}>{buttonContent!}</Box>
            <ConfirmationDialog
                companionObject={object}
                title={title}
                message={confirmationMessage}
                open={confirmationDialogOpen}
                tone="danger"
                confirmLabel={confirmLabel}
                cancelLabel={cancelLabel}
                onConfirm={(companionObject: T) => {
                    return doButtonAction(() => onDelete(companionObject));
                }}
                onCancel={(_: T) => {
                    return doButtonAction(() => onCancel());
                }}
            />
        </>
    );
}
