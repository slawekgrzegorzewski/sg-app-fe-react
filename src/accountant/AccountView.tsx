import {Account} from '../types';
import React, {useState} from 'react';
import {Stack, useTheme} from '@mui/material';
import Typography from '@mui/material/Typography';
import {compactListRow} from '../utils/theme/utils';
import {AccountTransactions} from './AccountTransactions';
import {FormattedMoneyText} from '../application/components/FormattedMoneyText';
import {AccountBalanceActions} from './AccountBalanceActions';

export interface AccountViewProps {
    account: Account;
    accounts: Account[];
    onTransfer: () => void;
    onTransferCompleted: () => Promise<unknown>;
}

export function AccountView({account, accounts, onTransfer, onTransferCompleted}: AccountViewProps) {
    const theme = useTheme();
    const [expanded, setExpanded] = useState(false);
    return (
        <>
            <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                key={account.publicId}
                sx={compactListRow(theme)}
                onClick={e => {
                    e.stopPropagation();
                    setExpanded(true);
                }}
            >
                <Typography>{account.name}</Typography>
                <Stack direction="row" alignItems="center" spacing={0.5}>
                    <FormattedMoneyText
                        money={{
                            amount: account.currentBalance.amount,
                            currency: account.currentBalance.currency.code,
                        }}
                        parenthesizeNegative
                    >
                        {formattedValue => <>{formattedValue}</>}
                    </FormattedMoneyText>
                    <AccountBalanceActions accountName={account.name} onTransfer={onTransfer} />
                </Stack>
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
