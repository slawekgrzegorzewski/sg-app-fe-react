import {Loan} from '../types';
import {Box, Stack, Typography} from '@mui/material';
import * as React from 'react';
import {MouseEventHandler} from 'react';
import {remainingCapital} from './utils/loan-form';
import {CurrencyAmountDisplay} from '../application/components/CurrencyAmountDisplay';
import {RateStrategyDisplay} from './RateStrategyDisplay';
import {RepaymentDayStrategyDisplay} from './RepaymentDayStrategyDisplay';
import {StandOutText} from '../application/components/StandOutText';
import dayjs from 'dayjs';
import 'dayjs/locale/pl';

export type LoanDetailsProp = {
    loan: Loan;
    short?: boolean;
    onClick?: MouseEventHandler<any>;
};

const noOp: MouseEventHandler<any> = () => {};

export function LoanDetails({loan, short = false, onClick = noOp}: LoanDetailsProp) {
    if (short) {
        return (
            <Stack
                direction="column"
                key={loan.publicId}
                onClick={onClick}
                sx={{flex: 1, width: '100%', minWidth: 0, cursor: 'pointer'}}
            >
                <Stack
                    direction={{xs: 'column', sm: 'row'}}
                    justifyContent="space-between"
                    alignItems={{xs: 'flex-start', sm: 'baseline'}}
                    gap={{xs: 0.25, sm: 2}}
                >
                    <Typography>
                        <StandOutText standOutBy="bold">{loan.name}</StandOutText>
                    </Typography>
                    <Typography sx={{fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap'}}>
                        <StandOutText standOutBy="bold">
                            <CurrencyAmountDisplay {...remainingCapital(loan)} />
                        </StandOutText>
                    </Typography>
                </Stack>
                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: {xs: '1fr', md: 'auto auto minmax(0, 1fr) auto'},
                        columnGap: 1.5,
                        rowGap: 0.25,
                        color: 'text.secondary',
                    }}
                >
                    <Typography variant="body2">
                        Kwota: <CurrencyAmountDisplay {...loan.paidAmount} />
                    </Typography>
                    <Typography variant="body2">
                        Od: {dayjs(loan.paymentDate).locale('pl').format('D MMM YYYY')}
                    </Typography>
                    <RateStrategyDisplay rateStrategyConfig={loan.rateStrategyConfig} />
                    <RepaymentDayStrategyDisplay repaymentDayStrategyConfig={loan.repaymentDayStrategyConfig} />
                </Box>
            </Stack>
        );
    } else
        return (
            <Stack spacing={2} key={loan.publicId} sx={{minWidth: 0}}>
                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: {xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))'},
                        gap: 1,
                    }}
                >
                    <Stack sx={{p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1}}>
                        <Typography variant="body2" color="text.secondary">
                            Pozostały kapitał
                        </Typography>
                        <Typography variant="h4" sx={{fontVariantNumeric: 'tabular-nums'}}>
                            <StandOutText standOutBy="both">
                                <CurrencyAmountDisplay {...remainingCapital(loan)} />
                            </StandOutText>
                        </Typography>
                    </Stack>
                    <Stack sx={{p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1}}>
                        <Typography variant="body2" color="text.secondary">
                            Kwota początkowa
                        </Typography>
                        <Typography variant="h4" sx={{fontVariantNumeric: 'tabular-nums'}}>
                            <CurrencyAmountDisplay {...loan.paidAmount} />
                        </Typography>
                    </Stack>
                    <Stack sx={{p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1}}>
                        <Typography variant="body2" color="text.secondary">
                            Data wypłaty
                        </Typography>
                        <Typography fontWeight={600}>
                            {dayjs(loan.paymentDate).locale('pl').format('D MMMM YYYY')}
                        </Typography>
                    </Stack>
                    <Stack sx={{p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1}}>
                        <Typography variant="body2" color="text.secondary">
                            Liczba rat
                        </Typography>
                        <Typography fontWeight={600}>{loan.numberOfInstallments}</Typography>
                    </Stack>
                </Box>

                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: {xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))'},
                        gap: 1,
                    }}
                >
                    <Stack spacing={0.25} sx={{p: 1.5, bgcolor: 'action.hover', borderRadius: 1}}>
                        <Typography variant="body2" fontWeight={600}>
                            {loan.rateStrategyConfig.name}
                        </Typography>
                        <RateStrategyDisplay rateStrategyConfig={loan.rateStrategyConfig} />
                    </Stack>
                    <Stack spacing={0.25} sx={{p: 1.5, bgcolor: 'action.hover', borderRadius: 1}}>
                        <Typography variant="body2" fontWeight={600}>
                            {loan.repaymentDayStrategyConfig.name}
                        </Typography>
                        <RepaymentDayStrategyDisplay repaymentDayStrategyConfig={loan.repaymentDayStrategyConfig} />
                    </Stack>
                </Box>
            </Stack>
        );
}
