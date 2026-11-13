import {Alert, Button, Stack, TextField, Typography} from '@mui/material';
import type {RefObject} from 'react';
import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import type {SmartCubeEvent} from 'smartcube-web-bluetooth';
import {connectSmartCube, SmartCubeConnection} from 'smartcube-web-bluetooth';
import {applyCubeMove, scrambleStates, SOLVED_CUBE} from './smart-cube-state';
import {INSPECTION_ALLOWANCE_MILLIS} from './phase';
import {deriveCubingScramble} from './cubing-api';
import {formatStopWatchTime} from './StopWatchDisplay';
import {normalizeGyroQuaternion, orientationFromInitialReference} from './gyro-orientation';
import {downloadSmartCubeRecording, SmartCubeRecording} from './smart-cube-recording';
import {CubeQuaternion} from './quaternion';

type Props = {
    scramble: string;
    enabled: boolean;
    solving: boolean;
    inspection: boolean;
    onInspection: (scramble: Promise<string>) => void;
    onStart: () => void;
    onStop: (elapsed: number, recording?: SmartCubeRecording | null) => void;
    onCancel: () => void;
    onFacelets: (facelets: string | null) => void;
    onConnectionChange: (connected: boolean) => void;
    onCubeElapsed?: (elapsed: number | null) => void;
    savedElapsed?: number;
    onOrientation?: (orientation: CubeQuaternion | null) => void;
    onGyro?: (reading: Extract<SmartCubeEvent, { type: 'GYRO' }> | null) => void;
    onOrientationReset?: () => void;
    confirmRef: RefObject<() => boolean>;
    isTouchDevice: boolean;
};

