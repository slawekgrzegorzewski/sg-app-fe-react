import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import {useMutation} from '@apollo/client/react';
import {TrainerSession} from './TrainerSession';
import {CfopStage, CubeTrainerDevice, CubeTrainerMode} from '../../types';
import {faceletsFromCubingAlgorithm} from '../cubing-api';
import {applyCubeMove, SOLVED_CUBE} from '../smart-cube-state';

jest.mock('@apollo/client/react', () => ({useMutation: jest.fn()}));
jest.mock('../cubing-api', () => ({faceletsFromCubingAlgorithm: jest.fn()}));
jest.mock('../CubingVisualizer', () => ({CubingVisualizer: () => <div />}));
jest.mock('../SmartCube', () => ({SmartCube: () => <div />}));

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
