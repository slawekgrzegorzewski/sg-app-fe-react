import {act, fireEvent, render, screen} from '@testing-library/react';
import {useRef, useState} from 'react';
import {Subject} from 'rxjs';
import {connectSmartCube, SmartCubeEvent} from 'smartcube-web-bluetooth';
import {SmartCube} from './SmartCube';
import {SOLVED_CUBE} from './smart-cube-state';
import {deriveCubingScramble} from './cubing-api';

jest.mock('smartcube-web-bluetooth', () => ({connectSmartCube: jest.fn()}));
jest.mock('./cubing-api', () => ({deriveCubingScramble: jest.fn()}));

async function setup(scramble = 'R U') {
    const events = new Subject<SmartCubeEvent>();
    const disconnect = jest.fn().mockResolvedValue(undefined);
    (connectSmartCube as jest.Mock).mockResolvedValue({deviceName: 'GAN', events$: events, capabilities: {facelets: true}, sendCommand: jest.fn(), disconnect});
    const onStart = jest.fn();
    const onStop = jest.fn();
    const onCancel = jest.fn();
    const onFacelets = jest.fn();
    const onScrambleCaptured = jest.fn();
    (deriveCubingScramble as jest.Mock).mockResolvedValue('R U');
    function Harness() {
        const [phase, setPhase] = useState<'idle' | 'inspection' | 'solving' | 'done'>('idle');
        const [currentScramble, setCurrentScramble] = useState(scramble);
        const confirmRef = useRef<() => boolean>(() => false);
        return <>
            <SmartCube scramble={currentScramble} enabled={phase === 'idle'} inspection={phase === 'inspection'} solving={phase === 'solving'}
                onInspection={promise => { void promise.then(onScrambleCaptured); setPhase('inspection'); }}
                onStart={() => { onStart(); setPhase('solving'); }}
                onStop={elapsed => { onStop(elapsed); setPhase('done'); }}
                onCancel={() => { onCancel(); setPhase('idle'); }} onFacelets={onFacelets}
                onConnectionChange={() => {}} confirmRef={confirmRef} isTouchDevice />
            <button onClick={() => setPhase('idle')}>Anuluj</button>
            <button onClick={() => setCurrentScramble('U')}>Zmień scramble</button>
        </>;
    }
    const view = render(<Harness />);
    fireEvent.click(screen.getByRole('button', {name: 'Połącz smart kostkę'}));
    expect(await screen.findByText('Oczekiwanie na stan kostki…')).toBeInTheDocument();
    const facelets = (value: string) => act(() => events.next({type: 'FACELETS', facelets: value, timestamp: 0}));
    const move = (value: string) => act(() => events.next({type: 'MOVE', move: value, face: 0, direction: 0, localTimestamp: 0, cubeTimestamp: 0, timestamp: 0}));
    const confirm = () => fireEvent.click(screen.getByRole('button', {name: 'Scramble gotowy — rozpocznij inspekcję'}));
    return {events, disconnect, onStart, onStop, onCancel, onFacelets, onScrambleCaptured, facelets, move, confirm, view};
}

afterEach(() => jest.useRealTimers());

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
    cube.move("U'");
    expect(cube.onStart).toHaveBeenCalledTimes(1);
    cube.move("R'");
    expect(cube.onStop).toHaveBeenCalledWith(expect.any(Number));
    act(() => { jest.advanceTimersByTime(15000); });
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
    act(() => { jest.advanceTimersByTime(14999); });
    expect(cube.onStart).not.toHaveBeenCalled();
    act(() => { jest.advanceTimersByTime(1); });
    expect(cube.onStart).toHaveBeenCalledTimes(1);
    cube.move("R'");
    cube.move("F'");
    expect(cube.onStop).toHaveBeenCalledTimes(1);
});

test('anulowanie inspekcji i rozłączenie nie uruchamiają stopera', async () => {
    const cube = await setup('');
    cube.facelets(SOLVED_CUBE);
    cube.move('F');
    jest.useFakeTimers();
    cube.confirm();
    fireEvent.click(screen.getByText('Anuluj'));
    act(() => { jest.advanceTimersByTime(15000); });
    expect(cube.onStart).not.toHaveBeenCalled();
    cube.confirm();
    act(() => cube.events.next({type: 'DISCONNECT', timestamp: 0}));
    act(() => { jest.advanceTimersByTime(15000); });
    expect(cube.onCancel).toHaveBeenCalledTimes(1);
    expect(cube.onFacelets).toHaveBeenLastCalledWith(null);
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
    let resolve: (value: string) => void = () => {};
    (deriveCubingScramble as jest.Mock).mockReturnValue(new Promise<string>(done => { resolve = done; }));
    cube.confirm();
    expect(deriveCubingScramble).toHaveBeenLastCalledWith(snapshot);
    expect(screen.queryByRole('button', {name: 'Wyznacz scramble ze stanu kostki'})).not.toBeInTheDocument();
    cube.move('R');
    await act(async () => { resolve('F'); });
    expect(cube.onScrambleCaptured).toHaveBeenCalledWith('F');
});
