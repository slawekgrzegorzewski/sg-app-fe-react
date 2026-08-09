import {clickableProps} from '../application/components/clickable';
import {INSPECTION_ALLOWANCE_MILLIS, isInspection, Phase} from './phase';
import * as React from 'react';
import {useCallback, useEffect, useReducer, useRef, useState} from 'react';
import {
    Alert,
    Box,
    Dialog,
    FormControl,
    InputLabel,
    MenuItem,
    Select,
    Stack,
    useMediaQuery,
    useTheme,
} from '@mui/material';
import {newCube} from './visualizer';
import {scramble as generateScramble} from './cube-scrambler';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import {StopWatch} from './StopWatch';
import {useMutation, useQuery} from '@apollo/client/react';
import {CubeType, GetCubeResults, GetCubeResultsQuery, StoreCubeResult, StoreCubeResultMutation} from '../types';
import dayjs from 'dayjs';
import {useWakeLock} from '../utils/use-wake-lock';
import {StopWatchDisplay} from './StopWatchDisplay';
import {useIsTouchDevice} from '../utils/use-is-touch-screen';
import {StandOutText} from '../application/components/StandOutText';
import {CUBE_TYPE_OPTIONS, getCubeLayers, getCubeScrambleOptions} from './cube-types';

export function CubesMainPage() {
    const [, forceUpdate] = useReducer(x => x + 1, 0);
    const theme = useTheme();
    const isTouchDevice = useIsTouchDevice();
    const fullScreen = useMediaQuery(theme.breakpoints.down('md')) || isTouchDevice;
    const [wakeLock, requestWakeLock, releaseWakeLock] = useWakeLock();
    const [cubeType, setCubeType] = useState<CubeType>(CubeType.Three);
    const cubeTypeRef = useRef(cubeType);
    cubeTypeRef.current = cubeType;
    const [scramble, setScramble] = useState('');
    const [phase, setPhase] = useState<Phase>('IDLE');
    const result = useRef(0);
    const becomeLateInspectionTimeOutId = useRef<NodeJS.Timeout | null>(null);
    const cubeVisualizationContainerRef = useRef<HTMLElement | null>(null);
    const selectedCubeLayers = getCubeLayers(cubeType);
    const scrambleOptions = getCubeScrambleOptions(cubeType);

    const generateScrambleForSelectedCube = useCallback(() => {
        const options = getCubeScrambleOptions(cubeType);
        if (options) {
            setScramble(generateScramble(options).join(' '));
        }
    }, [cubeType]);

    const clearInspectionTimeout = useCallback(() => {
        if (becomeLateInspectionTimeOutId.current) {
            clearTimeout(becomeLateInspectionTimeOutId.current);
            becomeLateInspectionTimeOutId.current = null;
        }
    }, []);

    const beginInspection = useCallback(() => {
        setPhase('INSPECTION_EARLY');
        if (!becomeLateInspectionTimeOutId.current) {
            becomeLateInspectionTimeOutId.current = setTimeout(
                () => setPhase('INSPECTION_LATE'),
                INSPECTION_ALLOWANCE_MILLIS
            );
        }
    }, []);

    const reset = useRef(() => {
        result.current = 0;
        resetTrigger.current();
        releaseWakeLock();
        setScramble('');
        setPhase('IDLE');
        forceUpdate();
    });
    const save = useRef(() => {
        let resultCopy = result.current;
        reset.current();
        storeCubeResultMutation({
            variables: {
                cubeType: cubeTypeRef.current,
                timestampOfSolve: dayjs().format('YYYY-MM-DD HH:mm:ss.SSS'),
                timeInMillis: resultCopy,
            },
        }).then(() => refetch());
    });

    const {data, refetch} = useQuery<GetCubeResultsQuery>(GetCubeResults, {variables: {cubeType}});
    const [storeCubeResultMutation] = useMutation<StoreCubeResultMutation>(StoreCubeResult);

    const startTrigger: React.RefObject<() => void> = useRef<() => void>(() => {});

    const start: React.RefObject<() => void> = useRef<() => void>(() => {
        requestWakeLock();
        startTrigger.current();
    });

    const stopTrigger: React.RefObject<() => number> = useRef<() => number>(() => {
        return 0;
    });

    const stop: React.RefObject<() => number> = useRef<() => number>(() => {
        releaseWakeLock();
        return stopTrigger.current();
    });

    const resetTrigger: React.RefObject<() => void> = useRef<() => void>(() => {});

    useEffect(() => {
        const keyDownListener = (e: KeyboardEvent) => {
            if (e.code === 'Space') {
                if (phase === 'IDLE' && result.current === 0) {
                    beginInspection();
                } else if (phase === 'SOLVING') {
                    result.current = stop.current();
                    setPhase('IDLE');
                }
            }
            if (e.code === 'KeyS' && phase === 'IDLE') {
                generateScrambleForSelectedCube();
            }
            if (e.code === 'KeyR') {
                reset.current();
                clearInspectionTimeout();
            }
            if (e.code === 'Enter' && phase === 'IDLE' && result.current > 0) {
                save.current();
            }
        };

        const keyUpListener = (e: KeyboardEvent) => {
            if (e.code !== 'Space') {
                return;
            }
            clearInspectionTimeout();
            if (isInspection(phase)) {
                setPhase('SOLVING');
                start.current();
            }
        };

        document.addEventListener('keydown', keyDownListener);
        document.addEventListener('keyup', keyUpListener);
        return () => {
            document.removeEventListener('keydown', keyDownListener);
            document.removeEventListener('keyup', keyUpListener);
        };
    }, [phase, clearInspectionTimeout, beginInspection, generateScrambleForSelectedCube]);

    useEffect(() => clearInspectionTimeout, [clearInspectionTimeout]);

    const hasCubeResults = !!data;

    useEffect(() => {
        const container = cubeVisualizationContainerRef.current;
        if (!container || selectedCubeLayers === null) {
            return;
        }
        const scene = newCube(container, selectedCubeLayers);
        scene.enableKey = _ => false;
        if (scramble) {
            scene.puzzle.performAlg(scramble);
        }
        return () => {
            scene.dispose();
        };
    }, [scramble, hasCubeResults, selectedCubeLayers]);

    if (data) {
        return (
            <Stack
                sx={{
                    height: '100%',
                    width: '100%',
                }}
                direction={'column'}
                alignItems={'center'}
            >
                <FormControl variant="filled" size="small" sx={{minWidth: 180, mt: 2}}>
                    <InputLabel id="main-cube-type-label">Rodzaj kostki</InputLabel>
                    <Select
                        labelId="main-cube-type-label"
                        id="main-cube-type"
                        value={cubeType}
                        disabled={phase !== 'IDLE' || result.current > 0}
                        onChange={event => {
                            reset.current();
                            setCubeType(event.target.value as CubeType);
                        }}
                    >
                        {CUBE_TYPE_OPTIONS.map(option => (
                            <MenuItem key={option.value} value={option.value}>
                                {option.label}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
                {wakeLock && <Typography>Wake lock on</Typography>}
                {!wakeLock && <Typography>Wake lock off</Typography>}
                <Typography>Liczba ułożeń: {data.cubeResults.numberOfSolves}</Typography>
                <Typography>Średnia: {data.cubeResults.todayAverageInMillis / 1000}</Typography>
                <Stack direction={'row'}>
                    <Button disabled={!scrambleOptions} onClick={generateScrambleForSelectedCube}>
                        Scramble
                    </Button>
                    <Button onClick={reset.current}>Reset</Button>
                </Stack>
                <Typography variant={'h5'}>{scramble}</Typography>
                {selectedCubeLayers === null ? (
                    <Alert severity="info" sx={{my: 2}}>
                        Generator i wizualizacja nie są jeszcze dostępne dla Megaminx.
                    </Alert>
                ) : (
                    <Box
                        component="div"
                        ref={cubeVisualizationContainerRef}
                        id="scenesContainer"
                        sx={{display: 'flex', flexWrap: 'wrap', gap: '16px', width: '300px', height: '300px'}}
                    ></Box>
                )}
                {fullScreen && (
                    <Dialog
                        open={fullScreen && phase === 'SOLVING'}
                        fullScreen={true}
                        keepMounted={true}
                        onTouchStart={() => {
                            result.current = stop.current();
                            setPhase('IDLE');
                        }}
                    >
                        <Stack style={{width: '100%', height: '100%'}} justifyContent={'center'} alignItems={'center'}>
                            {wakeLock && <Typography variant={'h5'}>Wake lock on</Typography>}
                            {!wakeLock && <Typography>Wake lock off</Typography>}
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
                        sx={{
                            color:
                                phase === 'INSPECTION_EARLY'
                                    ? 'green'
                                    : phase === 'INSPECTION_LATE'
                                      ? 'red'
                                      : theme.palette.text.primary,
                        }}
                        startTrigger={startTrigger}
                        stopTrigger={stopTrigger}
                        resetTrigger={resetTrigger}
                    />
                )}
                <Typography>{phase}</Typography>
                {fullScreen && (result.current === 0 || phase !== 'IDLE') && (
                    <Stack
                        direction={'column'}
                        sx={{
                            flexGrow: 1,
                            alignSelf: 'stretch',
                            userSelect: 'none',
                        }}
                        onTouchStart={() => {
                            if (phase === 'IDLE' && result.current === 0) {
                                beginInspection();
                            }
                        }}
                        onTouchEnd={() => {
                            clearInspectionTimeout();
                            if (isInspection(phase)) {
                                setPhase('SOLVING');
                                start.current();
                            }
                        }}
                    ></Stack>
                )}
                {fullScreen && result.current > 0 && phase === 'IDLE' && (
                    <StopWatchDisplay currentTimeInMillis={result.current} />
                )}
                {fullScreen && result.current > 0 && phase === 'IDLE' && (
                    <Stack
                        direction={'row'}
                        justifyContent={'stretch'}
                        sx={{
                            flexGrow: 1,
                            alignSelf: 'stretch',
                            userSelect: 'none',
                        }}
                    >
                        <Stack
                            sx={{
                                backgroundColor: 'success.light',
                                color: 'success.dark',
                                width: '50%',
                                justifyContent: 'center',
                                alignItems: 'center',
                            }}
                            {...clickableProps(() => save.current(), 'Zapisz wynik')}
                        >
                            <StandOutText standOutBy="bold">ZAPISZ</StandOutText>
                        </Stack>
                        <Stack
                            sx={{
                                backgroundColor: 'error.light',
                                color: 'error.dark',
                                width: '50%',
                                justifyContent: 'center',
                                alignItems: 'center',
                            }}
                            {...clickableProps(() => reset.current(), 'Odrzuć wynik')}
                        >
                            <StandOutText standOutBy="bold">ODRZUĆ</StandOutText>
                        </Stack>
                    </Stack>
                )}
            </Stack>
        );
    } else {
        return <></>;
    }
}
