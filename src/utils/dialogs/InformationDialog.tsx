import {Button, Dialog, DialogContent, DialogTitle, Stack} from "@mui/material";
import * as React from "react";
import {useContext} from "react";
import {ShowBackdropContext} from "../DrawerAppBar";

export interface InformationDialogProps {
    title: string,
    message?: string,
    children?: React.JSX.Element;
    open: boolean;
    onClose: () => Promise<void>;
}

export default function InformationDialog(props: InformationDialogProps) {
    const {setShowBackdrop} = useContext(ShowBackdropContext);

    const {title, message, children, open, onClose} = props;

    const doButtonAction = (action: () => Promise<void>) => {
        setShowBackdrop(true);
        action().finally(() => setShowBackdrop(false));
    };

    const handleClose = (e: React.MouseEvent<HTMLElement>, r: string) => {
        e.stopPropagation();
        if (!['backdropClick', 'escapeKeyDown', 'cancel'].includes(r)) {
            doButtonAction(() => onClose());
        } else {
            doButtonAction(() => onClose());
        }
    };

    return (
        <Dialog onClose={handleClose} open={open}>
            <DialogTitle onClick={e => e.stopPropagation()}>{title}</DialogTitle>
            <DialogContent onClick={e => e.stopPropagation()}>
                {children
                    ? children
                    : (
                        <div>{message}
                            <Stack direction={"row"} spacing={4} alignItems={"center"}>
                                <Button variant="text" sx={{flexGrow: 1}}
                                        onClick={(e) => handleClose(e, 'confirm')}>
                                    OK
                                </Button>
                            </Stack>
                        </div>
                    )}

            </DialogContent>
        </Dialog>
    );
}