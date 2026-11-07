import {INSPECTION_ALLOWANCE_MILLIS, isInspection, Phase} from './phase';
import * as React from 'react';
import {useCallback, useEffect, useReducer, useRef, useState} from 'react';
import {
    Alert,
    Box,
    Chip,
    Dialog,
    FormControl,
    InputLabel,
    MenuItem,
    Select,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TablePagination,
    TableRow,
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
import TouchAppIcon from '@mui/icons-material/TouchApp';
import Paper from '@mui/material/Paper';
import {formatCubeTime} from './CubeStatsPage';
import {SmartCube} from './SmartCube';
import {CubeQuaternion} from './gyro-orientation';

function RecentResults({results}: {results: GetCubeResultsQuery['cubeResults']['todayResults']}) {
    const theme = useTheme();
    const compactViewport = useMediaQuery(theme.breakpoints.down('sm'));
    const orderedResults = [...results].sort((left, right) => dayjs(right.date).valueOf() - dayjs(left.date).valueOf());
    const [page, setPage] = useState(0);
    const rowsPerPage = compactViewport ? 3 : 5;
    const paginatedResults = orderedResults.slice(page * rowsPerPage, (page + 1) * rowsPerPage);

    useEffect(() => {
        setPage(0);
    }, [results, compactViewport]);

    return (
        <Stack spacing={1} sx={{width: '100%'}}>
            <Stack direction="row" alignItems="center" spacing={1}>
                <Typography variant="h4">Ostatnie wyniki</Typography>
                <Chip size="small" label={orderedResults.length} />
            </Stack>
            {orderedResults.length === 0 ? (
                <Paper variant="outlined" sx={{p: 2, textAlign: 'center'}}>
                    <Typography color="text.secondary">Brak zapisanych wyników.</Typography>
                </Paper>
            ) : (
                <TableContainer component={Paper} variant="outlined">
                    <Table size="small" aria-label="Ostatnie wyniki kostki">
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{width: 56}}>Lp.</TableCell>
                                <TableCell>Wynik</TableCell>
                                <TableCell align="right">Godzina</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {paginatedResults.map((result, index) => (
                                <TableRow key={`${result.date}-${result.timeInMillis}-${index}`}>
                                    <TableCell component="th" scope="row" sx={{color: 'text.secondary'}}>
                                        {page * rowsPerPage + index + 1}.
                                    </TableCell>
                                    <TableCell sx={{fontVariantNumeric: 'tabular-nums', fontWeight: 'bold'}}>
                                        {formatCubeTime(result.timeInMillis)}
                                    </TableCell>
                                    <TableCell align="right" sx={{whiteSpace: 'nowrap', color: 'text.secondary'}}>
                                        {dayjs(result.date).format('HH:mm')}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    <TablePagination
                        component="div"
                        count={orderedResults.length}
                        page={page}
                        onPageChange={(_event, nextPage) => setPage(nextPage)}
                        rowsPerPage={rowsPerPage}
                        rowsPerPageOptions={[rowsPerPage]}
                        labelRowsPerPage="Wyników na stronie:"
                        labelDisplayedRows={({from, to, count}) => `${from}–${to} z ${count}`}
                        getItemAriaLabel={type =>
                            type === 'previous' ? 'Poprzednia strona' : type === 'next' ? 'Następna strona' : type
                        }
                    />
                </TableContainer>
            )}
        </Stack>
    );
}

function isTextEditingTarget(target: EventTarget | null): boolean {
    return (
        target instanceof HTMLElement &&
        (target.isContentEditable || target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')
    );
}

export function averageCubeTime(results: Array<{timeInMillis: number}>): number | null {
    if (results.length === 0) {
        return null;
    }

    return Math.round(results.reduce((total, result) => total + result.timeInMillis, 0) / results.length);
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
    const scrambleRef = useRef(scramble);
    scrambleRef.current = scramble;
    const [derivingSmartScramble, setDerivingSmartScramble] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const smartScrambleId = useRef(0);
    const smartScramblePromise = useRef<Promise<string | null> | null>(null);
    const savingResult = useRef<symbol | null>(null);
    const [visualizedScramble, setVisualizedScramble] = useState('');
    const [smartFacelets, setSmartFacelets] = useState<string | null>(null);
    const [scrambleError, setScrambleError] = useState<string | null>(null);
    const [scrambleValidationError, setScrambleValidationError] = useState<string | null>(null);
    const [isValidatingScramble, setIsValidatingScramble] = useState(false);
    const [isGeneratingScramble, setIsGeneratingScramble] = useState(false);
    const scrambleGenerationId = useRef(0);
    const scrambleValidationId = useRef(0);
    const [phase, setPhase] = useState<Phase>('IDLE');
    const [smartInspection, setSmartInspection] = useState(false);
    const [smartConnected, setSmartConnected] = useState(false);
    const orientation = useRef<CubeQuaternion | null>(null);
    const [hasOrientation, setHasOrientation] = useState(false);
    const [orientationResetVersion, setOrientationResetVersion] = useState(0);
    const [cubeElapsed, setCubeElapsed] = useState<number | null>(null);
    const confirmSmartScramble = useRef<() => boolean>(() => false);
    const smartSpaceHeld = useRef(false);
    const result = useRef(0);
    const resultActionsRef = useRef<HTMLDivElement | null>(null);
    const becomeLateInspectionTimeOutId = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        const attemptId = smartScrambleId;
        return () => { attemptId.current++; };
    }, []);

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
        smartScrambleId.current++;
        savingResult.current = null;
        smartScramblePromise.current = null;
        setDerivingSmartScramble(false);
        setSaveError(null);
        scrambleGenerationId.current++;
        scrambleValidationId.current++;
        result.current = 0;
        resetTrigger.current();
        releaseWakeLock();
        setScramble('');
        scrambleRef.current = '';
        setVisualizedScramble('');
        setScrambleError(null);
        setScrambleValidationError(null);
        setIsValidatingScramble(false);
        setIsGeneratingScramble(false);
        setSmartInspection(false);
        setCubeElapsed(null);
        setPhase('IDLE');
        forceUpdate();
    });
    const save = useRef(async () => {
        if (savingResult.current || result.current <= 0) return;
        const saveId = Symbol('cube-result-save');
        savingResult.current = saveId;
        const attempt = smartScrambleId.current;
        const resultCopy = result.current;
        const type = cubeTypeRef.current;
        const timestamp = dayjs().format('YYYY-MM-DD HH:mm:ss.SSS');
        try {
            const pending = smartScramblePromise.current;
            if (pending && await pending === null) {
                if (attempt === smartScrambleId.current) setSaveError('Nie udało się wyznaczyć scramble’a. Wpisz go ręcznie przed zapisem.');
                return;
            }
            if (attempt !== smartScrambleId.current) return;
            const scrambleCopy = scrambleRef.current.trim();
            if (scrambleCopy.length > 255) {
                setSaveError('Scramble może zawierać maksymalnie 255 znaków.');
                return;
            }
            await storeCubeResultMutation({
                variables: {cubeType: type, timestampOfSolve: timestamp, timeInMillis: resultCopy, scramble: scrambleCopy},
            });
            if (attempt === smartScrambleId.current) {
                reset.current();
                await refetch();
            }
        } catch (error) {
            if (attempt === smartScrambleId.current) setSaveError(error instanceof Error ? error.message : 'Nie udało się zapisać wyniku.');
        } finally {
            if (savingResult.current === saveId) savingResult.current = null;
        }
    });

    const {data, refetch} = useQuery<GetCubeResultsQuery>(GetCubeResults, {variables: {cubeType}});
    const [storeCubeResultMutation] = useMutation<StoreCubeResultMutation>(StoreCubeResult);
    const todayAverageInMillis = data ? averageCubeTime(data.cubeResults.todayResults) : null;

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
            if (e.code === 'Space' && (smartSpaceHeld.current || (smartConnected && phase === 'IDLE' && result.current === 0))) {
                e.preventDefault();
                if (!smartSpaceHeld.current && !e.repeat) {
                    smartSpaceHeld.current = true;
                    confirmSmartScramble.current();
                }
                return;
            }
            if (e.code === 'Space' && !smartInspection) {
                if (phase === 'IDLE' && result.current === 0) {
                    beginInspection();
                } else if (phase === 'SOLVING') {
                    result.current = stop.current();
                    setPhase('IDLE');
                }
            }
            if (e.code === 'KeyS' && phase === 'IDLE' && !derivingSmartScramble) {
                generateScrambleForSelectedCube();
            }
            if (e.code === 'KeyR') {
                reset.current();
                clearInspectionTimeout();
            }
            if (e.code === 'Enter' && phase === 'IDLE' && result.current > 0) {
                void save.current();
            }
        };

        const keyUpListener = (e: KeyboardEvent) => {
            if (e.code === 'Space' && smartSpaceHeld.current) {
                smartSpaceHeld.current = false;
                e.preventDefault();
                return;
            }
            if (isTextEditingTarget(e.target)) {
                return;
            }
            if (e.code !== 'Space' || smartInspection) {
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
    }, [phase, smartInspection, smartConnected, derivingSmartScramble, clearInspectionTimeout, beginInspection, generateScrambleForSelectedCube]);

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
                                    setSmartFacelets(null);
                                    setSmartConnected(false);
                                    orientation.current = null;
                                    setHasOrientation(false);
                                    setOrientationResetVersion(0);
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
                    <Box
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: 'minmax(0, 1fr) 145px',
                            gap: 2,
                            width: '100%',
                            alignItems: 'start',
                        }}
                    >
                        <RecentResults results={data.cubeResults.todayResults} />
                        <Stack spacing={1} sx={{width: 145, maxWidth: '100%', height: '100%'}}>
                            <Stack direction="row" alignItems="center" sx={{minHeight: 23}}>
                                <Typography variant="h4">Dziś</Typography>
                            </Stack>
                            <Stack
                                spacing={1.5}
                                sx={{
                                    pt: '1px',
                                    flexGrow: 1,
                                    justifyContent: {xs: 'space-between', md: 'flex-start'},
                                }}
                            >
                                <CubeStatCard
                                    label="Średnia"
                                    value={`${formatCubeTime(todayAverageInMillis)} z ${data.cubeResults.todayStats.numberOfTries} ułożeń`}
                                />
                                <CubeStatCard
                                    label="Najlepszy wynik"
                                    value={formatCubeTime(data.cubeResults.todayStats.min)}
                                />
                            </Stack>
                        </Stack>
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                        Blokada wygaszania ekranu: {wakeLock ? 'włączona' : 'wyłączona'}
                    </Typography>
                    <Stack direction="row" spacing={1}>
                        <Button
                            variant="contained"
                            disabled={isGeneratingScramble || derivingSmartScramble || phase !== 'IDLE'}
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
                    {saveError && <Alert severity="error" sx={{width: '100%'}}>{saveError}</Alert>}
                    <TextField
                        label="Scramble"
                        disabled={phase !== 'IDLE' || derivingSmartScramble}
                        value={scramble}
                        onChange={event => {
                            scrambleGenerationId.current++;
                            scrambleValidationId.current++;
                            setIsGeneratingScramble(false);
                            setScrambleError(null);
                            smartScramblePromise.current = null;
                            setSaveError(null);
                            scrambleRef.current = event.target.value;
                            setScramble(event.target.value);
                        }}
                        multiline
                        minRows={2}
                        maxRows={4}
                        error={scrambleValidationError !== null}
                        helperText={
                            derivingSmartScramble
                                ? 'Wyznaczanie scramble’a ze stanu kostki…'
                                : isValidatingScramble
                                ? 'Sprawdzanie…'
                                : scrambleValidationError
                                  ? `Niepoprawny scramble: ${scrambleValidationError}`
                                  : scramble.trim()
                                    ? 'Scramble jest poprawny.'
                                    : 'Wpisz lub wygeneruj scramble.'
                        }
                        sx={{width: '100%'}}
                    />
                    <CubingVisualizer cubeType={cubeType} scramble={visualizedScramble} facelets={smartFacelets} orientation={hasOrientation ? orientation : undefined} orientationResetVersion={orientationResetVersion} />
                    {cubeType === CubeType.Three && (
                        <SmartCube
                            scramble={scramble}
                            enabled={phase === 'IDLE' && result.current === 0}
                            solving={phase === 'SOLVING'}
                            inspection={smartInspection}
                            onInspection={promise => {
                                const id = ++smartScrambleId.current;
                                scrambleGenerationId.current++;
                                scrambleValidationId.current++;
                                setIsGeneratingScramble(false);
                                setScrambleError(null);
                                setSaveError(null);
                                setDerivingSmartScramble(true);
                                setScramble('');
                                scrambleRef.current = '';
                                smartScramblePromise.current = promise.then(derived => {
                                    if (id === smartScrambleId.current) {
                                        scrambleRef.current = derived;
                                        setScramble(derived);
                                        setDerivingSmartScramble(false);
                                    }
                                    return derived;
                                }).catch(error => {
                                    if (id === smartScrambleId.current) {
                                        setDerivingSmartScramble(false);
                                        setSaveError(`Nie udało się wyznaczyć scramble’a: ${error instanceof Error ? error.message : 'Nieznany błąd'}`);
                                    }
                                    return null;
                                });
                                setSmartInspection(true);
                                setPhase('INSPECTION_EARLY');
                            }}
                            onStart={() => {
                                clearInspectionTimeout();
                                setSmartInspection(false);
                                setPhase('SOLVING');
                                start.current();
                            }}
                            onStop={elapsed => {
                                stop.current();
                                result.current = elapsed;
                                setPhase('IDLE');
                            }}
                            onCancel={() => reset.current()}
                            onFacelets={setSmartFacelets}
                            onConnectionChange={connected => {
                                setSmartConnected(connected);
                                if (!connected) setOrientationResetVersion(0);
                            }}
                            onOrientationReset={() => setOrientationResetVersion(version => version + 1)}
                            onOrientation={value => {
                                const wasAvailable = orientation.current !== null;
                                orientation.current = value;
                                if (wasAvailable !== (value !== null)) setHasOrientation(value !== null);
                            }}
                            onCubeElapsed={setCubeElapsed}
                            savedElapsed={result.current}
                            confirmRef={confirmSmartScramble}
                            isTouchDevice={isTouchDevice}
                        />
                    )}
                    <Typography variant="caption" color="text.secondary">
                        Przeciągnij, aby obrócić widok.
                    </Typography>
                    {fullScreen && (
                        <Dialog
                            open={fullScreen && phase === 'SOLVING'}
                            fullScreen={true}
                            keepMounted={true}
                            onTransitionExited={() => {
                                if (result.current > 0) {
                                    resultActionsRef.current?.scrollIntoView?.({behavior: 'smooth', block: 'end'});
                                }
                            }}
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
                                {smartFacelets && <Box onTouchStart={event => event.stopPropagation()}>
                                    <CubingVisualizer cubeType={cubeType} scramble="" facelets={smartFacelets} orientation={hasOrientation ? orientation : undefined} orientationResetVersion={orientationResetVersion} />
                                </Box>}
                                {cubeElapsed !== null && <Typography>Czas kostki (od pierwszego do ostatniego ruchu): {formatCubeTime(cubeElapsed)}</Typography>}
                                <StopWatch
                                    variant={'h2'}
                                    showControls={false}
                                    sx={{color: 'text.primary'}}
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
                                        ? 'success.main'
                                        : phase === 'INSPECTION_LATE'
                                          ? 'error.main'
                                          : 'text.primary',
                            }}
                            startTrigger={startTrigger}
                            stopTrigger={stopTrigger}
                            resetTrigger={resetTrigger}
                        />
                    )}
                    <Typography>{phase}</Typography>
                    {fullScreen && smartInspection && (
                        <StopWatch showControls={false} variant="h2" inspectionMode="countdown" inspectionAllowanceMillis={INSPECTION_ALLOWANCE_MILLIS} />
                    )}
                    {fullScreen && !smartInspection && !smartConnected && (result.current === 0 || phase !== 'IDLE') && (
                        <Stack
                            role="button"
                            tabIndex={0}
                            aria-label={
                                isInspection(phase)
                                    ? 'Puść, aby uruchomić stoper'
                                    : 'Dotknij i przytrzymaj, aby rozpocząć'
                            }
                            direction={'column'}
                            sx={{
                                flexGrow: 1,
                                alignSelf: 'stretch',
                                minHeight: 180,
                                userSelect: 'none',
                                WebkitUserSelect: 'none',
                                WebkitTouchCallout: 'none',
                                WebkitTapHighlightColor: 'transparent',
                                touchAction: 'none',
                                cursor: 'pointer',
                                border: 2,
                                borderStyle: 'dashed',
                                borderColor:
                                    phase === 'INSPECTION_LATE'
                                        ? 'error.main'
                                        : phase === 'INSPECTION_EARLY'
                                          ? 'success.main'
                                          : 'primary.main',
                                borderRadius: 2,
                                bgcolor: 'action.hover',
                                justifyContent: 'center',
                                alignItems: 'center',
                                gap: 1,
                                px: 2,
                                textAlign: 'center',
                                '& *': {
                                    userSelect: 'none',
                                    WebkitUserSelect: 'none',
                                    pointerEvents: 'none',
                                },
                            }}
                            onTouchStart={event => {
                                event.preventDefault();
                                if (phase === 'IDLE' && result.current === 0) {
                                    beginInspection();
                                }
                            }}
                            onTouchEnd={event => {
                                event.preventDefault();
                                clearInspectionTimeout();
                                if (isInspection(phase)) {
                                    setPhase('SOLVING');
                                    start.current();
                                }
                            }}
                            onTouchCancel={() => {
                                clearInspectionTimeout();
                                if (isInspection(phase)) {
                                    setPhase('IDLE');
                                }
                            }}
                            onContextMenu={event => event.preventDefault()}
                        >
                            {isInspection(phase) ? (
                                <StopWatch
                                    showControls={false}
                                    variant="h2"
                                    sx={{color: phase === 'INSPECTION_EARLY' ? 'success.main' : 'error.main'}}
                                    inspectionMode={phase === 'INSPECTION_EARLY' ? 'countdown' : 'overtime'}
                                    inspectionAllowanceMillis={INSPECTION_ALLOWANCE_MILLIS}
                                />
                            ) : (
                                <TouchAppIcon sx={{fontSize: 56}} color="primary" />
                            )}
                            <Typography variant="h6">
                                {isInspection(phase) ? 'Puść, aby uruchomić stoper' : 'Dotknij i przytrzymaj'}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                {isInspection(phase)
                                    ? 'Stoper rozpocznie pomiar po oderwaniu palca.'
                                    : 'Rozpoczniesz inspekcję. Oderwij palec, aby zacząć układanie.'}
                            </Typography>
                        </Stack>
                    )}
                    {fullScreen && result.current > 0 && phase === 'IDLE' && (
                        <Stack sx={{color: 'text.primary'}}>
                            <StopWatchDisplay currentTimeInMillis={result.current} />
                        </Stack>
                    )}
                    {fullScreen && result.current > 0 && phase === 'IDLE' && (
                        <Stack
                            ref={resultActionsRef}
                            direction={'row'}
                            justifyContent={'stretch'}
                            gap={1}
                            sx={{
                                flexGrow: 1,
                                alignSelf: 'stretch',
                                minHeight: 144,
                                userSelect: 'none',
                            }}
                        >
                            <Button
                                color="success"
                                variant="contained"
                                size="large"
                                aria-label="Zapisz wynik"
                                onClick={() => void save.current()}
                                sx={{
                                    flex: 1,
                                    minHeight: 144,
                                    borderRadius: 2,
                                }}
                            >
                                <StandOutText standOutBy="bold">ZAPISZ</StandOutText>
                            </Button>
                            <Button
                                color="error"
                                variant="contained"
                                size="large"
                                aria-label="Odrzuć wynik"
                                onClick={() => reset.current()}
                                sx={{
                                    flex: 1,
                                    minHeight: 144,
                                    borderRadius: 2,
                                }}
                            >
                                <StandOutText standOutBy="bold">ODRZUĆ</StandOutText>
                            </Button>
                        </Stack>
                    )}
                </Stack>
            </Stack>
        );
    } else {
        return <></>;
    }
}
