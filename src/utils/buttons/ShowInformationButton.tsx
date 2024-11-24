import * as React from "react";
import {useState} from "react";
import {Box} from "@mui/material";
import InformationDialog, {InformationDialogProps} from "../dialogs/InformationDialog";

export type ShowInformationButtonProps = Omit<InformationDialogProps, 'open'> & {
    buttonContent: React.ReactNode
}

export function ShowInformationButton(props: ShowInformationButtonProps) {

    const {title, message, children, onClose, buttonContent} = props;

    const [dialogOpen, setDialogOpen] = useState(false);

    function openDialog(e: React.MouseEvent<HTMLElement>) {
        setDialogOpen(true);
        e.stopPropagation();
    }

    const doButtonAction = (action: () => Promise<void>): Promise<void> => {
        return action().finally(() => setDialogOpen(false));
    };

    return <>
        <Box onClick={openDialog}>
            {buttonContent!}
        </Box>
        <InformationDialog title={title}
                           message={message}
                           open={dialogOpen}
                           onClose={() => {
                               return doButtonAction(() => onClose());
                           }}>
            {children}
        </InformationDialog>
    </>
}