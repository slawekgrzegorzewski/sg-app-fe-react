import {Button, Dialog, DialogContent, DialogTitle, Stack} from "@mui/material";
import * as React from "react";
import {useContext} from "react";
import {ShowBackdropContext} from "../DrawerAppBar";

export interface ConfirmationDialogProps<T> {
    companionObject: T,
    title: string,
    message: string,
    open: boolean;
    onConfirm: (companionObject: T) => Promise<void>;
    onCancel: (companionObject: T) => Promise<void>;
}

export default function ConfirmationDialog<T>(props: ConfirmationDialogProps<T>) {
    const {setShowBackdrop} = useContext(ShowBackdropContext);

    const {title, message, open, onConfirm, onCancel, companionObject} = props;

    const doButtonAction = (action: () => Promise<void>) => {
        setShowBackdrop(true);
        action().finally(() => setShowBackdrop(false));
    };

    const handleClose = (e: React.MouseEvent<HTMLElement>, r: string) => {
        e.stopPropagation();
        if (!['backdropClick', 'escapeKeyDown', 'cancel'].includes(r)) {
            doButtonAction(() => onConfirm(companionObject));
        } else {
            doButtonAction(() => onCancel(companionObject));
        }
    };

    return (
        <Dialog onClose={handleClose} open={open}>
            <DialogTitle onClick={e => e.stopPropagation()}>{title}</DialogTitle>
            <DialogContent onClick={e => e.stopPropagation()}>
                {message}
                <Stack direction={"row"} spacing={4} alignItems={"center"}>
                    <Button variant="text" sx={{flexGrow: 1}}
                            onClick={(e) => handleClose(e, 'confirm')}>
                        Potwierdź
                    </Button>
                    <Button variant="text" sx={{flexGrow: 1}}
                            onClick={(e) => handleClose(e, 'cancel')}>
                        Anuluj
                    </Button>
                </Stack>
            </DialogContent>
        </Dialog>
    );
}