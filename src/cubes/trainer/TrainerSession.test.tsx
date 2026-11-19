import {act, fireEvent, render, screen, waitFor} from '@testing-library/react';
import {useMutation} from '@apollo/client/react';
import {TrainerSession} from './TrainerSession';
import {CfopStage, CubeTrainerDevice, CubeTrainerMode} from '../../types';
import {faceletsFromCubingAlgorithm} from '../cubing-api';
import {applyCubeMove, scrambleStates, SOLVED_CUBE} from '../smart-cube-state';

jest.mock('@apollo/client/react', () => ({useMutation: jest.fn()}));
jest.mock('dayjs', () => {
    const actual = jest.requireActual('dayjs');
    return (...args: unknown[]) => args.length ? actual(...args) : actual('2026-11-16T10:45:50.503');
});
jest.mock('../cubing-api', () => ({faceletsFromCubingAlgorithm: jest.fn()}));
jest.mock('../CubingVisualizer', () => ({CubingVisualizer: () => <div/>}));
jest.mock('../cubing-scramble', () => ({generateCubingScramble: () => Promise.resolve('R')}));
let mockSmartProps: any;
let mockPreparedState = SOLVED_CUBE;
jest.mock('../SmartCube', () => ({
    SmartCube: (props: any) => {
        mockSmartProps = props;
        props.confirmRef.current = () => {
            props.onInspection();
            return true;
        };
        return <button onClick={() => {
            props.onConnectionChange(true);
            props.onFacelets(mockPreparedState);
        }}>Przygotuj smart kostkę</button>;
    }
}));

