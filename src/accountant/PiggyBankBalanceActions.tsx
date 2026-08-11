import {alpha, IconButton, Stack, Theme, Tooltip} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import RemoveRoundedIcon from '@mui/icons-material/RemoveRounded';
import type {MouseEvent} from 'react';

const actionButtonSx = (paletteName: 'success' | 'error') => (theme: Theme) => {
    const actionColor =
        theme.palette.mode === 'light' ? theme.palette[paletteName].dark : theme.palette[paletteName].light;

    return {
        color: actionColor,
        border: '1px solid',
        borderColor: actionColor,
        bgcolor: alpha(actionColor, 0.06),
        width: {xs: 40, sm: 28},
        height: {xs: 40, sm: 28},
        p: 0,
        '&:hover': {
            bgcolor: alpha(actionColor, 0.14),
        },
    };
};

export interface PiggyBankBalanceActionsProps {
    piggyBankName: string;
    onCredit: () => void;
    onDebit: () => void;
}

export function PiggyBankBalanceActions({piggyBankName, onCredit, onDebit}: PiggyBankBalanceActionsProps) {
    const handleClick = (event: MouseEvent<HTMLButtonElement>, action: () => void) => {
        event.stopPropagation();
        action();
    };

    return (
        <Stack direction="row" alignItems="center" justifyContent="flex-end" spacing={1}>
            <Tooltip title="Dodaj środki">
                <IconButton
                    size="small"
                    aria-label={`Dodaj środki do skarbonki ${piggyBankName}`}
                    sx={actionButtonSx('success')}
                    onClick={event => handleClick(event, onCredit)}
                >
                    <AddRoundedIcon sx={{fontSize: {xs: 16, sm: 14}}} />
                </IconButton>
            </Tooltip>
            <Tooltip title="Odejmij środki">
                <IconButton
                    size="small"
                    aria-label={`Odejmij środki ze skarbonki ${piggyBankName}`}
                    sx={actionButtonSx('error')}
                    onClick={event => handleClick(event, onDebit)}
                >
                    <RemoveRoundedIcon sx={{fontSize: {xs: 16, sm: 14}}} />
                </IconButton>
            </Tooltip>
        </Stack>
    );
}
