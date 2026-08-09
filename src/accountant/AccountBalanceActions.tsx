import {IconButton, Stack, Tooltip} from '@mui/material';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import type {MouseEvent} from 'react';

export interface AccountBalanceActionsProps {
    accountName: string;
    onTransfer: () => void;
}

export function AccountBalanceActions({accountName, onTransfer}: AccountBalanceActionsProps) {
    const handleClick = (event: MouseEvent<HTMLButtonElement>, action: () => void) => {
        event.stopPropagation();
        action();
    };

    return (
        <Stack direction="row" alignItems="center" spacing={0.5}>
            <Tooltip title="Przelej z konta">
                <IconButton
                    size="small"
                    color="inherit"
                    aria-label={`Przelej z konta ${accountName}`}
                    onClick={event => handleClick(event, onTransfer)}
                >
                    <SwapHorizIcon />
                </IconButton>
            </Tooltip>
        </Stack>
    );
}
