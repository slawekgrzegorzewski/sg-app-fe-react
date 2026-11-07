import {act, render, screen, waitFor} from '@testing-library/react';
import {CubeType} from '../types';
import {createCubingFaceletTransformation, createCubingTwistyPlayer} from './cubing-api';
import {CubingVisualizer} from './CubingVisualizer';
import {applyCubeMove, SOLVED_CUBE} from './smart-cube-state';

jest.mock('./cubing-api', () => ({
    createCubingTwistyPlayer: jest.fn(),
    createCubingFaceletTransformation: jest.fn(),
}));

const createCubingTwistyPlayerMock = createCubingTwistyPlayer as jest.Mock;
const createTransformationMock = createCubingFaceletTransformation as jest.Mock;

function createPlayer() {
    return Object.assign(document.createElement('div'), {
        experimentalModel: {setupTransformation: {set: jest.fn()}},
        pause: jest.fn(), play: jest.fn(), jumpToStart: jest.fn(), jumpToEnd: jest.fn(),
    });
}

describe('CubingVisualizer', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        createTransformationMock.mockReset();
        createCubingTwistyPlayerMock.mockResolvedValue(createPlayer());
    });

    it('shows the scramble, keeps view rotation and disables move input', async () => {
        const {rerender} = render(<CubingVisualizer cubeType={CubeType.Megaminx} scramble="R++ D--" />);

        expect(createCubingTwistyPlayerMock).toHaveBeenLastCalledWith({
            puzzle: 'megaminx',
            experimentalSetupAlg: 'R++ D--',
            background: 'none',
            controlPanel: 'none',
            hintFacelets: 'none',
            experimentalDragInput: 'auto',
            experimentalMovePressInput: 'none',
        });
        expect(await screen.findByLabelText('Interaktywna wizualizacja: Megaminx')).toBeInTheDocument();

        createCubingTwistyPlayerMock.mockResolvedValue(createPlayer());

        rerender(<CubingVisualizer cubeType={CubeType.Skewb} scramble="R B'" />);

        expect(createCubingTwistyPlayerMock).toHaveBeenLastCalledWith(
            expect.objectContaining({puzzle: 'skewb', experimentalSetupAlg: "R B'"})
        );
        expect(await screen.findByLabelText('Interaktywna wizualizacja: Skewb')).toBeInTheDocument();
    });

    it('shows an error when the visualizer cannot be loaded', async () => {
        createCubingTwistyPlayerMock.mockRejectedValue(new Error('Network error'));

        render(<CubingVisualizer cubeType={CubeType.Three} scramble="R U" />);

        expect(await screen.findByText('Nie udało się załadować wizualizacji.')).toBeInTheDocument();
    });

    it('updates the existing player with the live state and restores the scramble after disconnect', async () => {
        const player = createPlayer();
        createCubingTwistyPlayerMock.mockResolvedValue(player);
        const transformation = {state: 'R'};
        createTransformationMock.mockResolvedValue(transformation);
        const {rerender} = render(<CubingVisualizer cubeType={CubeType.Three} scramble="U" />);
        await waitFor(() => expect(player.experimentalModel.setupTransformation.set).toHaveBeenCalledWith(null));
        rerender(<CubingVisualizer cubeType={CubeType.Three} scramble="U" facelets="stan" />);
        await waitFor(() => expect(player.experimentalModel.setupTransformation.set).toHaveBeenLastCalledWith(transformation));
        expect(createTransformationMock).toHaveBeenCalledWith('stan');
        rerender(<CubingVisualizer cubeType={CubeType.Three} scramble="U" />);
        expect(player.experimentalModel.setupTransformation.set).toHaveBeenLastCalledWith(null);
        expect(createCubingTwistyPlayerMock).toHaveBeenCalledTimes(1);
    });

    it('ignores an older asynchronous state after a newer state has arrived', async () => {
        const player = createPlayer();
        createCubingTwistyPlayerMock.mockResolvedValue(player);
        let resolveOld: (value: object) => void = () => {};
        createTransformationMock.mockImplementation((value: string) => value === 'old'
            ? new Promise(resolve => { resolveOld = resolve; })
            : Promise.resolve({state: value}));
        const {rerender} = render(<CubingVisualizer cubeType={CubeType.Three} scramble="" facelets="old" />);
        await waitFor(() => expect(createTransformationMock).toHaveBeenCalledWith('old'));
        rerender(<CubingVisualizer cubeType={CubeType.Three} scramble="" facelets="new" />);
        await waitFor(() => expect(player.experimentalModel.setupTransformation.set).toHaveBeenLastCalledWith({state: 'new'}));
        resolveOld({state: 'old'});
        await Promise.resolve();
        expect(player.experimentalModel.setupTransformation.set).toHaveBeenLastCalledWith({state: 'new'});
    });

    it('animates a single turn from the previous state and resynchronizes after a discontinuity', async () => {
        const player = createPlayer();
        createCubingTwistyPlayerMock.mockResolvedValue(player);
        createTransformationMock.mockImplementation((state: string) => Promise.resolve({state}));
        const first = applyCubeMove(SOLVED_CUBE, 'R');
        const later = applyCubeMove(applyCubeMove(first, 'F'), 'U');
        const {rerender} = render(<CubingVisualizer cubeType={CubeType.Three} scramble="" facelets={SOLVED_CUBE} />);
        await waitFor(() => expect(player.experimentalModel.setupTransformation.set).toHaveBeenLastCalledWith({state: SOLVED_CUBE}));
        expect(player.play).not.toHaveBeenCalled();
        rerender(<CubingVisualizer cubeType={CubeType.Three} scramble="" facelets={first} />);
        await waitFor(() => expect(player.play).toHaveBeenCalledTimes(1));
        expect(player.experimentalModel.setupTransformation.set).toHaveBeenLastCalledWith({state: SOLVED_CUBE});
        expect(player).toHaveProperty('alg', 'R');
        expect(player.jumpToStart).toHaveBeenCalled();
        rerender(<CubingVisualizer cubeType={CubeType.Three} scramble="" facelets={later} />);
        await waitFor(() => expect(player.experimentalModel.setupTransformation.set).toHaveBeenLastCalledWith({state: later}));
        expect(player.play).toHaveBeenCalledTimes(1);
        expect(player.jumpToEnd).toHaveBeenCalled();
        rerender(<CubingVisualizer cubeType={CubeType.Three} scramble="U" />);
        expect(player.experimentalModel.setupTransformation.set).toHaveBeenLastCalledWith(null);
        expect(player.pause).toHaveBeenCalled();
    });
    it('applies gyro orientation to the scene and clears it when unavailable', async () => {
        const set = jest.fn();
        const scheduleRender = jest.fn();
        const player = Object.assign(createPlayer(), {
            experimentalCurrentVantages: jest.fn().mockResolvedValue([{scene: {scene: async () => ({quaternion: {set}})}, scheduleRender}]),
        });
        createCubingTwistyPlayerMock.mockResolvedValue(player);
        const orientation = {current: {x: 0, y: 0.5, z: 0, w: 0.866}};
        const {rerender} = render(<CubingVisualizer cubeType={CubeType.Three} scramble="" orientation={orientation} />);
        await waitFor(() => expect(set).toHaveBeenCalledWith(0, 0.5, 0, 0.866));
        orientation.current = {x: 0.5, y: 0, z: 0, w: 0.866};
        await act(async () => { await new Promise(resolve => setTimeout(resolve, 30)); });
        expect(set).toHaveBeenCalledWith(0.5, 0, 0, 0.866);
        rerender(<CubingVisualizer cubeType={CubeType.Three} scramble="" />);
        expect(set).toHaveBeenLastCalledWith(0, 0, 0, 1);
        expect(scheduleRender).toHaveBeenCalled();
    });

    it('ustawia kamerę przy kalibracji i przy późniejszym otwarciu widoku', async () => {
        const player = createPlayer();
        createCubingTwistyPlayerMock.mockResolvedValue(player);
        const orientation = {current: {x: 0, y: 0, z: 0, w: 1}};
        const {rerender, unmount} = render(<CubingVisualizer cubeType={CubeType.Three} scramble="" orientation={orientation} />);
        await waitFor(() => expect(player.isConnected).toBe(true));
        rerender(<CubingVisualizer cubeType={CubeType.Three} scramble="" orientation={orientation} orientationResetVersion={1} />);
        await waitFor(() => expect(player).toHaveProperty('cameraLatitude', 0));
        expect(player).toHaveProperty('cameraLongitude', 10);
        Object.assign(player, {cameraLatitude: 25, cameraLongitude: 30});
        rerender(<CubingVisualizer cubeType={CubeType.Three} scramble="" orientation={orientation} orientationResetVersion={2} />);
        expect(player).toHaveProperty('cameraLatitude', 0);
        expect(player).toHaveProperty('cameraLongitude', 10);
        unmount();
        const nextPlayer = createPlayer();
        createCubingTwistyPlayerMock.mockResolvedValue(nextPlayer);
        render(<CubingVisualizer cubeType={CubeType.Three} scramble="" orientation={orientation} orientationResetVersion={2} />);
        await waitFor(() => expect(nextPlayer).toHaveProperty('cameraLatitude', 0));
        expect(nextPlayer).toHaveProperty('cameraLongitude', 10);
    });

});
