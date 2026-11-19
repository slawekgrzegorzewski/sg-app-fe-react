import {ComponentProps, useId, useState} from 'react';
import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    Link,
    Stack,
    Tooltip,
    Typography,
} from '@mui/material';
import AutoAwesomeOutlinedIcon from '@mui/icons-material/AutoAwesomeOutlined';
import CloseIcon from '@mui/icons-material/Close';
import Markdown from 'markdown-to-jsx';
import dayjs from 'dayjs';
import {formatStopWatchTime} from '../StopWatchDisplay';

type CrossAttemptReviewButtonProps = {
    review: string;
    performedAt: string;
    durationMs: number;
};

function ReviewTable(props: ComponentProps<'table'>) {
    return (
        <Box sx={{overflowX: 'auto', my: 2}}>
            <table {...props}/>
        </Box>
    );
}

export function CrossAttemptReviewButton({review, performedAt, durationMs}: CrossAttemptReviewButtonProps) {
    const [open, setOpen] = useState(false);
    const titleId = useId();
    const close = () => setOpen(false);

    return (
        <>
            <Tooltip title="Zobacz ocenę AI">
                <IconButton
                    size="small"
                    aria-label="Pokaż ocenę AI"
                    aria-haspopup="dialog"
                    onClick={() => setOpen(true)}
                    sx={{color: 'text.primary', bgcolor: 'action.hover', flexShrink: 0}}
                >
                    <AutoAwesomeOutlinedIcon fontSize="small"/>
                </IconButton>
            </Tooltip>
            <Dialog
                    open={open}
                    onClose={close}
                    aria-labelledby={titleId}
                    fullWidth
                    maxWidth="md"
                    sx={{'& .MuiDialog-paper': {m: {xs: 1, sm: 4}, width: {xs: 'calc(100% - 16px)', sm: '100%'}}}}
            >
                <DialogTitle id={titleId} sx={{px: {xs: 2, sm: 3}, py: 2}}>
                    <Stack direction="row" alignItems="center" spacing={1.5}>
                        <Box sx={{p: 1, display: 'flex', bgcolor: 'action.hover', borderRadius: 2}}>
                            <AutoAwesomeOutlinedIcon/>
                        </Box>
                        <Box sx={{flex: 1, minWidth: 0}}>
                            <Typography component="span" variant="h3">Ocena AI · CROSS</Typography>
                            <Typography variant="body2" color="text.secondary" sx={{mt: 0.5}}>
                                {dayjs(performedAt).format('DD.MM.YYYY · HH:mm')} · {formatStopWatchTime(durationMs)}
                            </Typography>
                        </Box>
                        <IconButton onClick={close} aria-label="Zamknij ocenę AI">
                            <CloseIcon/>
                        </IconButton>
                    </Stack>
                </DialogTitle>
                <DialogContent dividers sx={{px: {xs: 2, sm: 3}, py: 2.5}}>
                    <Box
                            sx={{
                                color: 'text.primary',
                                fontSize: '0.9375rem',
                                lineHeight: 1.75,
                                overflowWrap: 'anywhere',
                                '& > div > :first-of-type': {mt: 0},
                                '& > div > :last-child': {mb: 0},
                                '& h1, & h2, & h3, & h4, & h5, & h6': {
                                    fontSize: '1.125rem', fontWeight: 700, lineHeight: 1.4, mt: 3, mb: 1,
                                },
                                '& h1': {fontSize: '1.375rem'},
                                '& h2': {fontSize: '1.25rem'},
                                '& p, & ul, & ol': {my: 1.5},
                                '& ul, & ol': {pl: 3},
                                '& li + li': {mt: 0.5},
                                '& blockquote': {
                                    mx: 0, my: 2, px: 2, py: 0.5,
                                    borderLeft: '3px solid', borderColor: 'divider', bgcolor: 'action.hover',
                                },
                                '& code': {
                                    fontFamily: 'monospace', fontSize: '0.875em',
                                    bgcolor: 'action.hover', px: 0.5, py: 0.25, borderRadius: 0.5,
                                },
                                '& pre': {overflowX: 'auto', p: 2, bgcolor: 'action.hover', borderRadius: 1},
                                '& pre code': {bgcolor: 'transparent', p: 0},
                                '& table': {borderCollapse: 'collapse', width: '100%', fontSize: '0.875rem'},
                                '& th, & td': {borderBottom: '1px solid', borderColor: 'divider', p: 1, textAlign: 'left'},
                                '& th': {bgcolor: 'action.hover', fontWeight: 600},
                                '& hr': {border: 0, borderTop: '1px solid', borderColor: 'divider', my: 3},
                            }}
                    >
                        <Markdown options={{
                            forceBlock: true,
                            forceWrapper: true,
                            disableParsingRawHTML: true,
                            overrides: {
                                a: {component: Link, props: {target: '_blank', rel: 'noopener noreferrer', color: 'inherit'}},
                                table: {component: ReviewTable},
                                img: {component: () => null},
                            },
                        }}>
                            {review}
                        </Markdown>
                    </Box>
                </DialogContent>
                <DialogActions sx={{px: {xs: 2, sm: 3}, py: 1.5}}>
                    <Button onClick={close} variant="outlined" color="inherit">Zamknij</Button>
                </DialogActions>
            </Dialog>
        </>
    );
}
