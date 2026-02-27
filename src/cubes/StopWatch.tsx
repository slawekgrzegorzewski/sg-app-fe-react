import * as React from "react";
import {useEffect, useState} from "react";
import {Stack, Theme} from "@mui/material";
import Button from "@mui/material/Button";
import dayjs from "dayjs";
import {StopWatchDisplay} from "./StopWatchDisplay";
import {SxProps} from "@mui/system";
import {TypographyVariant} from "@mui/material/styles/createTypography";

interface StopWatchProps {
    showControls?: boolean;
    variant?: TypographyVariant;
    sx?: SxProps<Theme>,
    startTrigger?: React.RefObject<() => void>,
    stopTrigger?: React.RefObject<() => number>,
    resetTrigger?: React.RefObject<() => void>,
}

export function StopWatch({showControls = true, variant, sx, startTrigger, stopTrigger, resetTrigger}: StopWatchProps) {
    const [startTime, setStartTime] = useState<number | null>(null);
    const [currentTime, setCurrentTime] = useState<number>(0);
    const [isRunning, setIsRunning] = useState(false);

    useEffect(() => {
        console.log('Stop Watch loaded')
    }, []);

    useEffect(() => {
        if (startTrigger) {
            startTrigger.current = start;
        }
        if (stopTrigger) {
            stopTrigger.current = stop;
        }
        if (resetTrigger) {
            resetTrigger.current = reset;
        }
    })

    useEffect(() => {
        if (isRunning) {
            setTimeout(() => setCurrentTime(dayjs().valueOf() - startTime!), 10);
        }
    }, [startTime, currentTime, isRunning]);

    const start = () => {
        if (!isRunning) {
            setIsRunning(true);
            setStartTime(dayjs().valueOf());
        }
    }

    const stop = () => {
        let time = 0;
        if (isRunning) {
            time = dayjs().valueOf() - startTime!;
            setIsRunning(false);
            setStartTime(null);
        }
        return time;
    }

    const reset = () => {
        stop();
        setTimeout(() => setCurrentTime(0), 10);
    }

    return <Stack direction={'column'} alignItems={'center'} sx={sx}>
        {
            showControls && <Stack direction={'row'}>
                <Button onClick={start}>
                    Start
                </Button>
                <Button onClick={stop}>
                    Stop
                </Button>
            </Stack>
        }
        <StopWatchDisplay currentTimeInMillis={currentTime} variant={variant}/>
    </Stack>;
}