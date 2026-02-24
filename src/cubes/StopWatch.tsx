import * as React from "react";
import {useEffect, useState} from "react";
import {Stack, Theme} from "@mui/material";
import Button from "@mui/material/Button";
import dayjs from "dayjs";
import {StopWatchDisplay} from "./StopWatchDisplay";
import {SxProps} from "@mui/system";

interface StopWatchProps {
    sx: SxProps<Theme>,
    startTrigger?: React.RefObject<() => void>,
    stopTrigger?: React.RefObject<() => number>,
    resetTrigger?: React.RefObject<() => void>,
}

export function StopWatch({sx, startTrigger, stopTrigger, resetTrigger}: StopWatchProps) {
    const [startTime, setStartTime] = useState<number | null>(null);
    const [currentTime, setCurrentTime] = useState<number>(0);
    const [isRunning, setIsRunning] = useState(false);


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
        <Stack direction={'row'}>
            <Button onClick={start}>
                Start
            </Button>
            <Button onClick={stop}>
                Stop
            </Button>
        </Stack>
        <StopWatchDisplay currentTimeInMilis={currentTime}/>
    </Stack>;
}