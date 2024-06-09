import * as React from "react";
import {useState} from "react";
import {Box} from "@mui/material";
import ConfirmationDialog from "../dialogs/ConfirmationDialog";

export interface DeleteButtonProps<T> {
    object: T
    confirmationMessage: string,
    onDelete: ((object: T) => Promise<any>),
    onCancel: (() => Promise<void>),
    buttonContent?: React.ReactNode
}

export function DeleteButton<T>(props: DeleteButtonProps<T>) {
    let {buttonContent, onDelete, onCancel, confirmationMessage, object} = props;

    const [confirmationDialogOpen, setConfirmationDialogOpen] = useState(false);

    function openDialog(e: React.MouseEvent<HTMLElement>) {
        setConfirmationDialogOpen(true);
        e.stopPropagation();
    }

    const doButtonAction = (action: () => Promise<void>): Promise<void> => {
        return action().finally(() => setConfirmationDialogOpen(false));
    };

    return <>
        <Box onClick={openDialog}>
            {buttonContent!}
        </Box>
        <ConfirmationDialog companionObject={object}
                            title={'Na pewno usunąć?'}
                            message={confirmationMessage}
                            open={confirmationDialogOpen}
                            onConfirm={(companionObject: T) => {
                                return doButtonAction(() => onDelete(companionObject));
                            }}
                            onCancel={(companionObject: T) => {
                                return doButtonAction(() => onCancel());
                            }}/>
    </>
}