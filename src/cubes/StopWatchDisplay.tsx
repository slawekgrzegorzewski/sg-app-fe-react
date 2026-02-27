import * as React from "react";
import {JSX} from "react";
import {Stack} from "@mui/material";
import Typography from "@mui/material/Typography";
import {TypographyVariant} from "@mui/material/styles/createTypography";

interface StopWatchDisplayProps {
    currentTimeInMillis: number;
    variant?: TypographyVariant;
}

export function StopWatchDisplay({currentTimeInMillis, variant = 'h5'}: StopWatchDisplayProps): JSX.Element {
    const millis = currentTimeInMillis % 1000
    const seconds = Math.floor(currentTimeInMillis / 1000);
    const secondsInMinute = seconds % 60;
    const minutes = Math.floor(seconds / 60);

    const zeroPad = (num: number, size: number) => {
        return String(num).padStart(size, '0')
    }

    return <Stack direction={'row'} alignItems={'center'}>
1        <Typography variant={variant}>{zeroPad(minutes, 2)}</Typography>
        <Typography variant={variant}>:</Typography>
        <Typography variant={variant}>{zeroPad(secondsInMinute, 2)}</Typography>
        <Typography variant={variant}>.</Typography>
        <Typography variant={variant}>{zeroPad(millis, 3)}</Typography>
    </Stack>;
}