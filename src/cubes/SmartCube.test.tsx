import {CubeFacelets} from './cube-facelets';
import {act, fireEvent, render, screen} from '@testing-library/react';
import {useRef, useState} from 'react';
import {Subject} from 'rxjs';
import {connectSmartCube, SmartCubeEvent} from 'smartcube-web-bluetooth';
import {SmartCube} from './SmartCube';
import {applyCubeMove, SOLVED_CUBE} from './smart-cube-state';
import {deriveCubingScramble} from './cubing-api';
import {downloadSmartCubeRecording} from './smart-cube-recording';

jest.mock('smartcube-web-bluetooth', () => ({connectSmartCube: jest.fn()}));
jest.mock('./cubing-api', () => ({deriveCubingScramble: jest.fn()}));
jest.mock('./smart-cube-recording', () => ({downloadSmartCubeRecording: jest.fn()}));

async function setup(
    scramble = 'R U',
    isComplete?: (facelets: CubeFacelets) => boolean,
    batteryOptions: { supported?: boolean; fails?: boolean } = {},
    expectedFacelets?: CubeFacelets) {
    const events = new Subject<SmartCubeEvent>();
    const disconnect = jest.fn().mockResolvedValue(undefined);
    const sendCommand = jest.fn().mockImplementation(command =>
        command.type === 'REQUEST_BATTERY' && batteryOptions.fails
            ? Promise.reject(new Error('Battery unavailable'))
            : Promise.resolve());
    (connectSmartCube as jest.Mock).mockResolvedValue({
        deviceName: 'GAN',
        events$: events,
        capabilities: {facelets: true, battery: batteryOptions.supported ?? false},
        sendCommand,
        disconnect,
    });
    const onStart = jest.fn();
    const onStop = jest.fn();
    const onCancel = jest.fn();
    const onFacelets = jest.fn();
    const onOrientation = jest.fn();
    const onScrambleCaptured = jest.fn();
    (deriveCubingScramble as jest.Mock).mockResolvedValue('R U');

    function Harness() {
        const [phase, setPhase] = useState<'idle' | 'inspection' | 'solving' | 'done'>('idle');
        const [currentScramble, setCurrentScramble] = useState(scramble);
        const [savedElapsed, setSavedElapsed] = useState(0);
        const confirmRef = useRef<() => boolean>(() => false);
        return (
            <>
                <SmartCube
                    scramble={currentScramble}
                    enabled={phase === 'idle'}
                    inspection={phase === 'inspection'}
                    solving={phase === 'solving'}
                    isComplete={isComplete}
                    expectedFacelets={expectedFacelets}
                    onInspection={promise => {
                        void promise.then(onScrambleCaptured);
                        setPhase('inspection');
                    }}
                    onStart={() => {
                        onStart();
                        setPhase('solving');
                    }}
                    onStop={elapsed => {
                        onStop(elapsed);
                        setSavedElapsed(elapsed);
                        setPhase('done');
                    }}
                    savedElapsed={savedElapsed}
                    onCancel={() => {
                        onCancel();
                        setPhase('idle');
                    }}
                    onFacelets={onFacelets}
                    onConnectionChange={() => {
                    }}
                    onOrientation={onOrientation}
                    confirmRef={confirmRef}
                    isTouchDevice
                />
                <button onClick={() => setPhase('idle')}>Anuluj</button>
                <button onClick={() => setCurrentScramble('U')}>Zmień scramble</button>
            </>
        );
    }

    const view = render(<Harness/>);
    fireEvent.click(screen.getByRole('button', {name: 'Połącz smart kostkę'}));
    expect(await screen.findByText('Oczekiwanie na stan kostki…')).toBeInTheDocument();
    const facelets = (value: string) => act(() => events.next({type: 'FACELETS', facelets: value, timestamp: 0}));
    const move = (value: string, time = 0) =>
        act(() =>
            events.next({
                type: 'MOVE',
                move: value,
                face: 0,
                direction: 0,
                localTimestamp: 0,
                cubeTimestamp: time,
                timestamp: 0,
            })
        );
    const confirm = () => fireEvent.click(screen.getByRole('button', {name: 'Scramble gotowy — rozpocznij inspekcję'}));
    return {
        events,
        sendCommand,
        disconnect,
        onStart,
        onStop,
        onCancel,
        onFacelets,
        onOrientation,
        onScrambleCaptured,
        facelets,
        move,
        confirm,
        view,
    };
}

