import {clickableProps} from '../application/components/clickable';
import {INSPECTION_ALLOWANCE_MILLIS, isInspection, Phase} from './phase';
import * as React from 'react';
import {useCallback, useEffect, useReducer, useRef, useState} from 'react';
import {
    Alert,
    Dialog,
    FormControl,
    InputLabel,
    MenuItem,
    Select,
    Stack,
    TextField,
    useMediaQuery,
    useTheme,
} from '@mui/material';
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
import {CUBE_TYPE_OPTIONS, getCubeTypeOption} from './cube-types';
import {generateCubingScramble} from './cubing-scramble';
import {CubingVisualizer} from './CubingVisualizer';
import {validateCubingScramble} from './cubing-api';
import {CubeStatCard} from './CubeStatCard';

function isTextEditingTarget(target: EventTarget | null): boolean {
    return (
        target instanceof HTMLElement &&
        (target.isContentEditable || target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')
    );
}

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
    const [visualizedScramble, setVisualizedScramble] = useState('');
    const [scrambleError, setScrambleError] = useState<string | null>(null);
    const [scrambleValidationError, setScrambleValidationError] = useState<string | null>(null);
    const [isValidatingScramble, setIsValidatingScramble] = useState(false);
    const [isGeneratingScramble, setIsGeneratingScramble] = useState(false);
    const scrambleGenerationId = useRef(0);
    const scrambleValidationId = useRef(0);
    const [phase, setPhase] = useState<Phase>('IDLE');
    const result = useRef(0);
    const becomeLateInspectionTimeOutId = useRef<NodeJS.Timeout | null>(null);

    const generateScrambleForSelectedCube = useCallback(() => {
        const generationId = ++scrambleGenerationId.current;
        setIsGeneratingScramble(true);
        setScrambleError(null);

        generateCubingScramble(cubeType)
            .then(generatedScramble => {
                if (generationId === scrambleGenerationId.current) {
                    setScramble(generatedScramble);
                }
            })
            .catch(error => {
                if (generationId === scrambleGenerationId.current) {
                    setScrambleError(error instanceof Error ? error.message : 'Nieznany błąd');
                }
            })
            .finally(() => {
                if (generationId === scrambleGenerationId.current) {
                    setIsGeneratingScramble(false);
                }
            });
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
        scrambleGenerationId.current++;
        scrambleValidationId.current++;
        result.current = 0;
        resetTrigger.current();
        releaseWakeLock();
        setScramble('');
        setVisualizedScramble('');
        setScrambleError(null);
        setScrambleValidationError(null);
        setIsValidatingScramble(false);
        setIsGeneratingScramble(false);
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
            if (isTextEditingTarget(e.target)) {
                return;
            }
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
            if (isTextEditingTarget(e.target)) {
                return;
            }
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

    useEffect(() => {
        const validationId = ++scrambleValidationId.current;
        if (!scramble.trim()) {
            setVisualizedScramble('');
            setScrambleValidationError(null);
            setIsValidatingScramble(false);
            return;
        }

        setScrambleValidationError(null);
        setIsValidatingScramble(true);
        validateCubingScramble(getCubeTypeOption(cubeType).puzzleId, scramble)
            .then(() => {
                if (validationId === scrambleValidationId.current) {
                    setVisualizedScramble(scramble);
                    setScrambleValidationError(null);
                }
            })
            .catch(error => {
                if (validationId === scrambleValidationId.current) {
                    setScrambleValidationError(error instanceof Error ? error.message : 'Nieznany błąd');
                }
            })
            .finally(() => {
                if (validationId === scrambleValidationId.current) {
                    setIsValidatingScramble(false);
                }
            });
    }, [cubeType, scramble]);

    if (data) {
        return (
            <Stack
                sx={{
                    height: '100%',
                    width: '100%',
                    px: {xs: 1, sm: 2},
                    py: 2,
                }}
                direction={'column'}
                alignItems={'center'}
            >
                <Stack spacing={2} alignItems="center" sx={{width: '100%', maxWidth: 960, minHeight: '100%'}}>
                    <Stack
                        direction={{xs: 'column', sm: 'row'}}
                        alignItems={{xs: 'stretch', sm: 'center'}}
                        justifyContent="space-between"
                        spacing={2}
                        sx={{width: '100%'}}
                    >
                        <Typography variant="h3">
                            <StandOutText standOutBy="both">Układanie kostek</StandOutText>
                        </Typography>
                        <FormControl variant="filled" size="small" sx={{minWidth: 180}}>
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
                    </Stack>
                    <Stack direction="row" flexWrap="wrap" gap={1.5} sx={{width: '100%'}}>
                        <CubeStatCard label="Liczba ułożeń" value={data.cubeResults.numberOfSolves} />
                        <CubeStatCard
                            label="Dzisiejsza średnia"
                            value={`${data.cubeResults.todayAverageInMillis / 1000} s`}
                        />
                    </Stack>
                    <Typography variant="caption" color="text.secondary">
                        Blokada wygaszania ekranu: {wakeLock ? 'włączona' : 'wyłączona'}
                    </Typography>
                    <Stack direction="row" spacing={1}>
                        <Button
                            variant="contained"
                            disabled={isGeneratingScramble}
                            onClick={generateScrambleForSelectedCube}
                        >
                            {isGeneratingScramble ? 'Generowanie…' : 'Scramble'}
                        </Button>
                        <Button variant="outlined" onClick={reset.current}>
                            Reset
                        </Button>
                    </Stack>
                    {scrambleError && (
                        <Alert severity="error" sx={{width: '100%'}}>
                            Nie udało się wygenerować scrambla: {scrambleError}
                        </Alert>
                    )}
                    <TextField
                        label="Scramble"
                        value={scramble}
                        onChange={event => {
                            scrambleGenerationId.current++;
                            scrambleValidationId.current++;
                            setIsGeneratingScramble(false);
                            setScrambleError(null);
                            setScramble(event.target.value);
                        }}
                        multiline
                        minRows={2}
                        maxRows={4}
                        error={scrambleValidationError !== null}
                        helperText={
                            isValidatingScramble
                                ? 'Sprawdzanie…'
                                : scrambleValidationError
                                  ? `Niepoprawny scramble: ${scrambleValidationError}`
                                  : scramble.trim()
                                    ? 'Scramble jest poprawny.'
                                    : 'Wpisz lub wygeneruj scramble.'
                        }
                        sx={{width: '100%'}}
                    />
                    <CubingVisualizer cubeType={cubeType} scramble={visualizedScramble} />
                    <Typography variant="caption" color="text.secondary">
                        Przeciągnij, aby obrócić widok.
                    </Typography>
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
                            <Stack
                                style={{width: '100%', height: '100%'}}
                                justifyContent={'center'}
                                alignItems={'center'}
                            >
                                <Typography>Blokada ekranu: {wakeLock ? 'włączona' : 'wyłączona'}</Typography>
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
                            inspectionMode={
                                phase === 'INSPECTION_EARLY'
                                    ? 'countdown'
                                    : phase === 'INSPECTION_LATE'
                                      ? 'overtime'
                                      : undefined
                            }
                            inspectionAllowanceMillis={INSPECTION_ALLOWANCE_MILLIS}
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
                    {fullScreen && isInspection(phase) && (
                        <StopWatch
                            showControls={false}
                            variant="h2"
                            inspectionMode={phase === 'INSPECTION_EARLY' ? 'countdown' : 'overtime'}
                            inspectionAllowanceMillis={INSPECTION_ALLOWANCE_MILLIS}
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
            </Stack>
        );
    } else {
        return <></>;
    }
}
