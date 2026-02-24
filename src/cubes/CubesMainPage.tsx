import * as React from "react";
import {useEffect, useRef, useState} from "react";
import {Box, Stack} from "@mui/material";
import {newCube} from "./visualizer";
import {scramble as generateScramble} from "./cube-scrambler";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import {StopWatch} from "./StopWatch";
import {useMutation, useQuery} from "@apollo/client/react";
import {GetCubeResults, GetCubeResultsQuery, StoreCubeResult, StoreCubeResultMutation} from "../types";
import dayjs from "dayjs";

type Phase = 'IDLE' | 'INSPECTION_EARLY' | 'INSPECTION_LATE' | 'SOLVING'
type InspectionPhase = Extract<Phase, 'INSPECTION_EARLY' | 'INSPECTION_LATE'>

function isInspection(phase: string): phase is InspectionPhase {
    return phase === 'INSPECTION_EARLY' || phase === 'INSPECTION_LATE';
}

export function CubesMainPage() {
    const [scramble, setScramble] = useState("");
    const [phase, setPhase] = useState<Phase>('IDLE');
    const result = useRef(0);
    const becomeLateInspectionTimeOutId = useRef<NodeJS.Timeout | null>(null);
    const cubeVisualizationContainerRef = useRef<HTMLElement | null>(null);
    const save = useRef(() => {
        let resultCopy = result.current;
        reset();
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

    const stopTrigger: React.RefObject<(() => number)> = useRef<() => number>(() => {
        return 0;
    });

    const resetTrigger: React.RefObject<(() => void)> = useRef<() => void>(() => {
    });


    const reset = () => {
        setScramble("");
        result.current = 0;
        resetTrigger.current();
        setPhase("IDLE");
    }

    useEffect(() => {
        const keyDownListener = (e: KeyboardEvent) => {
            if (e.code === 'Space') {
                if (phase === "IDLE") {
                    setPhase("INSPECTION_EARLY");
                    if (!becomeLateInspectionTimeOutId.current) {
                        becomeLateInspectionTimeOutId.current = setTimeout(() => setPhase("INSPECTION_LATE"), 15000);
                    }
                } else if (phase === 'SOLVING') {
                    result.current = stopTrigger.current();
                    setPhase('IDLE');
                }
            }
            if (e.code === 'KeyS' && phase === 'IDLE') {
                setScramble(generateScramble({turns: 30}).join(" "));
            }
            if (e.code === 'KeyR') {
                reset();
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
                    startTrigger.current();
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
            direction={'column'}
            alignItems={'center'}>
            <Typography>Liczba ułożeń: {data.cubeResults.numberOfSolves}</Typography>
            <Typography>Średnia: {data.cubeResults.todayAverageInMillis / 1000}</Typography>
            <Stack direction={'row'}>
                <Button onClick={() => setScramble(generateScramble({turns: 30}).join(" "))}>Scramble</Button>
                <Button onClick={reset}>Reset</Button>
            </Stack>
            <Typography variant={'h5'}>{scramble}</Typography>
            <Box component="div" ref={cubeVisualizationContainerRef}
                 id="scenesContainer"
                 sx={{display: 'flex', flexWrap: 'wrap', gap: '16px', width: '300px', height: '300px'}}>
            </Box>
            <Typography>{phase}</Typography>
            <Box
                onTouchStart={() => {
                    if (phase === "IDLE") {
                        setPhase("INSPECTION_EARLY");
                        if (!becomeLateInspectionTimeOutId.current) {
                            becomeLateInspectionTimeOutId.current = setTimeout(() => setPhase("INSPECTION_LATE"), 1500);
                        }
                    } else if (phase === 'SOLVING') {
                        result.current = stopTrigger.current();
                        setPhase('IDLE');
                    }
                }}
                onTouchEnd={() => {
                    if (becomeLateInspectionTimeOutId.current) {
                        clearTimeout(becomeLateInspectionTimeOutId.current);
                    }
                    if (isInspection(phase)) {
                        setPhase("SOLVING");
                        startTrigger.current();
                    }
                }}>
                <StopWatch
                    sx={{color: phase === 'INSPECTION_EARLY' ? 'green' : (phase === 'INSPECTION_LATE') ? 'red' : 'black'}}
                    startTrigger={startTrigger}
                    stopTrigger={stopTrigger}
                    resetTrigger={resetTrigger}
                />
            </Box>
            {result.current > 0 && phase === 'IDLE' && <Button onClick={save.current}>Zapisz</Button>}
        </Stack>;
    } else {
        return <></>;
    }
}