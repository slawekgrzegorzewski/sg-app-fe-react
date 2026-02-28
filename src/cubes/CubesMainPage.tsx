import * as React from "react";
import {useEffect, useReducer, useRef, useState} from "react";
import {Box, Dialog, Stack, useMediaQuery, useTheme} from "@mui/material";
import {newCube} from "./visualizer";
import {scramble as generateScramble} from "./cube-scrambler";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import {StopWatch} from "./StopWatch";
import {useMutation, useQuery} from "@apollo/client/react";
import {GetCubeResults, GetCubeResultsQuery, StoreCubeResult, StoreCubeResultMutation} from "../types";
import dayjs from "dayjs";
import {useWakeLock} from "../utils/use-wake-lock";
import {StopWatchDisplay} from "./StopWatchDisplay";

type Phase = 'IDLE' | 'INSPECTION_EARLY' | 'INSPECTION_LATE' | 'SOLVING'
type InspectionPhase = Extract<Phase, 'INSPECTION_EARLY' | 'INSPECTION_LATE'>

function isInspection(phase: string): phase is InspectionPhase {
    return phase === 'INSPECTION_EARLY' || phase === 'INSPECTION_LATE';
}

export function CubesMainPage() {
    const [, forceUpdate] = useReducer(x => x + 1, 0);
    const theme = useTheme();
    const fullScreen = useMediaQuery(theme.breakpoints.down('md'));
    const [requestWakeLock, releaseWakeLock] = useWakeLock();
    const [scramble, setScramble] = useState("");
    const [phase, setPhase] = useState<Phase>('IDLE');
    const result = useRef(0);
    const becomeLateInspectionTimeOutId = useRef<NodeJS.Timeout | null>(null);
    const cubeVisualizationContainerRef = useRef<HTMLElement | null>(null);
    const reset = useRef(() => {
        result.current = 0;
        resetTrigger.current();
        releaseWakeLock();
        setScramble("");
        setPhase("IDLE");
        forceUpdate();
    });
    const save = useRef(() => {
        let resultCopy = result.current;
        reset.current();
        storeCubeResultMutation({
            variables: {
                cubeType: "THREE_BY_THREE",
                timestampOfSolve: dayjs().format("YYYY-MM-DD HH:mm:ss.SSS"),
                timeInMillis: resultCopy
            }
        })
            .then(() => refetch());
    });

    const {
        data,
        refetch
    } = useQuery<GetCubeResultsQuery>(GetCubeResults, {variables: {cubeType: "THREE_BY_THREE"}})
    const [storeCubeResultMutation] = useMutation<StoreCubeResultMutation>(StoreCubeResult);

    const startTrigger: React.RefObject<(() => void)> = useRef<() => void>(() => {
    });

    const start: React.RefObject<(() => void)> = useRef<() => void>(() => {
        startTrigger.current();
        requestWakeLock();
    });

    const stopTrigger: React.RefObject<(() => number)> = useRef<() => number>(() => {
        return 0;
    });

    const stop: React.RefObject<(() => number)> = useRef<() => number>(() => {
        releaseWakeLock();
        return stopTrigger.current();
    });

    const resetTrigger: React.RefObject<(() => void)> = useRef<() => void>(() => {
    });

    useEffect(() => {
        const keyDownListener = (e: KeyboardEvent) => {
            if (e.code === 'Space') {
                if (phase === "IDLE") {
                    setPhase("INSPECTION_EARLY");
                    if (!becomeLateInspectionTimeOutId.current) {
                        becomeLateInspectionTimeOutId.current = setTimeout(() => setPhase("INSPECTION_LATE"), 15000);
                    }
                } else if (phase === 'SOLVING') {
                    result.current = stop.current();
                    setPhase('IDLE');
                }
            }
            if (e.code === 'KeyS' && phase === 'IDLE') {
                setScramble(generateScramble({turns: 30}).join(" "));
            }
            if (e.code === 'KeyR') {
                reset.current();
                if (becomeLateInspectionTimeOutId.current) {
                    clearTimeout(becomeLateInspectionTimeOutId.current);
                }
            }
            if (e.code === 'Enter' && phase === 'IDLE' && result.current > 0) {
                save.current();
            }
        };

        const keyUpListener = (e: KeyboardEvent) => {
            if (becomeLateInspectionTimeOutId.current) {
                clearTimeout(becomeLateInspectionTimeOutId.current);
            }
            if (e.code === 'Space') {
                if (isInspection(phase)) {
                    setPhase("SOLVING");
                    start.current();
                }
            }
        };

        document.addEventListener("keydown", keyDownListener);
        document.addEventListener("keyup", keyUpListener);
        return () => {
            document.removeEventListener("keydown", keyDownListener);
            document.removeEventListener("keyup", keyUpListener);
        }
    }, [phase]);

    useEffect(() => {
        if (cubeVisualizationContainerRef.current) {
            const s = newCube(cubeVisualizationContainerRef.current, 3);
            s.enableKey = (_) => false;
            s.puzzle.performAlg(scramble);
        }
    }, [scramble, data]);

    if (data) {
        return <Stack
            sx={{
                height: '100%',
                width: '100%',
            }}
            direction={'column'}
            alignItems={'center'}>
            <Typography>Liczba ułożeń: {data.cubeResults.numberOfSolves}</Typography>
            <Typography>Średnia: {data.cubeResults.todayAverageInMillis / 1000}</Typography>
            <Stack direction={'row'}>
                <Button onClick={() => setScramble(generateScramble({turns: 30}).join(" "))}>Scramble</Button>
                <Button onClick={reset.current}>Reset</Button>
            </Stack>
            <Typography variant={'h5'}>{scramble}</Typography>
            <Box component="div" ref={cubeVisualizationContainerRef}
                 id="scenesContainer"
                 sx={{display: 'flex', flexWrap: 'wrap', gap: '16px', width: '300px', height: '300px'}}>
            </Box>
            {fullScreen && (<Dialog open={fullScreen && phase === 'SOLVING'}
                                    fullScreen={true}
                                    keepMounted={true}
                                    onTouchStart={() => {
                                        result.current = stop.current();
                                        setPhase('IDLE');
                                    }}>
                    <Stack style={{width: '100%', height: '100%'}} justifyContent={'center'} alignItems={'center'}>
                        <StopWatch
                            variant={'h2'}
                            showControls={false}
                            startTrigger={startTrigger}
                            stopTrigger={stopTrigger}
                            resetTrigger={resetTrigger}
                        />
                    </Stack>
                </Dialog>
            )}
            {!fullScreen && (
                <StopWatch
                    sx={{color: phase === 'INSPECTION_EARLY' ? 'green' : (phase === 'INSPECTION_LATE') ? 'red' : 'black'}}
                    startTrigger={startTrigger}
                    stopTrigger={stopTrigger}
                    resetTrigger={resetTrigger}
                />
            )}
            <Typography>{phase}</Typography>
            {
                fullScreen && (result.current === 0 || phase !== 'IDLE') && <Stack direction={'column'}
                                                                                   sx={{
                                                                                       flexGrow: 1,
                                                                                       alignSelf: 'stretch',
                                                                                       userSelect: 'none',
                                                                                   }}
                                                                                   onTouchStart={() => {
                                                                                       if (phase === "IDLE") {
                                                                                           setPhase("INSPECTION_EARLY");
                                                                                           if (!becomeLateInspectionTimeOutId.current) {
                                                                                               becomeLateInspectionTimeOutId.current = setTimeout(() => setPhase("INSPECTION_LATE"), 15000);
                                                                                           }
                                                                                       }
                                                                                   }}
                                                                                   onTouchEnd={() => {
                                                                                       if (becomeLateInspectionTimeOutId.current) {
                                                                                           clearTimeout(becomeLateInspectionTimeOutId.current);
                                                                                       }
                                                                                       if (isInspection(phase)) {
                                                                                           setPhase("SOLVING");
                                                                                           start.current();
                                                                                       }
                                                                                   }}>

                </Stack>
            }
            {
                fullScreen && result.current > 0 && phase === 'IDLE' &&
                <StopWatchDisplay currentTimeInMillis={result.current}/>
            }
            {
                fullScreen && result.current > 0 && phase === 'IDLE' &&
                <Stack direction={'row'} justifyContent={'stretch'}
                       sx={{
                           flexGrow: 1,
                           alignSelf: 'stretch',
                           userSelect: 'none',
                       }}>
                    <Stack sx={{
                        backgroundColor: '#c6efce',
                        color: '#006100',
                        width: '50%',
                        justifyContent: 'center',
                        alignItems: 'center'
                    }}
                           onClick={(e) => save.current()}>
                        <b>ZAPISZ</b>
                    </Stack>
                    <Stack sx={{
                        backgroundColor: '#ffc7ce',
                        color: '#9c0006',
                        width: '50%',
                        justifyContent: 'center',
                        alignItems: 'center'
                    }}
                           onClick={(e) => reset.current()}>
                        <b>ODRZUĆ</b>
                    </Stack>
                </Stack>
            }
        </Stack>;
    } else {
        return <></>;
    }
}