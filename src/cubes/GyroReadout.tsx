import {Box, Typography} from '@mui/material';
import {useEffect, useState} from 'react';
import type {RefObject} from 'react';
import type {SmartCubeEvent} from 'smartcube-web-bluetooth';

export type GyroReading = Extract<SmartCubeEvent, {type: 'GYRO'}>;

const formatValue = (value: number) =>
    Number.isFinite(value) ? value.toLocaleString('pl-PL', {minimumFractionDigits: 4, maximumFractionDigits: 4}) : '—';

export function GyroReadout({reading}: {reading: RefObject<GyroReading | null>}) {
    const [sample, setSample] = useState(reading.current);

    useEffect(() => {
        const timer = setInterval(() => setSample(reading.current), 100);
        return () => clearInterval(timer);
    }, [reading]);

    return (
        <Box
            component="aside"
            aria-label="Bieżący odczyt GYRO"
            sx={{
                position: 'absolute',
                top: 0,
                right: 0,
                p: 1,
                zIndex: 1,
                color: 'text.secondary',
                pointerEvents: 'none',
                fontSize: '0.6875rem',
                lineHeight: 1.4,
                fontVariantNumeric: 'tabular-nums',
            }}
        >
            {sample ? (
                <Box
                    component="dl"
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: 'auto auto',
                        columnGap: 1,
                        m: 0,
                        '& dd': {m: 0, textAlign: 'right'},
                    }}
                >
                    {(['w', 'x', 'y', 'z'] as const).map(axis => (
                        <Box key={axis} sx={{display: 'contents'}}>
                            <Box component="dt">q.{axis}</Box>
                            <Box component="dd">{formatValue(sample.quaternion[axis])}</Box>
                        </Box>
                    ))}
                    {sample.velocity && (
                        <>
                            <Box component="dt" sx={{gridColumn: '1 / -1', mt: 0.5}}>Prędkość obrotowa</Box>
                            {(['x', 'y', 'z'] as const).map(axis => (
                                <Box key={axis} sx={{display: 'contents'}}>
                                    <Box component="dt">{axis}</Box>
                                    <Box component="dd">{formatValue(sample.velocity![axis])}</Box>
                                </Box>
                            ))}
                        </>
                    )}
                </Box>
            ) : (
                <Typography sx={{fontSize: 'inherit', maxWidth: 140, textAlign: 'right'}}>
                    Oczekiwanie na dane żyroskopu…
                </Typography>
            )}
        </Box>
    );
}