afterEach(() => jest.useRealTimers());

test('ignoruje odczyt naklejek z niedozwoloną literą i zachowuje poprzedni stan', async () => {
    const cube = await setup();
    cube.facelets(SOLVED_CUBE);
    cube.onFacelets.mockClear();
    cube.facelets(
        SOLVED_CUBE.replace('U', 'X'));
    expect(cube.onFacelets).not.toHaveBeenCalled();
    cube.move('R');
    expect(cube.onFacelets).toHaveBeenLastCalledWith(
        applyCubeMove(SOLVED_CUBE, 'R'));
});

test('odrzuca nieobsługiwany ruch urządzenia i anuluje próbę', async () => {
    const cube = await setup();
    cube.facelets(SOLVED_CUBE);
    cube.move('R');
    cube.confirm();
    cube.move('Rw');
    expect(cube.onFacelets).toHaveBeenLastCalledWith(null);
    expect(cube.onCancel).toHaveBeenCalledTimes(1);
    expect(cube.onStop).not.toHaveBeenCalled();
});

test('kończy trening po osiągnięciu celu etapu mimo nieułożonej całej kostki', async () => {
    const cube = await setup('U R', state => state === applyCubeMove(SOLVED_CUBE, 'U'));
    cube.facelets(SOLVED_CUBE);
    cube.move('U');
    cube.move('R');
    cube.confirm();
    cube.move("R'");
    expect(cube.onStart).toHaveBeenCalledTimes(1);
    expect(cube.onStop).toHaveBeenCalledTimes(1);
    expect(cube.onFacelets).toHaveBeenLastCalledWith(applyCubeMove(SOLVED_CUBE, 'U'));
});

test('prosi o poprawny adres MAC tylko w ostateczności i przekazuje go bibliotece', async () => {
    let provided: string | null = null;
    (connectSmartCube as jest.Mock).mockImplementationOnce(async provider => {
        expect(await provider({name: 'GAN'}, false)).toBeNull();
        provided = await provider({name: 'GAN'}, true);
        return {
            deviceName: 'GAN',
            events$: new Subject(),
            capabilities: {facelets: true},
            sendCommand: jest.fn(),
            disconnect: jest.fn(),
        };
    });
    const noop = () => {
    };
    render(
        <SmartCube
            scramble=""
            enabled
            solving={false}
            inspection={false}
            onInspection={noop}
            onStart={noop}
            onStop={noop}
            onCancel={noop}
            onFacelets={noop}
            onConnectionChange={noop}
            confirmRef={{current: () => false}}
            isTouchDevice
        />
    );
    fireEvent.click(screen.getByRole('button', {name: 'Połącz smart kostkę'}));
    const input = await screen.findByLabelText('Adres MAC kostki');
    const submit = screen.getByRole('button', {name: 'Połącz'});
    fireEvent.change(input, {target: {value: 'niepoprawny'}});
    expect(submit).toBeDisabled();
    fireEvent.change(input, {target: {value: 'aa:bb:cc:dd:ee:ff'}});
    fireEvent.click(submit);
    expect(await screen.findByText('Oczekiwanie na stan kostki…')).toBeInTheDocument();
    expect(provided).toBe('AA:BB:CC:DD:EE:FF');
});

