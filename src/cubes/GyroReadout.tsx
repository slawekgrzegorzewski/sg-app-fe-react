import {Box, Paper, Typography} from '@mui/material';
import {useEffect, useState} from 'react';
import type {RefObject} from 'react';
import type {SmartCubeEvent} from 'smartcube-web-bluetooth';

export type GyroReading = Extract<SmartCubeEvent, {type: 'GYRO'}>;

const formatValue = (value: number) =>
    Number.isFinite(value) ? value.toLocaleString('pl-PL', {minimumFractionDigits: 4, maximumFractionDigits: 4}) : '—';

export function GyroReadout({reading}: {reading: RefObject<GyroReading | null>}) {
    const [sample, setSample] = useState(reading.current);

    useEffect(() => {
        // Odświeżamy tylko panel; surowe zdarzenia nadal trafiają do nagrania bez ograniczeń.
        const timer = setInterval(() => setSample(reading.current), 100);
        return () => clearInterval(timer);
    }, [reading]);

    return (
        <Paper component="aside" aria-label="Bieżący odczyt GYRO" variant="outlined" sx={{p: 2, minWidth: 0}}>
            <Typography component="h2" variant="h6">
                GYRO
            </Typography>
            <Typography variant="caption" color="text.secondary">
                Surowy odczyt z kostki
            </Typography>
            {sample ? (
                <>
                    <Box
                        component="dl"
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: 'auto minmax(0, 1fr)',
                            gap: 1,
                            my: 1.5,
                            '& dt': {color: 'text.secondary'},
                            '& dd': {
                                m: 0,
                                textAlign: 'right',
                                fontVariantNumeric: 'tabular-nums',
                                overflowWrap: 'anywhere',
                            },
                        }}
                    >
                        {(['w', 'x', 'y', 'z'] as const).map(axis => (
                            <Box key={axis} sx={{display: 'contents'}}>
                                <Typography component="dt" variant="body2">
                                    q.{axis}
                                </Typography>
                                <Typography component="dd" variant="body2">
                                    {formatValue(sample.quaternion[axis])}
                                </Typography>
                            </Box>
                        ))}
                    </Box>
                    {sample.velocity && (
                        <>
                            <Typography variant="caption" color="text.secondary">
                                Prędkość obrotowa
                            </Typography>
                            <Box
                                component="dl"
                                sx={{
                                    display: 'grid',
                                    gridTemplateColumns: 'auto minmax(0, 1fr)',
                                    gap: 1,
                                    my: 1,
                                    '& dt': {color: 'text.secondary'},
                                    '& dd': {
                                        m: 0,
                                        textAlign: 'right',
                                        fontVariantNumeric: 'tabular-nums',
                                        overflowWrap: 'anywhere',
                                    },
                                }}
                            >
                                {(['x', 'y', 'z'] as const).map(axis => (
                                    <Box key={axis} sx={{display: 'contents'}}>
                                        <Typography component="dt" variant="body2">
                                            {axis}
                                        </Typography>
                                        <Typography component="dd" variant="body2">
                                            {formatValue(sample.velocity![axis])}
                                        </Typography>
                                    </Box>
                                ))}
                            </Box>
                        </>
                    )}
                </>
            ) : (
                <Typography variant="body2" color="text.secondary" sx={{mt: 1.5}}>
                    Oczekiwanie na dane żyroskopu…
                </Typography>
            )}
        </Paper>
    );
}
