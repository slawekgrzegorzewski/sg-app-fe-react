import {render, screen, waitFor} from '@testing-library/react';
import {CubeType} from '../types';
import {createCubingTwistyPlayer} from './cubing-api';
import {CubingVisualizer} from './CubingVisualizer';

jest.mock('./cubing-api', () => ({
    createCubingTwistyPlayer: jest.fn(),
}));

const createCubingTwistyPlayerMock = createCubingTwistyPlayer as jest.Mock;

describe('CubingVisualizer', () => {
    beforeEach(() => {
        createCubingTwistyPlayerMock.mockResolvedValue(document.createElement('div'));
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
        await waitFor(() =>
            expect(screen.getByRole('region', {name: 'Wizualizacja układanki'}).firstElementChild).toHaveAttribute(
                'aria-label',
                'Interaktywna wizualizacja: Megaminx'
            )
        );

        createCubingTwistyPlayerMock.mockResolvedValue(document.createElement('div'));

        rerender(<CubingVisualizer cubeType={CubeType.Skewb} scramble="R B'" />);

        expect(createCubingTwistyPlayerMock).toHaveBeenLastCalledWith(
            expect.objectContaining({puzzle: 'skewb', experimentalSetupAlg: "R B'"})
        );
    });

    it('shows an error when the visualizer cannot be loaded', async () => {
        createCubingTwistyPlayerMock.mockRejectedValue(new Error('Network error'));

        render(<CubingVisualizer cubeType={CubeType.Three} scramble="R U" />);

        expect(await screen.findByText('Nie udało się załadować wizualizacji.')).toBeInTheDocument();
    });
});
