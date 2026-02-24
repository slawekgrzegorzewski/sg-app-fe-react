import * as React from "react";
import {JSX} from "react";
import {Stack} from "@mui/material";
import Typography from "@mui/material/Typography";

interface StopWatchDisplayProps {
    currentTimeInMilis: number;
}

export function StopWatchDisplay({currentTimeInMilis}: StopWatchDisplayProps): JSX.Element {
    const millis = currentTimeInMilis % 1000
    const seconds = Math.floor(currentTimeInMilis / 1000);
    const secondsInMinute = seconds % 60;
    const minutes = Math.floor(seconds / 60);

    const zeroPad = (num: number, size: number) => {
        return String(num).padStart(size, '0')
    }

    return <Stack direction={'row'} alignItems={'center'}>
        <Typography variant={'h5'}>{zeroPad(minutes, 2)}</Typography>
        <Typography variant={'h5'}>:</Typography>
        <Typography variant={'h5'}>{zeroPad(secondsInMinute, 2)}</Typography>
        <Typography variant={'h5'}>.</Typography>
        <Typography variant={'h5'}>{zeroPad(millis, 3)}</Typography>
    </Stack>;
}