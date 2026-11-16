import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import {useMutation} from '@apollo/client/react';
import {TrainerSession} from './TrainerSession';
import {CfopStage, CubeTrainerDevice, CubeTrainerMode} from '../../types';
import {faceletsFromCubingAlgorithm} from '../cubing-api';
import {applyCubeMove, scrambleStates, SOLVED_CUBE} from '../smart-cube-state';

jest.mock('@apollo/client/react', () => ({useMutation: jest.fn()}));
jest.mock('../cubing-api', () => ({faceletsFromCubingAlgorithm: jest.fn()}));
jest.mock('../CubingVisualizer', () => ({CubingVisualizer: () => <div />}));
let mockSmartProps: any;
let mockPreparedState = SOLVED_CUBE;
jest.mock('../SmartCube', () => ({SmartCube: (props: any) => {
    mockSmartProps = props;
    props.confirmRef.current = () => {
        props.onInspection();
        return true;
    };
    return <button onClick={() => {
        props.onConnectionChange(true);
        props.onFacelets(mockPreparedState);
    }}>Przygotuj smart kostkę</button>;
}}));

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
            onBusyChange={() => {}}
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
    });
    expect(save.mock.calls[1][0].variables.input.publicId).toBe(first.publicId);
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
    (useMutation as unknown as jest.Mock).mockReturnValue([jest.fn(), {loading: false}]);
    render(<TrainerSession stage={stage as CfopStage} mode={CubeTrainerMode.Train}
        setupAlgorithm={scramble} algorithmPublicId="algorithm-1" onSaved={jest.fn()}
        onBusyChange={jest.fn()} />);
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
});
