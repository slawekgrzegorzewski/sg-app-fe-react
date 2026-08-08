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

const BY_DATE = (account: Account) => ComparatorBuilder
    .comparingByDate<AccountTransactionShortFragment>(t => dayjs(t.timeOfTransaction).toDate())
    .thenComparing(({source, debit, credit}) =>
        (source?.publicId === account.publicId ? debit : credit)?.amount ?? 0
    )
    .build();
const YEAR_MONTH_GRAPHQL_FORMAT = "YYYY-MM";
const YEAR_MONTH_DISPLAY_FORMAT = "MMMM YYYY";

export interface AccountTransactionsProps {
    account: Account;
    onClose?: () => Promise<void>;
}

export function AccountTransactions({account, onClose}: AccountTransactionsProps) {
    const isTouchDevice = useMediaQuery('(pointer: coarse)');
    const [yearMonth, setYearMonth] = useState(dayjs());
    const {
        loading,
        error,
        data
    } = useQuery<GetAccountTransactionsQuery>(GetAccountTransactions, {
        variables: {
            publicId: account.publicId,
            yearMonth: yearMonth.format(YEAR_MONTH_GRAPHQL_FORMAT)
        }
    });

    if (loading) {
        return <></>
    } else if (error) {
        return <ErrorDisplay error={error}/>
    } else if (data) {
        return <InformationDialog title={'Transakcje dla konta ' + account.name}
                                  open={true}
                                  onClose={() => {
                                      return onClose?.() ?? Promise.resolve();
                                  }}
                                  dialogOptions={{fullScreen: isTouchDevice}}
                                  sx={[
                                      almostFullHeightDialog,
                                      {
                                          '& .MuiDialog-paper': {maxWidth: '800px', width: '800px'}
                                      }]}>
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
                        {yearMonth.subtract(1, 'month').locale(navigator.language).format(YEAR_MONTH_DISPLAY_FORMAT)}
                    </Button>

                    <Typography
                        variant="subtitle1"
                        fontWeight="bold">
                        {yearMonth.locale(navigator.language).format(YEAR_MONTH_DISPLAY_FORMAT)}
                    </Typography>

                    <Button onClick={() => setYearMonth(yearMonth.add(1, 'month'))}
                            sx={{cursor: 'pointer', fontSize: '0.9rem',}}>
                        {yearMonth.add(1, 'month').locale(navigator.language).format(YEAR_MONTH_DISPLAY_FORMAT)}
                    </Button>
                </Stack>

                <Stack>
                    {data.financeManagement.accounts.length === 0 ? [] : [...data.financeManagement.accounts[0].transactions]
                        .sort(BY_DATE(account))
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
