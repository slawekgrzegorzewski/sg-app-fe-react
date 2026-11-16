import type {ReactNode} from 'react';
import {alpha} from '@mui/material/styles';
import {useViewportWorkspace} from '../use-viewport-workspace';
import {TrainerFeedback} from './TrainerFeedback';
import {parseCubeMove} from '../cube-move';
import {CubeFacelets} from '../cube-facelets';
import {useCallback, useEffect, useRef, useState} from 'react';
import {useMutation} from '@apollo/client/react';
import {
    Alert,
    Box,
    Button,
    Chip,
    Divider,
    FormControl,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    Stack,
    Typography
} from '@mui/material';
import dayjs from 'dayjs';
import {
    CfopStage,
    CubeTrainerDevice,
    CubeTrainerMode,
    CubeType,
    SaveCubeTrainerAttempt,
    SaveCubeTrainerAttemptMutation,
    SaveCubeTrainerAttemptMutationVariables,
} from '../../types';
import {CubingVisualizer} from '../CubingVisualizer';
import {
    TRAINER_CUBE_ORIENTATION,
    TRAINER_DEVICE_CROSS_FACE,
    trainerScrambleInDeviceFrame
} from './trainer-cube-orientation';
import {SmartCube} from '../SmartCube';
import {StopWatch} from '../StopWatch';
import {StopWatchDisplay} from '../StopWatchDisplay';
import {faceletsFromCubingAlgorithm} from '../cubing-api';
import {generateCubingScramble} from '../cubing-scramble';
import {SmartCubeRecording} from '../smart-cube-recording';
import {applyCubeMove} from '../smart-cube-state';
import {CROSS_FACES, CrossFace, trainingGoalReached} from './training-goal';

type Props = {
    stage: CfopStage;
    mode: CubeTrainerMode;
    algorithmPublicId?: string;
    algorithmSequence?: string;
    setupAlgorithm?: string;
    sidebar?: ReactNode;
    onSaved: () => Promise<unknown>;
    onBusyChange: (busy: boolean) => void;
};

type CompletedAttempt = {
    input: SaveCubeTrainerAttemptMutationVariables['input'];
    goalReached: boolean | null;
};

function newAttemptId(): string {
    if (crypto.randomUUID) {
        return crypto.randomUUID();
    }
    const bytes = crypto.getRandomValues(
        new Uint8Array(16));
    bytes[6] = (bytes[6] & 15) | 64;
    bytes[8] = (bytes[8] & 63) | 128;
    const hex = Array.from(
        bytes,
        byte => byte.toString(16)
            .padStart(2, '0'));
    return [
        hex.slice(0, 8),
        hex.slice(8, 12),
        hex.slice(12, 16),
        hex.slice(16, 20),
        hex.slice(20),
    ].join('-');
}