test('zapisuje ręczną próbę po dwóch spacjach bez ruchów i ponawia zapis z tym samym identyfikatorem', async () => {
    Object.defineProperty(globalThis, 'crypto', {
        configurable: true,
        value: {randomUUID: () => '00000000-0000-4000-8000-000000000001'},
    });
    const save = jest.fn().mockRejectedValueOnce(new Error('Offline')).mockResolvedValue({});
    (faceletsFromCubingAlgorithm as jest.Mock).mockResolvedValue(applyCubeMove(SOLVED_CUBE, 'R'));
    (useMutation as unknown as jest.Mock).mockReturnValue([save, {loading: false}]);
    const onSaved = jest.fn().mockResolvedValue(undefined);
    const clock = jest.spyOn(performance, 'now').mockReturnValue(1000);
    render(
        <TrainerSession
            stage={CfopStage.Pll}
            mode={CubeTrainerMode.Explore}
            algorithmPublicId="algorithm-1"
            setupAlgorithm="R"
            onSaved={onSaved}
            onBusyChange={() => {
            }}
        />
    );
    await waitFor(() => expect(screen.getByRole('button', {name: 'Start'})).toBeEnabled());
    fireEvent.keyDown(window, {code: 'Space'});
    clock.mockReturnValue(2500);
    fireEvent.keyDown(window, {code: 'Space'});
    expect(screen.getByText(/Oceń wykonanie samodzielnie/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', {name: 'Zapisz próbę'}));
    await screen.findByText(/Możesz ponowić zapis/);
    fireEvent.click(screen.getByRole('button', {name: 'Zapisz próbę'}));
    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
    const first = save.mock.calls[0][0].variables.input;
    expect(first).toMatchObject({
        durationMs: 1500,
        device: CubeTrainerDevice.Manual,
        actualAlgorithm: null,
        algorithmPublicId: 'algorithm-1',
        performedAt: '2026-11-16 10:45:50.503',
    });
    expect(save.mock.calls[1][0].variables.input).toEqual(first);
    clock.mockRestore();
});


test.each([
    [CfopStage.F2L, "R U R'", "L D L'"],
    [CfopStage.Oll, "R U R' U R U2 R'", "L D L' D L D2 L'"],
    [CfopStage.Pll, "R U R' U' R' F R2 U' R' U' R U R' F'", "L D L' D' L' F L2 D' L' D' L D L' F'"],
])('odblokowuje inspekcję %s i rozpoznaje cel z żółtą ścianką u góry', async (stage, scramble, rawScramble) => {
    const states = scrambleStates(rawScramble);
    mockPreparedState = states[states.length - 1];
    (faceletsFromCubingAlgorithm as jest.Mock).mockResolvedValue(mockPreparedState);
    const save = jest.fn().mockResolvedValue({});
    (useMutation as unknown as jest.Mock).mockReturnValue([save, {loading: false}]);
    render(<TrainerSession stage={stage as CfopStage} mode={CubeTrainerMode.Train}
                           setupAlgorithm={scramble} algorithmPublicId="algorithm-1" onSaved={jest.fn()}
                           onBusyChange={jest.fn()}/>);
    await waitFor(() => expect(faceletsFromCubingAlgorithm).toHaveBeenCalledWith(`z2 ${scramble} z2`));
    fireEvent.click(screen.getByRole('button', {name: 'Przygotuj smart kostkę'}));
    const start = await screen.findByRole('button', {name: 'Przypadek gotowy — rozpocznij inspekcję'});
    await waitFor(() => expect(start).toBeEnabled());
    expect(mockSmartProps.expectedFacelets).toBe(mockPreparedState);
    expect(mockSmartProps.isComplete(mockPreparedState)).toBe(false);
    expect(mockSmartProps.isComplete(SOLVED_CUBE)).toBe(true);
    expect(mockSmartProps.isComplete(applyCubeMove(SOLVED_CUBE, 'D'))).toBe(stage !== CfopStage.Pll);
    expect(mockSmartProps.isComplete(applyCubeMove(SOLVED_CUBE, 'U'))).toBe(false);
    fireEvent.click(start);
    expect(await screen.findByText('Inspekcja')).toBeInTheDocument();
    const solution = rawScramble.split(' ').reverse().map(move =>
        move.endsWith('2') ? move : move.endsWith("'") ? move.slice(0, -1) : `${move}'`);
    await act(() => mockSmartProps.onStop(15886, {
        version: 1,
        initialFacelets: mockPreparedState,
        initialGyro: null,
        timeOrigin: 0,
        inspectionStartedAt: 100,
        solveStartedAt: 200,
        events: solution.map((move, index) => ({
            receivedAt: 200 + index * 10,
            event: {type: 'MOVE', move, timestamp: index * 10, serial: index},
        })),
    }));
    expect(await screen.findByText('Cel ćwiczenia osiągnięty.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', {name: 'Zapisz próbę'}));
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    expect(save.mock.calls[0][0].variables.input).toMatchObject({
        stage,
        device: CubeTrainerDevice.Smart,
        crossFace: 'U',
        actualAlgorithm: solution.join(' '),
        durationMs: 15886,
        performedAt: '2026-11-16 10:45:50.503',
    });
});

const mockRecording = {
    version: 1,
    initialFacelets: applyCubeMove(SOLVED_CUBE, 'R'),
    initialGyro: null,
    timeOrigin: 100,
    inspectionStartedAt: 1000,
    solveStartedAt: 2000,
    events: [{receivedAt: 2000, event: {type: 'MOVE', move: "R'", timestamp: 2000, serial: 1}}],
};

test('automatycznie zapisuje CROSS z pełnym nagraniem bez ponownego zapisu', async () => {
    Object.defineProperty(globalThis, 'crypto', {
        configurable: true,
        value: {randomUUID: () => '00000000-0000-4000-8000-000000000002'},
    });
    const save = jest.fn().mockResolvedValue({});
    (useMutation as unknown as jest.Mock).mockReturnValue([save, {loading: false}]);
    (faceletsFromCubingAlgorithm as jest.Mock).mockResolvedValue(applyCubeMove(SOLVED_CUBE, 'R'));
    const onSaved = jest.fn().mockResolvedValue(undefined);
    render(<TrainerSession stage={CfopStage.Cross} mode={CubeTrainerMode.Train}
                           onSaved={onSaved} onBusyChange={() => {
    }}/>);
    await screen.findByText('R');
    await act(async () => {
        mockSmartProps.onStop(1500, mockRecording);
    });
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    expect(save).toHaveBeenCalledTimes(1);
    const input = save.mock.calls[0][0].variables.input;
    expect(JSON.parse(input.recording)).toEqual(mockRecording);
    expect(input.actualAlgorithm).toBe("R'");
    expect(input.stage).toBe(CfopStage.Cross);
    expect(screen.getByRole('button', {name: 'Kolejna próba'})).toBeInTheDocument();
    expect(screen.queryByRole('button', {name: 'Zapisz próbę'})).not.toBeInTheDocument();
});


test('spacja podczas czytania dialogu nie uruchamia stopera', async () => {
    (faceletsFromCubingAlgorithm as jest.Mock).mockResolvedValue(applyCubeMove(SOLVED_CUBE, 'R'));
    (useMutation as unknown as jest.Mock).mockReturnValue([jest.fn(), {loading: false}]);
    const onBusyChange = jest.fn();
    render(<>
        <TrainerSession stage={CfopStage.Cross} mode={CubeTrainerMode.Train} onSaved={jest.fn()} onBusyChange={onBusyChange}/>
        <div role="dialog" tabIndex={-1}>Ocena próby</div>
    </>);
    await waitFor(() => expect(screen.getByRole('button', {name: 'Start'})).toBeEnabled());
    onBusyChange.mockClear();
    fireEvent.keyDown(screen.getByRole('dialog'), {code: 'Space'});
    expect(screen.getByRole('button', {name: 'Start'})).toBeEnabled();
    expect(onBusyChange).not.toHaveBeenCalled();
});
