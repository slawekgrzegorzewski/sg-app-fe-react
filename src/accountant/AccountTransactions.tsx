import {ErrorDisplay} from '../application/components/QueryState';
import {useQuery} from '@apollo/client/react';
import {Account, AccountTransactionShortFragment, GetAccountTransactions, GetAccountTransactionsQuery} from '../types';
import React, {useState} from 'react';
import {Box, IconButton, Stack, Tooltip, useMediaQuery} from '@mui/material';
import ForwardOutlinedIcon from '@mui/icons-material/ForwardOutlined';
import InformationDialog from '../utils/dialogs/InformationDialog';
import dayjs from 'dayjs';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import {almostFullHeightDialog} from '../utils/theme/utils';
import {ComparatorBuilder} from '../utils/comparator-builder';
import {OverflowTooltip} from '../utils/OverflowTooltip';
import {FormattedMoneyText} from '../application/components/FormattedMoneyText';
import {StandOutText} from '../application/components/StandOutText';
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
                            '& .MuiDialog-paper': {maxWidth: '800px', width: '800px'},
                        },
                    ]}
                >
                    <Stack direction="column">
                        <Stack
                            direction="row"
                            alignItems="center"
                            justifyContent="space-between"
                            sx={{
                                px: 1.5,
                                py: 1,
                                mb: 1,
                            }}
                        >
                            <Button
                                onClick={() => setYearMonth(yearMonth.subtract(1, 'month'))}
                                sx={{cursor: 'pointer', fontSize: '0.9rem'}}
                            >
                                {yearMonth
                                    .subtract(1, 'month')
                                    .locale(navigator.language)
                                    .format(YEAR_MONTH_DISPLAY_FORMAT)}
                            </Button>

                            <Typography variant="subtitle1">
                                <StandOutText standOutBy="bold">
                                    {yearMonth.locale(navigator.language).format(YEAR_MONTH_DISPLAY_FORMAT)}
                                </StandOutText>
                            </Typography>

                            <Button
                                onClick={() => setYearMonth(yearMonth.add(1, 'month'))}
                                sx={{cursor: 'pointer', fontSize: '0.9rem'}}
                            >
                                {yearMonth.add(1, 'month').locale(navigator.language).format(YEAR_MONTH_DISPLAY_FORMAT)}
                            </Button>
                        </Stack>

                        <Stack>
                            {data.financeManagement.accounts.length === 0
                                ? []
                                : [...data.financeManagement.accounts[0].transactions]
                                      .sort(BY_DATE(account))
                                      .map(transaction => {
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
                                          return (
                                              <Stack
                                                  key={transaction.publicId}
                                                  direction="row"
                                                  alignItems="center"
                                                  spacing={2}
                                                  sx={{
                                                      px: 1.5,
                                                      py: 0.2,
                                                      borderBottom: '1px solid',
                                                      borderColor: 'divider',
                                                      '&:hover': {
                                                          bgcolor: 'action.hover',
                                                      },
                                                  }}
                                              >
                                                  <Box
                                                      sx={{
                                                          width: 100,
                                                          flexShrink: 0,
                                                          color: 'text.secondary',
                                                          fontSize: '0.875rem',
                                                      }}
                                                  >
                                                      {dayjs(transaction.timeOfTransaction).format('YYYY-MM-DD')}
                                                  </Box>
                                                  <FormattedMoneyText
                                                      money={{
                                                          amount: balance.amount,
                                                          currency: balance.currency,
                                                      }}
                                                      parenthesizeNegative
                                                  >
                                                      {formattedValue => <>{formattedValue}</>}
                                                  </FormattedMoneyText>
                                                  <OverflowTooltip>{transaction.description}</OverflowTooltip>
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
                                              </Stack>
                                          );
                                      })}
                        </Stack>
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
