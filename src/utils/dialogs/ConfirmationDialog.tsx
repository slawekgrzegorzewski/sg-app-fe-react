import {Button, Dialog, DialogContent, DialogTitle, Stack} from "@mui/material";
import * as React from "react";

export interface ConfirmationDialogProps {
    companionObject: any,
    title: string,
    message: string,
    open: boolean;
    onClose: (companionObject: any) => void;
    onCancel: (companionObject: any) => void;
}

export default function ConfirmationDialog(props: ConfirmationDialogProps) {
    const {title, message, open, onClose, onCancel, companionObject} = props;
    const handleClose = (e: React.MouseEvent<HTMLElement>, r: string) => {
        e.stopPropagation();
        if (['backdropClick', 'escapeKeyDown', 'cancel'].includes(r)) {
            onCancel(companionObject);
        } else {
            onClose(companionObject);
        }
    };

    return (
        <Dialog onClose={handleClose} open={open} onClick={(e) => e.stopPropagation()}>
            <DialogTitle>{title}</DialogTitle>
            <DialogContent>
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