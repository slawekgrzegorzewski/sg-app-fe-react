import {Button, Dialog, DialogContent, DialogTitle, Stack} from "@mui/material";
import * as React from "react";
import {useContext} from "react";
import {ShowBackdropContext} from "../DrawerAppBar";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";

export interface InformationDialogProps {
    title: string,
    message?: string,
    children?: React.JSX.Element;
    open: boolean;
    onClose: () => Promise<void>;
    dialogOptions?: any
}

export default function InformationDialog(props: InformationDialogProps) {
    const {setShowBackdrop} = useContext(ShowBackdropContext);

    const {title, message, children, open, onClose, dialogOptions} = props;

    const doButtonAction = (action: () => Promise<void>) => {
        setShowBackdrop(true);
        action().finally(() => setShowBackdrop(false));
    };

    const handleClose = (e: React.MouseEvent<HTMLElement>, r: string = '') => {
        e.stopPropagation();
        if (!['backdropClick', 'escapeKeyDown', 'cancel'].includes(r)) {
            doButtonAction(() => onClose());
        } else {
            doButtonAction(() => onClose());
        }
    };

    return (
        <Dialog onClose={handleClose} open={open} {...dialogOptions}>
            <DialogTitle onClick={e => e.stopPropagation()}>
                <Stack direction={'row'} justifyContent={'space-between'}>
                    <Typography variant={"h4"}>{title}</Typography>
                    <IconButton onClick={handleClose}>
                        <CloseIcon/>
                    </IconButton>
                </Stack>
            </DialogTitle>
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