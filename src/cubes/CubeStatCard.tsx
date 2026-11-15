import {Paper, Typography} from '@mui/material';

export function CubeStatCard({label, value, compact = false}: {
    label: string;
    value: string | number;
    compact?: boolean
}) {
    return (
        <Paper role="group" aria-label={label} variant="outlined"
               sx={{flex: 1, minWidth: compact ? 0 : 145, px: 2, py: 1.5}}>
            <Typography variant="caption" color="text.secondary">
                {label}
            </Typography>
            <Typography variant="h4" sx={{mt: 0.5, overflowWrap: 'anywhere', fontVariantNumeric: 'tabular-nums'}}>
                {value}
            </Typography>
        </Paper>
    );
}
