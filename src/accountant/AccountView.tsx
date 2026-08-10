import {Account} from '../types';
import React, {useState} from 'react';
import {ButtonBase, Stack, useTheme} from '@mui/material';
import Typography from '@mui/material/Typography';
import {compactListRow} from '../utils/theme/utils';
import {AccountTransactions} from './AccountTransactions';
import {FormattedMoneyText} from '../application/components/FormattedMoneyText';
import {AccountBalanceActions} from './AccountBalanceActions';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import Decimal from 'decimal.js';

export interface AccountViewProps {
    account: Account;
    accounts: Account[];
    onTransfer: () => void;
    onTransferCompleted: () => Promise<unknown>;
}

export function AccountView({account, accounts, onTransfer, onTransferCompleted}: AccountViewProps) {
    const theme = useTheme();
    const [expanded, setExpanded] = useState(false);
    const balance = new Decimal(account.currentBalance.amount);
    const balanceColor = balance.isNegative()
        ? theme.palette.mode === 'light'
            ? theme.palette.error.dark
            : theme.palette.error.light
        : theme.palette.text.primary;

    return (
        <>
            <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                spacing={0.5}
                sx={compactListRow(theme)}
            >
                <ButtonBase
                    aria-haspopup="dialog"
                    aria-expanded={expanded}
                    onClick={() => setExpanded(true)}
                    sx={{
                        flex: 1,
                        minWidth: 0,
                        borderRadius: 1,
                        py: 0.35,
                        '&:focus-visible': {
                            outline: '2px solid',
                            outlineColor: 'primary.main',
                            outlineOffset: 2,
                        },
                    }}
                >
                    <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1} width="100%">
                        <Typography textAlign="left" sx={{minWidth: 0, overflowWrap: 'anywhere'}}>
                            {account.name}
                        </Typography>
                        <Stack direction="row" alignItems="center" spacing={0.5}>
                            <FormattedMoneyText
                                money={{
                                    amount: account.currentBalance.amount,
                                    currency: account.currentBalance.currency.code,
                                }}
                                parenthesizeNegative
                                sx={{color: balanceColor, fontWeight: 600, whiteSpace: 'nowrap'}}
                            >
                                {formattedValue => <>{formattedValue}</>}
                            </FormattedMoneyText>
                            <ChevronRightRoundedIcon fontSize="small" sx={{color: 'text.secondary'}} />
                        </Stack>
                    </Stack>
                </ButtonBase>
                <AccountBalanceActions accountName={account.name} onTransfer={onTransfer} />
            </Stack>
            {expanded && (
                <AccountTransactions
                    key={'at' + account.publicId}
                    account={account}
                    accounts={accounts}
                    onTransferCompleted={onTransferCompleted}
                    onClose={() => {
                        setExpanded(false);
                        return Promise.resolve();
                    }}
                />
            )}
        </>
    );
}
