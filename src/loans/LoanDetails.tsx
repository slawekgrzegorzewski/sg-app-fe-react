import {Loan} from '../types';
import {Stack, Typography} from '@mui/material';
import * as React from 'react';
import {MouseEventHandler} from 'react';
import {remainingCapital} from './utils/loan-form';
import {CurrencyAmountDisplay} from '../application/components/CurrencyAmountDisplay';
import {RateStrategyDisplay} from './RateStrategyDisplay';
import {RepaymentDayStrategyDisplay} from './RepaymentDayStrategyDisplay';
import {StandOutText} from '../application/components/StandOutText';

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
                sx={{flex: 1, minWidth: 0, cursor: 'pointer'}}
            >
                <Stack direction="row" justifyContent="space-between" alignItems="baseline" gap={2}>
                    <Typography>
                        <StandOutText standOutBy="bold">{loan.name}</StandOutText>
                    </Typography>
                    <Typography sx={{fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap'}}>
                        <StandOutText standOutBy="bold">
                            <CurrencyAmountDisplay {...remainingCapital(loan)} />
                        </StandOutText>
                    </Typography>
                </Stack>
                <Stack direction="row" flexWrap="wrap" gap={1.5} color="text.secondary">
                    <Typography variant="body2">
                        Kwota: <CurrencyAmountDisplay {...loan.paidAmount} />
                    </Typography>
                    <Typography variant="body2">Od: {loan.paymentDate}</Typography>
                    <RateStrategyDisplay rateStrategyConfig={loan.rateStrategyConfig} />
                    <RepaymentDayStrategyDisplay repaymentDayStrategyConfig={loan.repaymentDayStrategyConfig} />
                </Stack>
            </Stack>
        );
    } else
        return (
            <Stack direction="column" spacing={0.5} key={loan.publicId} sx={{minWidth: 0}}>
                <Typography variant="h4" sx={{color: 'secondary.main'}}>
                    {loan.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                    {loan.publicId}
                </Typography>
                <Typography>
                    Kwota pożyczki:{' '}
                    <StandOutText>
                        <CurrencyAmountDisplay {...loan.paidAmount} />
                    </StandOutText>
                </Typography>
                <Typography>
                    Pozostały kapitał:{' '}
                    <StandOutText>
                        <CurrencyAmountDisplay {...remainingCapital(loan)} />
                    </StandOutText>
                </Typography>
                <Typography color="text.secondary">Data wypłaty: {loan.paymentDate}</Typography>
                <RateStrategyDisplay rateStrategyConfig={loan.rateStrategyConfig} />
                <RepaymentDayStrategyDisplay repaymentDayStrategyConfig={loan.repaymentDayStrategyConfig} />
            </Stack>
        );
}