export function SmartCube({
                              scramble,
                              enabled,
                              solving,
                              inspection,
                              onInspection,
                              onStart,
                              onStop,
                              onCancel,
                              onFacelets,
                              onConnectionChange,
                              onCubeElapsed,
                              savedElapsed,
                              onOrientation,
                              onGyro,
                              onOrientationReset,
                              confirmRef,
                              isTouchDevice
                          }: Props) {
    const [connection, setConnection] = useState<SmartCubeConnection | null>(null);
    const connectionRef = useRef<SmartCubeConnection | null>(null);
    const mounted = useRef(false);
    const unsubscribe = useRef<(() => void) | null>(null);
    const [connecting, setConnecting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [macRequest, setMacRequest] = useState<string | null>(null);
    const [macInput, setMacInput] = useState('');
    const macResolver = useRef<((value: string | null) => void) | null>(null);
    const macCancelled = useRef(false);
    const [facelets, setFacelets] = useState<string | null>(null);
    const stateRef = useRef<string | null>(null);
    const startedAt = useRef<number | null>(null);
    const recording = useRef<SmartCubeRecording | null>(null);
    const [completedRecording, setCompletedRecording] = useState<SmartCubeRecording | null>(null);
    const initialSceneOrientation = useRef<CubeQuaternion | null>(null);
    const latestSceneOrientation = useRef<CubeQuaternion | null>(null);
    const latestGyroEvent = useRef<Extract<SmartCubeEvent, { type: 'GYRO' }> | null>(null);
    const [gyroAvailable, setGyroAvailable] = useState(false);
    const cubeStartedAt = useRef<number | null>(null);
    const [cubeElapsed, setCubeElapsed] = useState<number | null>(null);
    const inspectionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const inspectionDeadline = useRef(0);
    const inspecting = useRef(false);
    const [scrambled, setScrambled] = useState(false);
    const scrambledRef = useRef(false);
    const callbacks = useRef({
        onInspection,
        onStart,
        onStop,
        onCancel,
        onFacelets,
        onConnectionChange,
        onCubeElapsed,
        onOrientation,
        onGyro
    });
    callbacks.current = {
        onInspection,
        onStart,
        onStop,
        onCancel,
        onFacelets,
        onConnectionChange,
        onCubeElapsed,
        onOrientation,
        onGyro
    };
    const states = useMemo(() => {
        try {
            return scramble.trim() ? scrambleStates(scramble) : [];
        } catch {
            return [];
        }
    }, [scramble]);
    const progress = facelets ? states.lastIndexOf(facelets) : -1;

    useEffect(() => {
        if (!inspection && !solving && enabled) {
            if (inspectionTimer.current) clearTimeout(inspectionTimer.current);
            inspectionTimer.current = null;
            inspecting.current = false;
            startedAt.current = null;
            recording.current = null;
            setCompletedRecording(null);
            cubeStartedAt.current = null;
            setCubeElapsed(null);
        }
        if (!inspection && !solving && !enabled && startedAt.current !== null) {
            startedAt.current = null;
            recording.current = null;
        }
    }, [inspection, solving, enabled]);

    useEffect(() => {
        mounted.current = true;
        return () => {
            mounted.current = false;
            macResolver.current?.(null);
            macResolver.current = null;
            if (inspectionTimer.current) clearTimeout(inspectionTimer.current);
            unsubscribe.current?.();
            void connectionRef.current?.disconnect();
        };
    }, []);

    const connect = async () => {
        setConnecting(true);
        setError(null);
        macCancelled.current = false;
        try {
            const conn = await connectSmartCube(async (device, isFallbackCall) => {
                if (!isFallbackCall || !mounted.current) return null;
                setMacInput('');
                setMacRequest(device.name || 'kostki');
                return new Promise<string | null>(resolve => {
                    macResolver.current = resolve;
                });
            });
            if (!mounted.current) {
                await conn.disconnect();
                return;
            }
            connectionRef.current = conn;
            setConnection(conn);
            callbacks.current.onConnectionChange(true);
            const subscription = conn.events$.subscribe(event => {
                if ((event.type === 'MOVE' || event.type === 'GYRO') && recording.current) {
                    const snapshot = event.type === 'GYRO'
                        ? {
                            ...event,
                            quaternion: {...event.quaternion},
                            ...(event.velocity
                                ? {
                                    velocity: {...event.velocity}
                                }
                                : {})
                        }
                        : {...event};
                    recording.current.events.push({receivedAt: performance.now(), event: snapshot});
                }
                if (event.type === 'DISCONNECT') {
                    unsubscribe.current?.();
                    unsubscribe.current = null;
                    if (startedAt.current !== null || inspecting.current) {
                        callbacks.current.onCancel();
                        setError('Połączenie z kostką zostało przerwane. Pomiar odrzucono.');
                    }
                    recording.current = null;
                    connectionRef.current = null;
                    setConnection(null);
                    callbacks.current.onConnectionChange(false);
                    initialSceneOrientation.current = null;
                    latestSceneOrientation.current = null;
                    latestGyroEvent.current = null;
                    callbacks.current.onGyro?.(null);
                    setGyroAvailable(false);
                    callbacks.current.onOrientation?.(null);
                    stateRef.current = null;
                    setFacelets(null);
                    callbacks.current.onFacelets(null);
                    if (inspectionTimer.current) clearTimeout(inspectionTimer.current);
                    inspectionTimer.current = null;
                    inspecting.current = false;
                    scrambledRef.current = false;
                    setScrambled(false);
                    startedAt.current = null;
                } else if (event.type === 'GYRO') {
                    latestGyroEvent.current = {
                        ...event,
                        quaternion: {...event.quaternion}, ...(event.velocity ? {velocity: {...event.velocity}} : {})
                    };
                    callbacks.current.onGyro?.(latestGyroEvent.current);
                    const sceneOrientation = normalizeGyroQuaternion(event.quaternion);
                    if (sceneOrientation) {
                        if (!latestSceneOrientation.current) setGyroAvailable(true);
                        latestSceneOrientation.current = sceneOrientation;
                        initialSceneOrientation.current ??= sceneOrientation;
                        callbacks.current.onOrientation?.(orientationFromInitialReference(initialSceneOrientation.current, sceneOrientation));
                    }
                } else if (event.type === 'FACELETS' && event.facelets.length === 54) {
                    stateRef.current = event.facelets;
                    setFacelets(event.facelets);
                    callbacks.current.onFacelets(event.facelets);
                    if (event.facelets === SOLVED_CUBE) {
                        scrambledRef.current = false;
                        setScrambled(false);
                    }
                } else if (event.type === 'MOVE' && stateRef.current) {
                    const before = stateRef.current;
                    let next: string;
                    try {
                        next = applyCubeMove(before, event.move);
                    } catch {
                        setError('Nie rozpoznano ruchu kostki. Połącz ją ponownie, aby zsynchronizować stan.');
                        stateRef.current = null;
                        setFacelets(null);
                        callbacks.current.onFacelets(null);
                        if (inspectionTimer.current) clearTimeout(inspectionTimer.current);
                        inspectionTimer.current = null;
                        if (startedAt.current !== null || inspecting.current) callbacks.current.onCancel();
                        recording.current = null;
                        inspecting.current = false;
                        startedAt.current = null;
                        scrambledRef.current = false;
                        setScrambled(false);
                        return;
                    }
                    stateRef.current = next;
                    setFacelets(next);
                    callbacks.current.onFacelets(next);
                    if (before === SOLVED_CUBE && next !== SOLVED_CUBE) scrambledRef.current = true;
                    if (next === SOLVED_CUBE) scrambledRef.current = false;
                    setScrambled(scrambledRef.current);
                    const now = performance.now();
                    const cubeTime = event.cubeTimestamp;
                    if ((startedAt.current !== null || inspecting.current) && typeof cubeTime === 'number' && Number.isFinite(cubeTime)) {
                        if (cubeStartedAt.current === null) cubeStartedAt.current = cubeTime;
                        const elapsed = cubeTime >= cubeStartedAt.current ? Math.round(cubeTime - cubeStartedAt.current) : null;
                        setCubeElapsed(elapsed);
                        callbacks.current.onCubeElapsed?.(elapsed);
                    }
                    if (startedAt.current !== null) {
                        if (next === SOLVED_CUBE) {
                            const elapsed = Math.max(1, Math.round(now - startedAt.current));
                            startedAt.current = null;
                            setCompletedRecording(recording.current);
                            const completed = recording.current;
                            recording.current = null;
                            callbacks.current.onStop(elapsed, completed);
                        }
                    } else if (inspecting.current) {
                        if (inspectionTimer.current) clearTimeout(inspectionTimer.current);
                        inspectionTimer.current = null;
                        inspecting.current = false;
                        startedAt.current = Math.min(now, inspectionDeadline.current);
                        if (recording.current) recording.current.solveStartedAt = startedAt.current;
                        callbacks.current.onStart();
                        if (next === SOLVED_CUBE) {
                            const elapsed = Math.max(1, Math.round(now - startedAt.current));
                            startedAt.current = null;
                            setCompletedRecording(recording.current);
                            const completed = recording.current;
                            recording.current = null;
                            callbacks.current.onStop(elapsed, completed);
                        }
                    }
                }
            });
            unsubscribe.current = () => subscription.unsubscribe();
            if (conn.capabilities.facelets) await conn.sendCommand({type: 'REQUEST_FACELETS'});
            else setError('Kostka nie udostępnia odczytu stanu ścianek.');
        } catch (e) {
            if (mounted.current && !macCancelled.current) setError(e instanceof Error ? e.message : 'Nie udało się połączyć z kostką.');
            if (connectionRef.current) await connectionRef.current.disconnect();
        } finally {
            if (mounted.current) setConnecting(false);
        }
    };

    const submitMac = (value: string | null) => {
        macCancelled.current = value === null;
        macResolver.current?.(value);
        macResolver.current = null;
        setMacRequest(null);
    };

    const confirmScramble = useCallback((): boolean => {
        if (!enabled || inspecting.current || !connectionRef.current || !scrambledRef.current || !stateRef.current || stateRef.current === SOLVED_CUBE) return false;
        inspecting.current = true;
        recording.current = {
            version: 1,
            initialFacelets: stateRef.current,
            initialGyro: latestGyroEvent.current,
            timeOrigin: performance.timeOrigin,
            inspectionStartedAt: performance.now(),
            solveStartedAt: null,
            events: [],
        };
        setCompletedRecording(null);
        cubeStartedAt.current = null;
        setCubeElapsed(null);
        callbacks.current.onInspection(deriveCubingScramble(stateRef.current));
        const deadline = performance.now() + INSPECTION_ALLOWANCE_MILLIS;
        inspectionDeadline.current = deadline;
        inspectionTimer.current = setTimeout(() => {
            inspectionTimer.current = null;
            if (!inspecting.current) return;
            inspecting.current = false;
            startedAt.current = deadline;
            if (recording.current) recording.current.solveStartedAt = deadline;
            callbacks.current.onStart();
        }, INSPECTION_ALLOWANCE_MILLIS);
        return true;
    }, [enabled]);

    useEffect(() => {
        confirmRef.current = confirmScramble;
        return () => {
            confirmRef.current = () => false;
        };
    }, [confirmRef, confirmScramble]);

    return <Stack spacing={1} alignItems="center" sx={{width: '100%'}}>
        <Button variant="outlined" disabled={connecting}
                onClick={() => connection ? void connection.disconnect() : void connect()}>
            {connecting ? 'Łączenie…' : connection ? `Rozłącz ${connection.deviceName}` : 'Połącz smart kostkę'}
        </Button>
        {macRequest && <Stack spacing={1} alignItems="center" component="form" onSubmit={event => {
            event.preventDefault();
            if (/^(?:[0-9a-f]{2}:){5}[0-9a-f]{2}$/i.test(macInput.trim())) submitMac(macInput.trim().toUpperCase());
        }}>
            <Typography>Nie udało się odczytać adresu MAC urządzenia {macRequest}. Podaj go ręcznie.</Typography>
            <TextField label="Adres MAC kostki" value={macInput} onChange={event => setMacInput(event.target.value)}
                       placeholder="XX:XX:XX:XX:XX:XX"
                       helperText="Format: 6 par znaków szesnastkowych oddzielonych dwukropkami."/>
            <Stack direction="row" spacing={1}>
                <Button type="submit" variant="contained"
                        disabled={!/^(?:[0-9a-f]{2}:){5}[0-9a-f]{2}$/i.test(macInput.trim())}>Połącz</Button>
                <Button onClick={() => submitMac(null)}>Anuluj</Button>
            </Stack>
        </Stack>}
        {error && <Alert severity="error">{error}</Alert>}
        {connection && <Stack spacing={0.5} alignItems="center">
            <Button variant="outlined" disabled={!gyroAvailable} onClick={() => {
                if (!latestSceneOrientation.current) return;
                initialSceneOrientation.current = latestSceneOrientation.current;
                callbacks.current.onOrientation?.(orientationFromInitialReference(latestSceneOrientation.current, latestSceneOrientation.current));
                onOrientationReset?.();
            }}>Resetuj położenie kostki</Button>
            <Typography color="text.secondary" variant="body2" align="center">
                Ustaw kostkę zieloną ścianką do przodu, a białą do góry, i naciśnij przycisk.
                {!gyroAvailable && ' Oczekiwanie na dane żyroskopu.'}
            </Typography>
        </Stack>}
        {completedRecording &&
            <Button variant="outlined" onClick={() => downloadSmartCubeRecording(completedRecording)}>
                Pobierz surowe dane solve’a
            </Button>}
        {connection && cubeElapsed !== null && <Typography color="text.secondary" variant="body2">
            Czas kostki (od pierwszego do ostatniego ruchu): {formatStopWatchTime(cubeElapsed)}
            {savedElapsed !== undefined && savedElapsed > 0 && <> · Różnica względem zapisywanego
                czasu: {cubeElapsed - savedElapsed >= 0 ? '+' : '−'}{formatStopWatchTime(Math.abs(cubeElapsed - savedElapsed))}</>}
        </Typography>}
        {connection && isTouchDevice && <Button variant="contained" onClick={confirmScramble}
                                                disabled={!enabled || !scrambled || !facelets || facelets === SOLVED_CUBE}>
            Scramble gotowy — rozpocznij inspekcję
        </Button>}
        {connection && <Typography color="text.secondary" variant="body2">
            {!facelets ? 'Oczekiwanie na stan kostki…' : inspection ? 'Inspekcja: pierwszy ruch lub upływ 15 sekund uruchomi stoper.' :
                solving ? 'Układaj kostkę — stoper zatrzyma się po jej ułożeniu.' :
                    !scrambled ? 'Ułóż kostkę, a następnie wykonaj scramble.' :
                        states.length < 2 ? 'Potwierdź gotowość scramble’a.' :
                            progress === states.length - 1 ? 'Wykonano podany scramble. Potwierdź jego gotowość.' :
                                progress >= 0 ? `Scramble: ${progress} / ${states.length - 1} ruchów. Możesz też potwierdzić własny scramble.` : 'Własny scramble — potwierdź gotowość lub kontynuuj mieszanie.'}
        </Typography>}
        {connection && !isTouchDevice && enabled && scrambled && facelets && facelets !== SOLVED_CUBE &&
            <Typography color="text.secondary" variant="body2">Naciśnij spację, aby potwierdzić scramble i rozpocząć
                inspekcję.</Typography>}
    </Stack>;
}
