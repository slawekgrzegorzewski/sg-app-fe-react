import {Button, Dialog, DialogContent, DialogTitle, Stack} from "@mui/material";
import * as React from "react";

export interface ConfirmationDialogProps<T> {
    companionObject: T,
    title: string,
    message: string,
    open: boolean;
    onClose: (companionObject: T) => void;
    onCancel: (companionObject: T) => void;
}

export default function ConfirmationDialog<T>(props: ConfirmationDialogProps<T>) {
    const {title, message, open, onClose, onCancel, companionObject} = props;
    const handleClose = (e: React.MouseEvent<HTMLElement>, r: string) => {
        e.stopPropagation();
        if (['backdropClick', 'escapeKeyDown', 'cancel'].includes(r)) {
            onCancel(companionObject);
        } else {
            onClose(companionObject);
        }
    };

    const handleClickOnDialog = (e: React.MouseEvent<HTMLElement>) => {
        e.stopPropagation();
    };

    return (
        <Dialog onClose={handleClose} open={open}>
            <DialogTitle onClick={handleClickOnDialog}>{title}</DialogTitle>
            <DialogContent onClick={handleClickOnDialog}>
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