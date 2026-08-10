import {ErrorDisplay} from '../application/components/QueryState';
import {useQuery} from '@apollo/client/react';
import {Account, AccountTransactionShortFragment, GetAccountTransactions, GetAccountTransactionsQuery} from '../types';
import React, {useState} from 'react';
import {Box, Chip, IconButton, Paper, Stack, Tooltip, useMediaQuery, useTheme} from '@mui/material';
import ForwardOutlinedIcon from '@mui/icons-material/ForwardOutlined';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import InformationDialog from '../utils/dialogs/InformationDialog';
import dayjs from 'dayjs';
import 'dayjs/locale/pl';
import Typography from '@mui/material/Typography';
import {almostFullHeightDialog} from '../utils/theme/utils';
import {ComparatorBuilder} from '../utils/comparator-builder';
import {FormattedMoneyText} from '../application/components/FormattedMoneyText';
import Decimal from 'decimal.js';
import {AccountBalanceActionDialog} from './AccountBalanceActionDialog';
import type {AccountBalanceAction} from './AccountBalanceActionDialog';

const BY_DATE = (account: Account) =>
    ComparatorBuilder.comparingByDate<AccountTransactionShortFragment>(t => dayjs(t.timeOfTransaction).toDate())
        .thenComparing(
            ({source, debit, credit}) => (source?.publicId === account.publicId ? debit : credit)?.amount ?? 0
        )
        .build();
const YEAR_MONTH_GRAPHQL_FORMAT = 'YYYY-MM';
const YEAR_MONTH_DISPLAY_FORMAT = 'MMMM YYYY';

export interface AccountTransactionsProps {
    account: Account;
    accounts: Account[];
    onClose?: () => Promise<void>;
    onTransferCompleted: () => Promise<unknown>;
}

