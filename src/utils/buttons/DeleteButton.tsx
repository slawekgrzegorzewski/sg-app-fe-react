import * as React from "react";
import {useContext, useState} from "react";
import {Button, Dialog, DialogContent, DialogTitle, Stack} from "@mui/material";
import {ShowBackdropContext} from "../DrawerAppBar";

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
    const {setShowBackdrop} = useContext(ShowBackdropContext);

    function openDialog(e: React.MouseEvent<HTMLAnchorElement> | React.MouseEvent<HTMLButtonElement>) {
        setConfirmationDialogOpen(true);
        e.stopPropagation();
    }

    const onCloseDialog = (e: React.MouseEvent<HTMLElement>, r: string) => {
        e.stopPropagation();
        setConfirmationDialogOpen(false);
        setShowBackdrop(true);
        if (['backdropClick', 'escapeKeyDown', 'cancel'].includes(r)) {
            onCancel().finally(() => setShowBackdrop(false));
        } else {
            onDelete(object).finally(() => setShowBackdrop(false));
        }
    };
    return <>
        <Button variant={"text"} onClick={openDialog}>
            {buttonContent!}
        </Button>
        <Dialog onClose={onCloseDialog} open={confirmationDialogOpen}>
            <DialogTitle onClick={e => e.stopPropagation()}>{'Na pewno usunąć?'}</DialogTitle>
            <DialogContent onClick={e => e.stopPropagation()}>
                {confirmationMessage}
                <Stack direction={"row"} spacing={4} alignItems={"center"}>
                    <Button variant="text" sx={{flexGrow: 1}}
                            onClick={(e) => onCloseDialog(e, 'confirm')}>
                        Potwierdź
                    </Button>
                    <Button variant="text" sx={{flexGrow: 1}}
                            onClick={(e) => onCloseDialog(e, 'cancel')}>
                        Anuluj
                    </Button>
                </Stack>
            </DialogContent>
        </Dialog>
    </>
}