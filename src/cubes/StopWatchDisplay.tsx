import {Box} from '@mui/material';
import {TypographyVariant} from '@mui/material/styles/createTypography';
import {JSX} from 'react';

interface StopWatchDisplayProps {
    currentTimeInMillis: number;
    variant?: TypographyVariant;
}

type SegmentName = 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g';

const DIGIT_SEGMENTS: Record<string, SegmentName[]> = {
    '0': ['a', 'b', 'c', 'd', 'e', 'f'],
    '1': ['b', 'c'],
    '2': ['a', 'b', 'd', 'e', 'g'],
    '3': ['a', 'b', 'c', 'd', 'g'],
    '4': ['b', 'c', 'f', 'g'],
    '5': ['a', 'c', 'd', 'f', 'g'],
    '6': ['a', 'c', 'd', 'e', 'f', 'g'],
    '7': ['a', 'b', 'c'],
    '8': ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
    '9': ['a', 'b', 'c', 'd', 'f', 'g'],
};

const SEGMENT_GEOMETRY: Record<SegmentName, {x: number; y: number; width: number; height: number}> = {
    a: {x: 2, y: 0, width: 8, height: 2},
    b: {x: 10, y: 2, width: 2, height: 8},
    c: {x: 10, y: 12, width: 2, height: 8},
    d: {x: 2, y: 20, width: 8, height: 2},
    e: {x: 0, y: 12, width: 2, height: 8},
    f: {x: 0, y: 2, width: 2, height: 8},
    g: {x: 2, y: 10, width: 8, height: 2},
};

const VARIANT_HEIGHT: Partial<Record<TypographyVariant, number>> = {
    h1: 104,
    h2: 80,
    h3: 64,
    h4: 52,
    h5: 40,
    h6: 34,
    subtitle1: 32,
    subtitle2: 28,
    body1: 30,
    body2: 26,
    caption: 22,
    overline: 22,
    button: 26,
};

export function formatStopWatchTime(currentTimeInMillis: number): string {
    const normalizedTime = Math.max(0, Math.floor(currentTimeInMillis));
    const millis = normalizedTime % 1000;
    const seconds = Math.floor(normalizedTime / 1000);
    const secondsInMinute = seconds % 60;
    const minutes = Math.floor(seconds / 60);

    return `${String(minutes).padStart(2, '0')}:${String(secondsInMinute).padStart(2, '0')}.${String(millis).padStart(
        3,
        '0'
    )}`;
}

function SegmentDigit({digit, x}: {digit: string; x: number}) {
    const activeSegments = new Set(DIGIT_SEGMENTS[digit]);

    return (
        <g transform={`translate(${x} 1)`} data-digit={digit} aria-hidden="true">
            {(Object.entries(SEGMENT_GEOMETRY) as Array<[SegmentName, (typeof SEGMENT_GEOMETRY)[SegmentName]]>).map(
                ([segment, geometry]) => (
                    <rect
                        key={segment}
                        {...geometry}
                        rx={0.8}
                        fill="currentColor"
                        opacity={activeSegments.has(segment) ? 1 : 0.08}
                    />
                )
            )}
        </g>
    );
}

export function StopWatchDisplay({currentTimeInMillis, variant = 'h5'}: StopWatchDisplayProps): JSX.Element {
    const formattedTime = formatStopWatchTime(currentTimeInMillis);
    let cursor = 0;
    const glyphs = [...formattedTime].map((character, index) => {
        const x = cursor;

        if (character === ':') {
            cursor += 7;
            return (
                <g key={index} transform={`translate(${x} 1)`} aria-hidden="true">
                    <circle cx={2.5} cy={7} r={1.25} fill="currentColor" />
                    <circle cx={2.5} cy={15} r={1.25} fill="currentColor" />
                </g>
            );
        }

        if (character === '.') {
            cursor += 6;
            return <circle key={index} cx={x + 2} cy={21.5} r={1.5} fill="currentColor" aria-hidden="true" />;
        }

        cursor += 14;
        return <SegmentDigit key={index} digit={character} x={x} />;
    });

    return (
        <Box
            sx={{
                display: 'inline-flex',
                maxWidth: '100%',
                p: 1,
                border: 1,
                borderColor: 'divider',
                borderRadius: 1.5,
                bgcolor: theme => (theme.palette.mode === 'dark' ? 'grey.900' : '#dfe8d5'),
                boxShadow: 'inset 0 2px 5px rgba(0, 0, 0, 0.22)',
            }}
        >
            <Box
                component="svg"
                role="timer"
                aria-label={formattedTime}
                viewBox={`0 0 ${cursor} 24`}
                width={cursor}
                height={24}
                sx={{display: 'block', height: VARIANT_HEIGHT[variant] ?? 40, width: 'auto', maxWidth: '100%'}}
            >
                {glyphs}
            </Box>
        </Box>
    );
}
