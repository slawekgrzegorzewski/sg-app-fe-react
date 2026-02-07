import {Dialog, DialogTitle, List, ListItem, ListItemButton, ListItemText, Theme} from "@mui/material";
import * as React from "react";
import {SxProps} from "@mui/system";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";

export interface PickDialogProps<T> {
    title: string;
    options: T[];
    idExtractor: (object: T) => string;
    descriptionExtractor: (object: T) => string;
    open: boolean;
    onClose: () => void;
    onPick: (value: T) => void;
    containerProvider?: (sx: SxProps<Theme>, additionalProperties: any) => React.JSX.Element
    elementContainerProvider?: (sx: SxProps<Theme>, additionalProperties: any, element: T) => React.JSX.Element
}

export default function PickDialog<T>({
                                          title,
                                          onClose,
                                          onPick,
                                          open,
                                          options,
                                          idExtractor,
                                          descriptionExtractor,
                                          containerProvider,
                                          elementContainerProvider
                                      }: PickDialogProps<T>) {

    const DEFAULT_CONTAINER_PROVIDER = (sx: SxProps<Theme>, additionalProperties: any) => {
        return <List sx={{pt: 0, ...sx}} {...additionalProperties}></List>;
    };

    const DEFAULT_ELEMENT_CONTAINER_PROVIDER = (sx: SxProps<Theme>, additionalProperties: any, element: T) => {
        return <ListItem sx={sx} {...additionalProperties} disableGutters key={idExtractor(element)}>
            <ListItemButton>
                <ListItemText primary={descriptionExtractor(element)}/>
            </ListItemButton>
        </ListItem>;
    };

    if (!containerProvider || !elementContainerProvider) {
        containerProvider = DEFAULT_CONTAINER_PROVIDER;
        elementContainerProvider = DEFAULT_ELEMENT_CONTAINER_PROVIDER;
    }

    return (
        <Dialog onClose={() => onClose()} open={open} fullScreen>
            <DialogTitle>{title}</DialogTitle>
            <IconButton
                aria-label="close"
                onClick={() => onClose()}
                sx={(theme) => ({
                    position: 'absolute',
                    right: 8,
                    top: 8,
                    color: theme.palette.grey[500],
                })}
            >
                <CloseIcon/>
            </IconButton>
            {
                containerProvider(
                    {},
                    {
                        children: options.map((option) => (
                            elementContainerProvider!(
                                {},
                                {
                                    key: idExtractor(option),
                                    onClick: () => onPick(option)
                                },
                                option)))
                    })
            }
        </Dialog>
    );
}