export function AccountTransactions({account, accounts, onClose, onTransferCompleted}: AccountTransactionsProps) {
    const isTouchDevice = useMediaQuery('(pointer: coarse)');
    const theme = useTheme();
    const [yearMonth, setYearMonth] = useState(dayjs());
    const [transferAction, setTransferAction] = useState<AccountBalanceAction | null>(null);
    const {loading, error, data, refetch} = useQuery<GetAccountTransactionsQuery>(GetAccountTransactions, {
        variables: {
            publicId: account.publicId,
            yearMonth: yearMonth.format(YEAR_MONTH_GRAPHQL_FORMAT),
        },
    });

    if (loading) {
        return <></>;
    } else if (error) {
        return <ErrorDisplay error={error} />;
    } else if (data) {
        const transactions =
            data.financeManagement.accounts.length === 0
                ? []
                : [...data.financeManagement.accounts[0].transactions].sort(BY_DATE(account));

        return (
            <>
                <InformationDialog
                    title={'Transakcje dla konta ' + account.name}
                    open={true}
                    onClose={() => {
                        return onClose?.() ?? Promise.resolve();
                    }}
                    dialogOptions={{fullScreen: isTouchDevice}}
                    sx={[
                        almostFullHeightDialog,
                        {
                            '& .MuiDialog-paper': {
                                maxWidth: isTouchDevice ? '100%' : '800px',
                                width: isTouchDevice ? '100%' : '800px',
                                ...(isTouchDevice && {
                                    height: '100%',
                                    maxHeight: '100%',
                                    margin: 0,
                                }),
                            },
                        },
                    ]}
                >
                    <Stack direction="column" spacing={2}>
                        <Stack direction="row" alignItems="center" justifyContent="center" spacing={1}>
                            <IconButton
                                aria-label="Poprzedni miesiąc"
                                onClick={() => setYearMonth(yearMonth.subtract(1, 'month'))}
                            >
                                <NavigateBeforeIcon />
                            </IconButton>

                            <Typography
                                variant="h4"
                                textAlign="center"
                                sx={{minWidth: {xs: 150, sm: 190}, color: 'secondary.main'}}
                            >
                                {yearMonth.locale('pl').format(YEAR_MONTH_DISPLAY_FORMAT)}
                            </Typography>

                            <IconButton
                                aria-label="Następny miesiąc"
                                onClick={() => setYearMonth(yearMonth.add(1, 'month'))}
                            >
                                <NavigateNextIcon />
                            </IconButton>
                        </Stack>

                        <Chip
                            size="small"
                            variant="outlined"
                            label={`Liczba transakcji: ${transactions.length}`}
                            sx={{alignSelf: 'flex-end'}}
                        />

                        {transactions.length === 0 ? (
                            <Typography color="text.secondary" textAlign="center" sx={{py: 4}}>
                                Brak transakcji w tym miesiącu.
                            </Typography>
                        ) : (
                            <Stack spacing={1}>
                                {transactions.map(transaction => {
                                    const isCreditTransaction =
                                        transaction.source?.publicId !== account.publicId && !!transaction.credit;
                                    const balance =
                                        transaction.source?.publicId === account.publicId
                                            ? {
                                                  amount: -transaction.debit!.amount,
                                                  currency: transaction.debit!.currency.code,
                                              }
                                            : {
                                                  amount: transaction.credit!.amount,
                                                  currency: transaction.credit!.currency.code,
                                              };
                                    const amountColor = new Decimal(balance.amount).isNegative()
                                        ? theme.palette.mode === 'light'
                                            ? theme.palette.error.dark
                                            : theme.palette.error.light
                                        : theme.palette.text.primary;

                                    return (
                                        <Paper
                                            variant="outlined"
                                            key={transaction.publicId}
                                            sx={{
                                                display: 'grid',
                                                gridTemplateColumns: {
                                                    xs: 'minmax(0, 1fr) auto 36px',
                                                    sm: '105px 125px minmax(0, 1fr) 36px',
                                                },
                                                gridTemplateAreas: {
                                                    xs: '"date amount action" "description description description"',
                                                    sm: '"date amount description action"',
                                                },
                                                columnGap: {xs: 1, sm: 1.5},
                                                rowGap: 0.75,
                                                alignItems: 'center',
                                                p: {xs: 1.25, sm: 1.5},
                                                '&:hover': {bgcolor: 'action.hover'},
                                            }}
                                        >
                                            <Typography
                                                variant="body2"
                                                color="text.secondary"
                                                sx={{gridArea: 'date', whiteSpace: 'nowrap'}}
                                            >
                                                {dayjs(transaction.timeOfTransaction).locale('pl').format('D MMM YYYY')}
                                            </Typography>
                                            <Box sx={{gridArea: 'amount', textAlign: 'right'}}>
                                                <FormattedMoneyText
                                                    money={{
                                                        amount: balance.amount,
                                                        currency: balance.currency,
                                                    }}
                                                    parenthesizeNegative
                                                    sx={{color: amountColor, fontWeight: 600, whiteSpace: 'nowrap'}}
                                                >
                                                    {formattedValue => <>{formattedValue}</>}
                                                </FormattedMoneyText>
                                            </Box>
                                            <Typography
                                                title={transaction.description}
                                                sx={{
                                                    gridArea: 'description',
                                                    minWidth: 0,
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: {xs: 'normal', sm: 'nowrap'},
                                                    overflowWrap: 'anywhere',
                                                }}
                                            >
                                                {transaction.description}
                                            </Typography>
                                            <Box sx={{gridArea: 'action', width: 36}}>
                                                {isCreditTransaction && (
                                                    <Tooltip title="Przelej dalej">
                                                        <IconButton
                                                            size="small"
                                                            color="inherit"
                                                            aria-label={`Przelej dalej: ${transaction.description}`}
                                                            onClick={event => {
                                                                event.stopPropagation();
                                                                setTransferAction({
                                                                    account,
                                                                    initialTransfer: {
                                                                        fromAmount: new Decimal(
                                                                            transaction.credit!.amount
                                                                        ),
                                                                        description: transaction.description,
                                                                        day: dayjs(transaction.timeOfTransaction),
                                                                    },
                                                                    lockDescription: true,
                                                                    dateEditable: true,
                                                                });
                                                            }}
                                                        >
                                                            <ForwardOutlinedIcon />
                                                        </IconButton>
                                                    </Tooltip>
                                                )}
                                            </Box>
                                        </Paper>
                                    );
                                })}
                            </Stack>
                        )}
                    </Stack>
                </InformationDialog>
                {transferAction && (
                    <AccountBalanceActionDialog
                        action={transferAction}
                        accounts={accounts}
                        onClose={() => setTransferAction(null)}
                        onCompleted={async () => {
                            await refetch();
                            await onTransferCompleted();
                        }}
                    />
                )}
            </>
        );
    } else {
        return <></>;
    }
}
