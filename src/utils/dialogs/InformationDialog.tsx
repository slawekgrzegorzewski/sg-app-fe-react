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
    const dialogTitleId = React.useId();

    const handleClose = (event?: React.SyntheticEvent) => {
        event?.stopPropagation();
        void onClose();
    };

    return (
        <Dialog
            onClose={() => handleClose()}
            open={open}
            aria-labelledby={dialogTitleId}
            slotProps={{
                backdrop: {
                    'data-testid': 'information-dialog-backdrop',
                } as React.ComponentPropsWithoutRef<'div'>,
            }}
            {...dialogOptions}
            sx={sx}
        >
            <DialogTitle
                id={`${dialogTitleId}-container`}
                onClick={e => e.stopPropagation()}
                sx={{position: 'relative', textAlign: 'center'}}
            >
                <Typography id={dialogTitleId} variant="h4" component="span">
                    {title}
                </Typography>
                <IconButton
                    autoFocus
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
                            <Button variant="text" sx={{flexGrow: 1}} onClick={handleClose}>
                                OK
                            </Button>
                        </Stack>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
