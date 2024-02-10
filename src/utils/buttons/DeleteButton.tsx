import * as React from "react";
import {useContext, useState} from "react";
import {Button} from "@mui/material";
import {ShowBackdropContext} from "../DrawerAppBar";
import ConfirmationDialog from "../dialogs/ConfirmationDialog";

export interface DeleteButtonProps<T> {
    object: T
    confirmationMessage: string,
    onDelete?: ((object: T) => Promise<any>),
    onCancel?: (() => Promise<void>),
    buttonContent?: React.ReactNode
}

export function DeleteButton<T>(props: DeleteButtonProps<T>) {
    let {buttonContent, onDelete, onCancel, confirmationMessage, object} = props;

    const [confirmationDialogOpen, setConfirmationDialogOpen] = useState(false);
    const {setShowBackdrop} = useContext(ShowBackdropContext);

    const deleteClicked = (e: React.MouseEvent<HTMLElement>) => {
        setConfirmationDialogOpen(true);
        e.stopPropagation();
    }

    function cancelDelete() {
        setConfirmationDialogOpen(false);
        if (onCancel) {
            setShowBackdrop(true);
            onCancel().finally(() => setShowBackdrop(false));
        }
    }

    function performDelete(object: T) {
        if (onDelete) {
            setShowBackdrop(true);
            onDelete(object).finally(() => setShowBackdrop(false));
        }

    }

    return <>
        <Button variant={"text"} onClick={(e) => deleteClicked(e)}>
            {buttonContent!}
        </Button>
        <ConfirmationDialog
            title={'Na pewno usunąć?'}
            message={confirmationMessage}
            open={confirmationDialogOpen}
            onClose={performDelete}
            onCancel={cancelDelete}
            companionObject={object}
        />
    </>
}