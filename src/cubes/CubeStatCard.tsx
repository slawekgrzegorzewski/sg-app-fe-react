import {Paper, Typography} from '@mui/material';

export function CubeStatCard({label, value}: {label: string; value: string | number}) {
    return (
        <Paper role="group" aria-label={label} variant="outlined" sx={{flex: 1, minWidth: 145, px: 2, py: 1.5}}>
            <Typography variant="caption" color="text.secondary">
                {label}
            </Typography>
            <Typography variant="h4" sx={{mt: 0.5, fontVariantNumeric: 'tabular-nums'}}>
                {value}
            </Typography>
        </Paper>
    );
}