export function TrainerSession({
                                   stage,
                                   mode,
                                   algorithmPublicId,
                                   algorithmSequence,
                                   setupAlgorithm,
                                   sidebar,
                                   onSaved,
                                   onBusyChange,
                               }: Props) {
    const workspaceRef = useViewportWorkspace();
    const [scramble, setScramble] = useState(setupAlgorithm ?? '');
    const [crossFace, setCrossFace] = useState<CrossFace>('D');
    const deviceCrossFace = stage === CfopStage.Cross ? crossFace : TRAINER_DEVICE_CROSS_FACE;
    const [expectedFacelets, setExpectedFacelets] = useState<CubeFacelets | null>(null);
    const [facelets, setFacelets] = useState<CubeFacelets | null>(null);
    const [connected, setConnected] = useState(false);
    const [phase, setPhase] = useState<'idle' | 'inspection' | 'running' | 'review'>('idle');
    const phaseRef = useRef(phase);
    const [savedAttemptId, setSavedAttemptId] = useState<string | null>(null);
    const autoSaveStarted = useRef<string | null>(null);
    const [completed, setCompleted] = useState<CompletedAttempt | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [preparing, setPreparing] = useState(false);
    const generation = useRef(0);
    const startTime = useRef<number | null>(null);
    const startTimer = useRef(() => {
    });
    const stopTimer = useRef(() => 0);
    const resetTimer = useRef(() => {
    });
    const confirmSmart = useRef(() => false);
    const stopSmart = useRef(() => {
    });
    const [saveAttempt, {loading: saving}] = useMutation<
        SaveCubeTrainerAttemptMutation,
        SaveCubeTrainerAttemptMutationVariables
    >(SaveCubeTrainerAttempt);

    const changePhase = useCallback(
        (next: typeof phase) => {
            phaseRef.current = next;
            setPhase(next);
            onBusyChange(
                next !== 'idle');
        },
        [onBusyChange]);

    const generateCross = useCallback(
        async () => {
            const version = ++generation.current;
            setPreparing(true);
            setError(null);
            try {
                const generated = await generateCubingScramble(CubeType.Three);
                if (version === generation.current) {
                    setScramble(generated);
                }
            } catch {
                if (version === generation.current) {
                    setError('Nie udało się wygenerować scramble’a.');
                }
            } finally {
                if (version === generation.current) {
                    setPreparing(false);
                }
            }
        },
        []);

    const cancelGeneration = useCallback(
        () => {
            generation.current++;
        },
        []);

    useEffect(
        () => {
            if (stage === CfopStage.Cross) {
                void generateCross();
            } else {
                setScramble(
                    setupAlgorithm ?? '');
            }
            return cancelGeneration;
        },
        [
            stage,
            setupAlgorithm,
            generateCross,
            cancelGeneration,
        ]);

    useEffect(
        () => {
            setExpectedFacelets(null);
            if (!scramble.trim()) {
                return;
            }
            let disposed = false;
            setError(null);
            faceletsFromCubingAlgorithm(
                stage === CfopStage.Cross
                    ? scramble
                    : trainerScrambleInDeviceFrame(scramble))
                .then(
                    state => {
                        if (disposed) {
                            return;
                        }
                        if (trainingGoalReached(state, stage, deviceCrossFace)) {
                            setError(
                                'Cel ćwiczenia jest już osiągnięty po mieszaniu. Wybierz inny scramble lub kolor krzyża.');
                        } else {
                            setExpectedFacelets(state);
                        }
                    })
                .catch(
                    () => {
                        if (!disposed) {
                            setError('Nie można odtworzyć stanu początkowego z tego scramble’a.');
                        }
                    });
            return () => {
                disposed = true;
            };
        },
        [
            scramble,
            stage,
            deviceCrossFace,
        ]);

    const start = () => {
        startTime.current = performance.now();
        startTimer.current();
        changePhase('running');
    };

    const finish = (
        durationMs: number,
        recording?: SmartCubeRecording | null) => {
        stopTimer.current();
        startTime.current = null;
        const moves = recording?.events.flatMap(
            ({event}) => (event.type === 'MOVE'
                ? [parseCubeMove(event.move)]
                : []));
        let finalState = recording?.initialFacelets;
        if (finalState && moves) {
            for (const move of moves) {
                finalState = applyCubeMove(finalState, move);
            }
        }
        setCompleted(
            {
                input: {
                    publicId: newAttemptId(),
                    stage,
                    mode,
                    device: recording
                        ? CubeTrainerDevice.Smart
                        : CubeTrainerDevice.Manual,
                    algorithmPublicId: algorithmPublicId ?? null,
                    scramble,
                    crossFace: deviceCrossFace,
                    durationMs: Math.max(
                        1,
                        Math.round(durationMs)),
                    actualAlgorithm: moves?.join(' ') ?? null,
                    recording: recording && stage === CfopStage.Cross ? JSON.stringify(recording) : null,
                    performedAt: dayjs()
                        .format('YYYY-MM-DD HH:mm:ss.SSS'),
                },
                goalReached: finalState
                    ? trainingGoalReached(finalState, stage, deviceCrossFace)
                    : null,
            });
        changePhase('review');
    };

    const reset = () => {
        resetTimer.current();
        startTime.current = null;
        setCompleted(null);
        setSavedAttemptId(null);
        autoSaveStarted.current = null;
        setError(null);
        changePhase('idle');
    };

    const handleSpace = useRef(
        () => {
        });
    handleSpace.current = () => {
        if (saving || !expectedFacelets || preparing) {
            return;
        }
        if (connected) {
            if (phaseRef.current === 'idle') {
                confirmSmart.current();
            }
        } else if (phaseRef.current === 'idle') {
            start();
        } else if (phaseRef.current === 'running' && startTime.current !== null) {
            finish(
                performance.now() - startTime.current);
        }
    };

    useEffect(
        () => {
            const keyDown = (event: KeyboardEvent) => {
                const target = event.target;
                if (
                    event.code !== 'Space'
                    || event.repeat
                    || (target instanceof HTMLElement
                        && (target.isContentEditable
                            || !!target.closest('input, textarea, select, button, [role="combobox"]')))
                ) {
                    return;
                }
                event.preventDefault();
                handleSpace.current();
            };
            window.addEventListener('keydown', keyDown);
            return () => window.removeEventListener('keydown', keyDown);
        },
        []);

    const save = async () => {
        if (!completed) {
            return;
        }
        setError(null);
        try {
            await saveAttempt(
                {
                    variables: {
                        input: {
                            ...completed.input,
                            performedAt: completed.input.performedAt.replace('T', ' '),
                        },
                    },
                });
        } catch {
            setError('Nie udało się zapisać próby. Możesz ponowić zapis.');
            return;
        }
        if (completed.input.stage === CfopStage.Cross && completed.input.recording) {
            setSavedAttemptId(completed.input.publicId);
        } else {
            reset();
        }
        try {
            await onSaved();
        } catch {
            setError('Próba została zapisana, ale nie udało się odświeżyć historii.');
        }
    };

    useEffect(() => {
        if (!completed?.input.recording || completed.input.stage !== CfopStage.Cross
            || autoSaveStarted.current === completed.input.publicId) {
            return;
        }
        autoSaveStarted.current = completed.input.publicId;
        setError(null);
        void saveAttempt({variables: {input: completed.input}})
            .then(async () => {
                setSavedAttemptId(completed.input.publicId);
                try {
                    await onSaved();
                } catch {
                    setError('Próba została zapisana, ale nie udało się odświeżyć historii.');
                }
            })
            .catch(() => setError('Nie udało się zapisać próby. Możesz ponowić zapis.'));
    }, [completed, saveAttempt, onSaved]);


    const goalReached = useCallback(
        (state: CubeFacelets) => trainingGoalReached(state, stage, deviceCrossFace),
        [
            stage,
            deviceCrossFace,
        ]);
    const busy = phase !== 'idle';

    const phaseLabel = {idle: 'Gotowe', inspection: 'Inspekcja', running: 'Pomiar', review: 'Oceń próbę'}[phase];
    return (
        <Box
            ref={workspaceRef}
            sx={{
                display: 'grid',
                gridTemplateColumns: {
                    xs: 'minmax(0, 1fr)',
                    lg: 'minmax(0, 1fr) minmax(300px, 340px) minmax(300px, 380px)',
                },
                gridTemplateAreas: {xs: '"timer" "cube" "sidebar"', lg: '"cube timer sidebar"'},
                gridTemplateRows: {lg: 'minmax(0, 1fr)'},
                height: {lg: 'var(--workspace-height)'},
                gap: {xs: 3, lg: 2},
                minWidth: 0,
            }}
        >
            <Paper variant="outlined" sx={{
                gridArea: 'cube', minWidth: 0, minHeight: 0, overflow: 'auto',
                borderRadius: 3, display: 'flex', flexDirection: 'column',
            }}>
                <Stack spacing={1.5} sx={{p: 2}}>
                    <Typography variant="h4">Ćwiczenie {stage}</Typography>
                    {stage === CfopStage.Cross
                        && (
                            <Stack direction={{xs: 'column', sm: 'row'}} spacing={2}>
                                <FormControl sx={{minWidth: 180}}>
                                    <InputLabel id="trainer-cross-face-label">Ścianka krzyża</InputLabel>
                                    <Select
                                        labelId="trainer-cross-face-label"
                                        label="Ścianka krzyża"
                                        value={crossFace}
                                        disabled={busy}
                                        onChange={event => setCrossFace(event.target.value as CrossFace)}
                                    >
                                        {CROSS_FACES.map(
                                            face => (
                                                <MenuItem key={face} value={face}>
                                                    {face}
                                                </MenuItem>
                                            ))}
                                    </Select>
                                </FormControl>
                                <Button
                                    color="primary"
                                    onClick={() => void generateCross()}
                                    disabled={busy || preparing}
                                >
                                    Nowy scramble
                                </Button>
                            </Stack>
                        )}

                </Stack>
                <Box sx={{
                    px: 1,
                    flexGrow: 1,
                    minHeight: {lg: 160},
                    background: theme => `radial-gradient(ellipse at center, ${alpha(theme.palette.primary.main, 0.12)}, transparent 70%)`,
                }}>
                    <CubingVisualizer
                        variant="hero"
                        cubeType={CubeType.Three}
                        scramble={scramble}
                        facelets={facelets}
                        initialCubeOrientation={stage === CfopStage.Cross ? '' : TRAINER_CUBE_ORIENTATION}
                    />
                </Box>
                <Divider/>
                <Stack spacing={1.5} sx={{p: 2}}>
                    <Typography variant="subtitle2">Mieszanie od ułożonej kostki</Typography>
                    <Typography sx={{fontFamily: 'monospace', overflowWrap: 'anywhere'}}>
                        {scramble || 'Przygotowywanie mieszania…'}
                    </Typography>
                    {algorithmSequence
                        && (
                            <Stack>
                                <Typography variant="subtitle2">Wybrany algorytm</Typography>
                                <Typography sx={{fontFamily: 'monospace', overflowWrap: 'anywhere'}}>
                                    {algorithmSequence}
                                </Typography>
                            </Stack>
                        )}

                </Stack>
            </Paper>
            <Paper variant="outlined" sx={{
                gridArea: 'timer', minWidth: 0, minHeight: 0, overflowY: {lg: 'auto'}, p: 2, borderRadius: 3,
            }}>
                <Stack spacing={2}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="h4">Stoper</Typography>
                        <Chip size="small" label={phaseLabel}/>
                    </Stack>
                    {error && <Alert severity="error">{error}</Alert>}
                    {phase === 'review' && completed
                        ? (
                            <Stack spacing={2}>
                                <StopWatchDisplay
                                    currentTimeInMillis={completed.input.durationMs}
                                    variant="h2"
                                />
                                <Alert
                                    severity={
                                        completed.goalReached === false
                                            ? 'warning'
                                            : completed.goalReached === true
                                                ? 'success'
                                                : 'info'
                                    }
                                >
                                    {completed.goalReached === null
                                        ? 'Oceń wykonanie samodzielnie i zdecyduj, czy zapisać próbę.'
                                        : completed.goalReached
                                            ? 'Cel ćwiczenia osiągnięty.'
                                            : 'Cel ćwiczenia nie został osiągnięty. Możesz mimo to zapisać próbę.'}
                                </Alert>
                                {completed.input.actualAlgorithm
                                    && (
                                        <Typography sx={{overflowWrap: 'anywhere'}}>
                                            Wykonane ruchy: {completed.input.actualAlgorithm}
                                        </Typography>
                                    )}
                                {savedAttemptId && <TrainerFeedback publicId={savedAttemptId}/>}
                                <Stack direction="column" spacing={1}>
                                    {savedAttemptId ? (
                                        <Button variant="contained" onClick={reset}>Kolejna próba</Button>
                                    ) : (
                                        <>
                                            <Button color="primary" variant="contained" size="large"
                                                    sx={{minHeight: 48}} onClick={() => void save()} disabled={saving}>
                                                {saving ? 'Zapisywanie próby…' : 'Zapisz próbę'}
                                            </Button>
                                            <Button color="primary" onClick={reset} disabled={saving}>
                                                Odrzuć próbę
                                            </Button>
                                        </>
                                    )}
                                </Stack>
                            </Stack>
                        )
                        : (
                            <>
                                <StopWatch
                                    showControls={false}
                                    variant="h2"
                                    startTrigger={startTimer}
                                    stopTrigger={stopTimer}
                                    resetTrigger={resetTimer}
                                    inspectionMode={phase === 'inspection'
                                        ? 'countdown'
                                        : undefined}
                                    inspectionAllowanceMillis={15000}
                                />
                                <Stack direction="column" spacing={1}>
                                    {phase === 'idle'
                                        && (
                                            <Button
                                                color="primary"
                                                variant="contained"
                                                size="large"
                                                sx={{minHeight: 48}}
                                                disabled={
                                                    !expectedFacelets || preparing || (connected
                                                        && facelets !== expectedFacelets)
                                                }
                                                onClick={() => handleSpace.current()}
                                            >
                                                {connected
                                                    ? 'Przypadek gotowy — rozpocznij inspekcję'
                                                    : 'Start'}
                                            </Button>
                                        )}
                                    {phase === 'running'
                                        && (
                                            <Button
                                                color="primary"
                                                variant="contained"
                                                size="large"
                                                sx={{minHeight: 48}}
                                                onClick={() => (connected
                                                    ? stopSmart.current()
                                                    : handleSpace.current())}
                                            >
                                                {connected
                                                    ? 'Zatrzymaj i oceń próbę'
                                                    : 'Stop'}
                                            </Button>
                                        )}
                                    {busy
                                        && (
                                            <Button color="primary" onClick={reset}>
                                                Anuluj próbę
                                            </Button>
                                        )}
                                </Stack>
                                <Typography variant="body2" color="text.secondary">
                                    {connected
                                        ? 'Pierwszy ruch uruchamia stoper, a osiągnięcie celu ćwiczenia go zatrzymuje. Inspekcja trwa maksymalnie 15 sekund.'
                                        : 'Przygotuj przypadek według mieszania. Spacja uruchamia i zatrzymuje stoper. Możesz też użyć przycisków.'}
                                </Typography>
                            </>
                        )}

                    <Divider/>
                    <Typography variant="subtitle2">Smart kostka</Typography>
                    <SmartCube
                        compact
                        scramble={scramble}
                        enabled={phase === 'idle' && !!expectedFacelets && !preparing}
                        inspection={phase === 'inspection'}
                        solving={phase === 'running'}
                        expectedFacelets={expectedFacelets}
                        isComplete={goalReached}
                        stopRef={stopSmart}
                        buttonColor="primary"
                        onInspection={() => changePhase('inspection')}
                        onStart={start}
                        onStop={finish}
                        onCancel={reset}
                        onFacelets={setFacelets}
                        onConnectionChange={setConnected}
                        confirmRef={confirmSmart}
                        isTouchDevice={false}
                    />
                    {connected && phase === 'idle' && expectedFacelets
                        && (
                            <Alert severity={facelets === expectedFacelets
                                ? 'success'
                                : 'info'}
                            >
                                {facelets === expectedFacelets
                                    ? 'Przypadek przygotowany. Potwierdź gotowość przyciskiem lub spacją.'
                                    : 'Wykonaj podane mieszanie od ułożonej kostki. Potwierdzenie będzie dostępne po osiągnięciu tego stanu.'}
                            </Alert>
                        )}

                </Stack>
            </Paper>
            {sidebar && (
                <Paper variant="outlined" sx={{
                    gridArea: 'sidebar', minWidth: 0, minHeight: 0, overflowY: {lg: 'auto'}, p: 2, borderRadius: 3,
                }}>
                    {sidebar}
                </Paper>
            )}
        </Box>
    );
}
