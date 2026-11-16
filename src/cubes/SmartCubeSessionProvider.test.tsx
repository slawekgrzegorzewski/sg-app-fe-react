import {act, fireEvent, render, screen, waitFor} from '@testing-library/react';
import {StrictMode, useRef, useState} from 'react';
import {MemoryRouter, Link, Outlet, Route, Routes} from 'react-router';
import {Subject} from 'rxjs';
import {connectSmartCube} from 'smartcube-web-bluetooth';
import type {SmartCubeEvent} from 'smartcube-web-bluetooth';
import {SmartCubeSessionProvider} from './SmartCubeSessionProvider';
import {SmartCube} from './SmartCube';
import {applyCubeMove, SOLVED_CUBE} from './smart-cube-state';

jest.mock('react-router', () => {
    Object.defineProperty(globalThis, 'TextEncoder', {value: jest.requireActual('util').TextEncoder});
    return jest.requireActual('react-router');
});
jest.mock('smartcube-web-bluetooth', () => ({connectSmartCube: jest.fn()}));
jest.mock('./cubing-api', () => ({deriveCubingScramble: () => Promise.resolve('R')}));

const onStart = jest.fn();

function Screen({name}: {name: string}) {
    const [state, setState] = useState('');
    const [phase, setPhase] = useState('idle');
    const confirm = useRef(() => false);
    return <>
        <div>{name}: {phase}</div><output data-testid="state">{state}</output>
        <button onClick={() => confirm.current()}>Rozpocznij inspekcję</button>
        <SmartCube scramble="R" enabled={phase === 'idle'} inspection={phase === 'inspection'}
            solving={false} onInspection={() => setPhase('inspection')} onStart={onStart}
            onStop={jest.fn()} onCancel={() => setPhase('idle')} onFacelets={value => setState(value ?? '')}
            onConnectionChange={jest.fn()} confirmRef={confirm} isTouchDevice={false} />
    </>;
}

function Harness() {
    return <MemoryRouter initialEntries={['/cubes']}>
        <Routes>
            <Route element={<SmartCubeSessionProvider>
                <nav>{['cubes', 'cross', 'f2l', 'oll', 'pll', 'stats'].map(page =>
                    <Link key={page} to={`/${page}`}>{page}</Link>)}</nav>
                <Outlet />
            </SmartCubeSessionProvider>}>
                {['cubes', 'cross', 'f2l', 'oll', 'pll'].map(page =>
                    <Route key={page} path={`/${page}`} element={<Screen key={page} name={page} />} />)}
                <Route path="/stats" element={<div>Statystyki</div>} />
            </Route>
        </Routes>
    </MemoryRouter>;
}

test('zachowuje Bluetooth i stan między stronami oraz etapami, ale nie przenosi inspekcji', async () => {
    jest.useFakeTimers();
    const events = new Subject<SmartCubeEvent>();
    const disconnect = jest.fn().mockResolvedValue(undefined);
    (connectSmartCube as jest.Mock).mockResolvedValue({
        deviceName: 'GAN', events$: events, capabilities: {facelets: true, battery: true},
        sendCommand: jest.fn().mockResolvedValue(undefined), disconnect,
    });
    const view = render(<StrictMode><Harness /></StrictMode>);
    fireEvent.click(screen.getByRole('button', {name: 'Połącz smart kostkę'}));
    await screen.findByRole('button', {name: 'Rozłącz GAN'});
    const mixed = applyCubeMove(SOLVED_CUBE, 'R');
    act(() => {
        events.next({type: 'FACELETS', facelets: mixed, timestamp: 1});
        events.next({type: 'BATTERY', batteryLevel: 73, timestamp: 2});
    });
    fireEvent.click(screen.getByRole('button', {name: 'Rozpocznij inspekcję'}));
    await screen.findByText('cubes: inspection');
    for (const page of ['cross', 'f2l', 'oll', 'pll', 'cubes']) {
        fireEvent.click(screen.getByRole('link', {name: page}));
        await screen.findByRole('button', {name: 'Rozłącz GAN'});
        await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent(mixed));
        expect(screen.getByText(`${page}: idle`)).toBeInTheDocument();
        expect(screen.getByText('Bateria: 73%')).toBeInTheDocument();
    }
    expect(connectSmartCube).toHaveBeenCalledTimes(1);
    expect(disconnect).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('link', {name: 'stats'}));
    act(() => events.next({type: 'MOVE', move: 'U', timestamp: 3, face: 0, direction: 1,
        localTimestamp: 3, cubeTimestamp: 3}));
    fireEvent.click(screen.getByRole('link', {name: 'cubes'}));
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent(applyCubeMove(mixed, 'U')));
    await act(async () => jest.advanceTimersByTime(16000));
    expect(onStart).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', {name: 'Rozłącz GAN'}));
    await screen.findByRole('button', {name: 'Połącz smart kostkę'});
    expect(disconnect).toHaveBeenCalledTimes(1);
    view.unmount();
    jest.useRealTimers();
});
