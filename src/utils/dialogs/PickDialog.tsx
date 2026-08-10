import {
    Box,
    Dialog,
    DialogContent,
    DialogTitle,
    List,
    ListItem,
    ListItemButton,
    ListItemText,
    Theme,
    Typography,
} from '@mui/material';
import * as React from 'react';
import {SxProps} from '@mui/system';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';

export interface PickDialogProps<T> {
    title: string;
    options: T[];
    idExtractor: (object: T) => string;
    descriptionExtractor: (object: T) => string;
    open: boolean;
    onClose: () => void;
    onPick: (value: T) => void;
    containerProvider?: (sx: SxProps<Theme>, additionalProperties: any) => React.JSX.Element;
    elementContainerProvider?: (sx: SxProps<Theme>, additionalProperties: any, element: T) => React.JSX.Element;
    fullScreen?: boolean;
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
    elementContainerProvider,
    fullScreen = false,
}: PickDialogProps<T>) {
    const dialogTitleId = React.useId();
    const DEFAULT_CONTAINER_PROVIDER = (sx: SxProps<Theme>, additionalProperties: any) => {
        return <List sx={{pt: 0, ...sx}} {...additionalProperties}></List>;
    };

    const DEFAULT_ELEMENT_CONTAINER_PROVIDER = (sx: SxProps<Theme>, additionalProperties: any, element: T) => {
        return (
            <ListItem sx={sx} {...additionalProperties} disableGutters key={idExtractor(element)}>
                <ListItemButton>
                    <ListItemText primary={descriptionExtractor(element)} />
                </ListItemButton>
            </ListItem>
        );
    };

    if (!containerProvider || !elementContainerProvider) {
        containerProvider = DEFAULT_CONTAINER_PROVIDER;
        elementContainerProvider = DEFAULT_ELEMENT_CONTAINER_PROVIDER;
    }

    return (
        <Dialog
            onClose={() => onClose()}
            open={open}
            fullScreen={fullScreen}
            fullWidth
            maxWidth="md"
            aria-labelledby={dialogTitleId}
        >
            <Box display="flex" alignItems="center">
                <DialogTitle id={dialogTitleId} sx={{flex: 1, minWidth: 0, px: {xs: 2, sm: 3}, py: 2}}>
                    {title}
                </DialogTitle>
                <IconButton autoFocus aria-label="Zamknij" onClick={() => onClose()} sx={{mr: {xs: 1, sm: 2}}}>
                    <CloseIcon />
                </IconButton>
            </Box>
            <DialogContent dividers sx={{px: {xs: 2, sm: 3}, py: 2}}>
                {options.length === 0 ? (
                    <Typography color="text.secondary" textAlign="center" sx={{py: 3}}>
                        Brak dostępnych opcji.
                    </Typography>
                ) : (
                    containerProvider(
                        {},
                        {
                            children: options.map(option =>
                                elementContainerProvider!(
                                    {},
                                    {
                                        key: idExtractor(option),
                                        onClick: () => onPick(option),
                                    },
                                    option
                                )
                            ),
                        }
                    )
                )}
            </DialogContent>
        </Dialog>
    );
}