test('anulowanie wpisania adresu kończy próbę bez komunikatu o błędzie', async () => {
    (connectSmartCube as jest.Mock).mockImplementationOnce(async provider => {
        await provider({name: 'GAN'}, true);
        throw new Error('Unable to determine cube MAC address');
    });
    const noop = () => {
    };
    render(
        <SmartCube
            scramble=""
            enabled
            solving={false}
            inspection={false}
            onInspection={noop}
            onStart={noop}
            onStop={noop}
            onCancel={noop}
            onFacelets={noop}
            onConnectionChange={noop}
            confirmRef={{current: () => false}}
            isTouchDevice
        />
    );
    fireEvent.click(screen.getByRole('button', {name: 'Połącz smart kostkę'}));
    await screen.findByLabelText('Adres MAC kostki');
    fireEvent.click(screen.getByRole('button', {name: 'Anuluj'}));
    expect(await screen.findByRole('button', {name: 'Połącz smart kostkę'})).toBeEnabled();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

test('wymaga potwierdzenia, śledzi podany scramble i kończy po ułożeniu', async () => {
    const cube = await setup();
    cube.facelets(SOLVED_CUBE);
    cube.move('R');
    expect(cube.onFacelets).toHaveBeenLastCalledWith(expect.any(String));
    expect(cube.onFacelets).not.toHaveBeenLastCalledWith(SOLVED_CUBE);
    expect(screen.getByText(/Scramble: 1 \/ 2 ruchów/)).toBeInTheDocument();
    cube.move('U');
    expect(screen.getByText(/Wykonano podany scramble/)).toBeInTheDocument();
    expect(cube.onStart).not.toHaveBeenCalled();
    jest.useFakeTimers();
    cube.confirm();
    cube.move("U'", 1000);
    expect(cube.onStart).toHaveBeenCalledTimes(1);
    cube.move("R'", 2500);
    expect(
        screen.getByText(/Czas kostki.*00:01\.500.*Różnica względem zapisywanego czasu: \+00:01\.499/)
    ).toBeInTheDocument();
    expect(cube.onStop).toHaveBeenCalledWith(expect.any(Number));
    act(() => {
        jest.advanceTimersByTime(15000);
    });
    expect(cube.onStart).toHaveBeenCalledTimes(1);
    cube.view.unmount();
    expect(cube.disconnect).toHaveBeenCalled();
});

test('własny scramble można potwierdzić, a po 15 sekundach stoper startuje sam', async () => {
    const cube = await setup();
    cube.facelets(SOLVED_CUBE);
    cube.move('F');
    cube.move('R');
    expect(screen.getByText(/Własny scramble/)).toBeInTheDocument();
    jest.useFakeTimers();
    cube.confirm();
    act(() => {
        jest.advanceTimersByTime(14999);
    });
    expect(cube.onStart).not.toHaveBeenCalled();
    act(() => {
        jest.advanceTimersByTime(1);
    });
    expect(cube.onStart).toHaveBeenCalledTimes(1);
    cube.move("R'");
    cube.move("F'");
    expect(cube.onStop).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', {name: 'Pobierz surowe dane solve’a'}));
    expect(downloadSmartCubeRecording).toHaveBeenLastCalledWith(
        expect.objectContaining({
            solveStartedAt: expect.any(Number),
            events: [
                expect.objectContaining({event: expect.objectContaining({move: "R'"})}),
                expect.objectContaining({event: expect.objectContaining({move: "F'"})}),
            ],
        })
    );
});

test('anulowanie inspekcji i rozłączenie nie uruchamiają stopera', async () => {
    const cube = await setup('');
    cube.facelets(SOLVED_CUBE);
    cube.move('F');
    jest.useFakeTimers();
    cube.confirm();
    fireEvent.click(screen.getByText('Anuluj'));
    act(() => {
        jest.advanceTimersByTime(15000);
    });
    expect(cube.onStart).not.toHaveBeenCalled();
    cube.confirm();
    act(() => cube.events.next({type: 'DISCONNECT', timestamp: 0}));
    act(() => {
        jest.advanceTimersByTime(15000);
    });
    expect(cube.onCancel).toHaveBeenCalledTimes(1);
    expect(cube.onFacelets).toHaveBeenLastCalledWith(null);
    expect(screen.queryByRole('button', {name: 'Pobierz surowe dane solve’a'})).not.toBeInTheDocument();
    expect(cube.onStart).not.toHaveBeenCalled();
});

test('nie potwierdza ułożonej kostki', async () => {
    const cube = await setup();
    cube.facelets(SOLVED_CUBE);
    const button = screen.getByRole('button', {name: 'Scramble gotowy — rozpocznij inspekcję'});
    expect(button).toBeDisabled();
    cube.move('R');
    cube.move("R'");
    expect(button).toBeDisabled();
});

test('po potwierdzeniu wyznacza scramble ze stanu sprzed pierwszego ruchu układania', async () => {
    const cube = await setup();
    cube.facelets(SOLVED_CUBE);
    cube.move('F');
    const snapshot = cube.onFacelets.mock.calls.at(-1)?.[0];
    let resolve: (value: string) => void = () => {
    };
    (deriveCubingScramble as jest.Mock).mockReturnValue(
        new Promise<string>(done => {
            resolve = done;
        })
    );
    cube.confirm();
    expect(deriveCubingScramble).toHaveBeenLastCalledWith(snapshot);
    expect(screen.queryByRole('button', {name: 'Wyznacz scramble ze stanu kostki'})).not.toBeInTheDocument();
    cube.move('R');
    await act(async () => {
        resolve('F');
    });
    expect(cube.onScrambleCaptured).toHaveBeenCalledWith('F');
});

test('kalibruje orientację żyroskopu i czyści ją po rozłączeniu', async () => {
    const cube = await setup();
    const resetOrientation = screen.getByRole('button', {name: 'Resetuj położenie kostki'});
    expect(resetOrientation).toBeDisabled();
    expect(screen.getByText(/Ustaw kostkę zieloną ścianką do przodu, a białą do góry/)).toBeInTheDocument();
    act(() => cube.events.next({type: 'GYRO', quaternion: {x: 0, y: 0, z: 0, w: 1}, timestamp: 0}));
    expect(resetOrientation).toBeEnabled();
    expect(cube.onOrientation).toHaveBeenLastCalledWith({x: 0, y: 0, z: 0, w: 1});
    act(() => cube.events.next({type: 'GYRO', quaternion: {x: 0, y: 0, z: 1, w: 1}, timestamp: 1}));
    expect(cube.onOrientation.mock.lastCall[0].y).toBeCloseTo(Math.SQRT1_2);
    expect(cube.onOrientation.mock.lastCall[0].w).toBeCloseTo(Math.SQRT1_2);
    fireEvent.click(resetOrientation);
    expect(cube.onOrientation.mock.lastCall[0].y).toBeCloseTo(0);
    expect(cube.onOrientation.mock.lastCall[0].w).toBeCloseTo(1);
    act(() => cube.events.next({type: 'GYRO', quaternion: {x: 0, y: 0, z: 1, w: 1}, timestamp: 2}));
    expect(cube.onOrientation.mock.lastCall[0].y).toBeCloseTo(0);
    expect(cube.onOrientation.mock.lastCall[0].w).toBeCloseTo(1);
    act(() => cube.events.next({type: 'DISCONNECT', timestamp: 3}));
    expect(screen.queryByRole('button', {name: 'Resetuj położenie kostki'})).not.toBeInTheDocument();
    expect(cube.onOrientation).toHaveBeenLastCalledWith(null);
});

test('zachowuje surowe ruchy i próbki żyroskopu od inspekcji do ostatniego ruchu', async () => {
    const cube = await setup();
    cube.facelets(SOLVED_CUBE);
    cube.move('R');
    cube.move('U');
    const initialGyro = {type: 'GYRO' as const, quaternion: {x: 0, y: 0, z: 0, w: 1}, timestamp: 100};
    act(() => cube.events.next(initialGyro));
    cube.confirm();
    const gyro = {
        type: 'GYRO' as const,
        quaternion: {x: 0.1, y: 0.2, z: 0.3, w: 0.9},
        velocity: {x: 1, y: 2, z: 3},
        timestamp: 123,
    };
    act(() => cube.events.next(gyro));
    cube.move("U'", 1000);
    cube.move("R'", 2500);
    cube.move('R', 3000);
    fireEvent.click(screen.getByRole('button', {name: 'Pobierz surowe dane solve’a'}));
    expect(downloadSmartCubeRecording).toHaveBeenCalledWith(
        expect.objectContaining({
            initialFacelets: expect.any(String),
            initialGyro,
            solveStartedAt: expect.any(Number),
            events: [
                expect.objectContaining({event: gyro, receivedAt: expect.any(Number)}),
                expect.objectContaining({event: expect.objectContaining({move: "U'", cubeTimestamp: 1000})}),
                expect.objectContaining({event: expect.objectContaining({move: "R'", cubeTimestamp: 2500})}),
            ],
        })
    );
    fireEvent.click(screen.getByText('Anuluj'));
    expect(screen.queryByRole('button', {name: 'Pobierz surowe dane solve’a'})).not.toBeInTheDocument();
});


test('odczytuje baterię, odświeża ją i usuwa wskazanie po rozłączeniu', async () => {
    jest.useFakeTimers();
    const cube = await setup('R U', undefined, {supported: true});
    expect(cube.sendCommand).toHaveBeenCalledWith({type: 'REQUEST_BATTERY'});
    act(() => cube.events.next({type: 'BATTERY', batteryLevel: 78, timestamp: 0}));
    expect(screen.getByText('Bateria: 78%')).toBeInTheDocument();
    act(() => cube.events.next({type: 'BATTERY', batteryLevel: Number.NaN, timestamp: 0}));
    expect(screen.getByText('Bateria: 78%')).toBeInTheDocument();
    await act(async () => jest.advanceTimersByTime(60_000));
    expect(cube.sendCommand.mock.calls.filter(([command]) => command.type === 'REQUEST_BATTERY')).toHaveLength(2);
    act(() => cube.events.next({type: 'BATTERY', batteryLevel: 0, timestamp: 0}));
    expect(screen.getByText('Bateria: 0%')).toBeInTheDocument();
    act(() => cube.events.next({type: 'DISCONNECT', timestamp: 0}));
    expect(screen.queryByText(/Bateria:/)).not.toBeInTheDocument();
    await act(async () => jest.advanceTimersByTime(60_000));
    expect(cube.sendCommand.mock.calls.filter(([command]) => command.type === 'REQUEST_BATTERY')).toHaveLength(2);
});

test('brak obsługi baterii nie powoduje wysłania żądania', async () => {
    const cube = await setup();
    expect(screen.getByText('Bateria: brak odczytu')).toBeInTheDocument();
    expect(cube.sendCommand).not.toHaveBeenCalledWith({type: 'REQUEST_BATTERY'});
});

test('błąd odczytu baterii nie zrywa połączenia ze smart kostką', async () => {
    const cube = await setup('R U', undefined, {supported: true, fails: true});
    expect(await screen.findByText('Bateria: brak odczytu')).toBeInTheDocument();
    expect(cube.disconnect).not.toHaveBeenCalled();
    cube.facelets(SOLVED_CUBE);
    cube.move('R');
    expect(cube.onFacelets).toHaveBeenLastCalledWith(
        applyCubeMove(SOLVED_CUBE, 'R'));
});


test('po połączeniu przyjmuje już przygotowany poprawny stan trenażera i odrzuca inny stan', async () => {
    const expected = applyCubeMove(SOLVED_CUBE, 'L');
    const cube = await setup('L', undefined, {}, expected);
    cube.facelets(applyCubeMove(SOLVED_CUBE, 'R'));
    expect(screen.getByRole('button', {name: 'Scramble gotowy — rozpocznij inspekcję'})).toBeDisabled();
    cube.facelets(expected);
    expect(screen.getByText('Wykonano podany scramble. Potwierdź jego gotowość.')).toBeInTheDocument();
    expect(screen.queryByText('Ułóż kostkę, a następnie wykonaj scramble.')).not.toBeInTheDocument();
    expect(screen.getByRole('button', {name: 'Scramble gotowy — rozpocznij inspekcję'})).toBeEnabled();
    cube.confirm();
    cube.move("L'");
    expect(cube.onStart).toHaveBeenCalledTimes(1);
    expect(cube.onStop).toHaveBeenCalledTimes(1);
});
