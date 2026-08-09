import {Button, Dialog, DialogContent, DialogTitle, Stack, Theme} from '@mui/material';
import * as React from 'react';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import {SxProps} from '@mui/system';

export interface InformationDialogProps {
    title: string;
    message?: string;
    children?: React.JSX.Element;
    open: boolean;
    onClose: () => Promise<void>;
    dialogOptions?: {
        fullScreen?: boolean;
    };
    sx?: SxProps<Theme>;
}

export default function InformationDialog(props: InformationDialogProps) {
    const {title, message, children, open, onClose, dialogOptions, sx} = props;

    const handleClose = (e: React.MouseEvent<HTMLElement>, _: string = '') => {
        e.stopPropagation();
        onClose();
    };

    return (
        <Dialog onClose={handleClose} open={open} {...dialogOptions} sx={sx}>
            <DialogTitle onClick={e => e.stopPropagation()} sx={{position: 'relative', textAlign: 'center'}}>
                <Typography variant="h4" component="span">
                    {title}
                </Typography>
                <IconButton
                    aria-label="Zamknij"
                    onClick={handleClose}
                    sx={{
                        position: 'absolute',
                        right: 8,
                        top: '50%',
                        transform: 'translateY(-50%)',
                    }}
                >
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            <DialogContent onClick={e => e.stopPropagation()}>
                {children ? (
                    children
                ) : (
                    <div>
                        {message}
                        <Stack direction="row" spacing={4} alignItems="center">
                            <Button variant="text" sx={{flexGrow: 1}} onClick={e => handleClose(e, 'confirm')}>
                                OK
                            </Button>
                        </Stack>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
