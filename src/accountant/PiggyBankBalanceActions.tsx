import {Badge, IconButton, Stack, Tooltip} from '@mui/material';
import SavingsOutlinedIcon from '@mui/icons-material/SavingsOutlined';
import type {MouseEvent} from 'react';

const PIGGY_BANK_ACTION_BADGE_SX = {
    '& .MuiBadge-badge': {
        zIndex: 0,
        minWidth: 13,
        height: 13,
        padding: 0,
        fontSize: '0.625rem',
        fontWeight: 700,
    },
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

    const actionIcon = (badgeContent: string, color: 'success' | 'error') => (
        <Badge
            badgeContent={badgeContent}
            color={color}
            overlap="circular"
            anchorOrigin={{vertical: 'top', horizontal: 'left'}}
            sx={PIGGY_BANK_ACTION_BADGE_SX}
        >
            <SavingsOutlinedIcon fontSize="medium" sx={{position: 'relative', zIndex: 1}} />
        </Badge>
    );

    return (
        <Stack direction="row" alignItems="center" justifyContent="flex-end" spacing={0.5}>
            <Tooltip title="Uznaj">
                <IconButton
                    size="small"
                    color="inherit"
                    aria-label={`Uznaj skarbonkę ${piggyBankName}`}
                    onClick={event => handleClick(event, onCredit)}
                >
                    {actionIcon('+', 'success')}
                </IconButton>
            </Tooltip>
            <Tooltip title="Obciąż">
                <IconButton
                    size="small"
                    color="inherit"
                    aria-label={`Obciąż skarbonkę ${piggyBankName}`}
                    onClick={event => handleClick(event, onDebit)}
                >
                    {actionIcon('−', 'error')}
                </IconButton>
            </Tooltip>
        </Stack>
    );
}
