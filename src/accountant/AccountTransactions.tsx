import {ErrorDisplay} from "../application/components/QueryState";
import {useQuery} from "@apollo/client/react";
import {Account, AccountTransactionShortFragment, GetAccountTransactions, GetAccountTransactionsQuery} from "../types";
import React, {useState} from "react";
import {Box, Stack, useMediaQuery} from "@mui/material";
import InformationDialog from "../utils/dialogs/InformationDialog";
import dayjs from "dayjs";
import Typography from "@mui/material/Typography";
import {formatMonetaryAmount} from "../utils/functions";
import Button from "@mui/material/Button";
import {almostFullHeightDialog} from "../utils/theme/utils";
import {ComparatorBuilder} from "../utils/comparator-builder";
import {OverflowTooltip} from "../utils/OverflowTooltip";

const BY_DATE = ComparatorBuilder.comparingByDate<AccountTransactionShortFragment>(t => dayjs(t.timeOfTransaction).toDate()).build();

export interface AccountTransactionsProps {
    account: Account;
}

export function AccountTransactions({account}: AccountTransactionsProps) {
    const isTouchDevice = useMediaQuery('(pointer: coarse)');
    const [expanded, setExpanded] = useState(true)
    const [yearMonth, setYearMonth] = useState(dayjs());
    const {
        loading,
        error,
        data
    } = useQuery<GetAccountTransactionsQuery>(GetAccountTransactions, {
        variables: {
            publicId: account.publicId,
            yearMonth: yearMonth.format('YYYY-MM')
        }
    });

    if (loading) {
        return <></>
    } else if (error) {
        return <ErrorDisplay error={error}/>
    } else if (data) {
        return <InformationDialog title={'Transakcje dla konta ' + account.name}
                                  open={expanded}
                                  onClose={() => {
                                      setExpanded(false);
                                      return Promise.resolve();
                                  }}
                                  dialogOptions={{fullScreen: isTouchDevice}}
                                  sx={almostFullHeightDialog}>
            <Stack direction="column">
                <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                    sx={{
                        px: 1.5,
                        py: 1,
                        mb: 1,
                    }}>
                    <Button onClick={() => setYearMonth(yearMonth.subtract(1, 'month'))}
                            sx={{cursor: 'pointer', fontSize: '0.9rem',}}>
                        {yearMonth.subtract(1, 'month').format('YYYY-MM')}
                    </Button>

                    <Typography
                        variant="subtitle1"
                        fontWeight="bold">
                        {yearMonth.format('YYYY-MM')}
                    </Typography>

                    <Button onClick={() => setYearMonth(yearMonth.add(1, 'month'))}
                            sx={{cursor: 'pointer', fontSize: '0.9rem',}}>
                        {yearMonth.add(1, 'month').format('YYYY-MM')}
                    </Button>
                </Stack>

                <Stack>
                    {data.financeManagement.accounts.length === 0 ? [] : [...data.financeManagement.accounts[0].transactions]
                        .sort(BY_DATE)
                        .map(
                            (transaction) => (
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
                                    }}>
                                    <Box
                                        sx={{
                                            width: 100,
                                            flexShrink: 0,
                                            color: 'text.secondary',
                                            fontSize: '0.875rem',
                                        }}>
                                        {dayjs(transaction.timeOfTransaction).format(
                                            'YYYY-MM-DD'
                                        )}
                                    </Box>

                                    <Box
                                        sx={{
                                            width: 110,
                                            flexShrink: 0,
                                            textAlign: 'right',
                                            fontWeight: 500,
                                            fontVariantNumeric: 'tabular-nums',
                                        }}>
                                        {formatMonetaryAmount(
                                            transaction.source?.publicId === account.publicId
                                                ? transaction.debit!
                                                : transaction.credit!
                                        )}
                                    </Box>

                                    <OverflowTooltip>
                                        {transaction.description}
                                    </OverflowTooltip>
                                </Stack>
                            )
                        )}
                </Stack>
            </Stack>
        </InformationDialog>
    } else {
        return <></>;
    }
}