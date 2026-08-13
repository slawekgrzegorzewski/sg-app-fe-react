import {useMutation, useQuery} from '@apollo/client/react';
import {fireEvent, render, screen, waitFor, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {validateCubingScramble} from './cubing-api';
import {generateCubingScramble} from './cubing-scramble';
import {CubesMainPage} from './CubesMainPage';
import {useIsTouchDevice} from '../utils/use-is-touch-screen';

jest.mock('@apollo/client/react', () => ({
    useMutation: jest.fn(),
    useQuery: jest.fn(),
}));

jest.mock('./cubing-scramble', () => ({
    generateCubingScramble: jest.fn(),
}));

jest.mock('./cubing-api', () => ({
    validateCubingScramble: jest.fn(),
}));

jest.mock('./CubingVisualizer', () => ({
    CubingVisualizer: ({cubeType, scramble}: {cubeType: string; scramble: string}) => {
        const React = require('react');
        return React.createElement('div', {'data-testid': 'cubing-visualizer', 'data-cube-type': cubeType}, scramble);
    },
}));

jest.mock('../utils/use-wake-lock', () => ({
    useWakeLock: () => [false, jest.fn(), jest.fn()],
}));

jest.mock('../utils/use-is-touch-screen', () => ({
    useIsTouchDevice: jest.fn(),
}));

jest.mock('./StopWatch', () => {
    const React = require('react');
    return {
        StopWatch: ({startTrigger, stopTrigger, resetTrigger, inspectionMode, sx}: any) => {
            React.useEffect(() => {
                if (startTrigger) {
                    startTrigger.current = jest.fn();
                }
                if (stopTrigger) {
                    stopTrigger.current = () => 4_321;
                }
                if (resetTrigger) {
                    resetTrigger.current = jest.fn();
                }
            });
            return (
                <div
                    role="timer"
                    data-testid="stopwatch"
                    data-inspection-mode={inspectionMode}
                    data-color={sx?.color}
                />
            );
        },
    };
});

const useQueryMock = useQuery as unknown as jest.Mock;
const useMutationMock = useMutation as unknown as jest.Mock;
const generateCubingScrambleMock = generateCubingScramble as jest.Mock;
const validateCubingScrambleMock = validateCubingScramble as jest.Mock;
const useIsTouchDeviceMock = useIsTouchDevice as jest.Mock;

describe('CubesMainPage', () => {
    const storeCubeResult = jest.fn().mockResolvedValue(undefined);
    const refetch = jest.fn().mockResolvedValue(undefined);
    const scrollIntoView = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
            configurable: true,
            value: scrollIntoView,
        });
        storeCubeResult.mockResolvedValue(undefined);
        refetch.mockResolvedValue(undefined);
        useQueryMock.mockReturnValue({
            data: {
                cubeResults: {
                    numberOfSolves: 10,
                    todayAverageInMillis: 12_000,
                    recentResults: [
                        {timeInMillis: 9_876, date: '2026-08-13T12:20:00'},
                        {timeInMillis: 8_765, date: '2026-08-13T12:30:00'},
                    ],
                },
            },
            refetch,
        });
        useMutationMock.mockReturnValue([storeCubeResult]);
        generateCubingScrambleMock.mockResolvedValue("R U R'");
        validateCubingScrambleMock.mockResolvedValue(undefined);
        useIsTouchDeviceMock.mockReturnValue(false);
    });

    it('loads results and a visualizer for the selected cube type', async () => {
        const user = userEvent.setup();
        render(<CubesMainPage />);

        expect(screen.getByRole('heading', {name: 'Układanie kostek'})).toBeInTheDocument();
        expect(
            within(screen.getByRole('group', {name: 'Liczba ułożeń'})).getByRole('heading', {name: '10'})
        ).toBeVisible();
        expect(
            within(screen.getByRole('group', {name: 'Dzisiejsza średnia'})).getByRole('heading', {name: '12 s'})
        ).toBeVisible();
        expect(useQueryMock.mock.calls.at(-1)[1].variables).toEqual({cubeType: 'THREE'});
        expect(screen.getByTestId('cubing-visualizer')).toHaveAttribute('data-cube-type', 'THREE');
        const recentResultsTable = screen.getByRole('table', {name: 'Ostatnie wyniki kostki'});
        expect(within(recentResultsTable).getAllByRole('row')).toHaveLength(3);
        expect(within(recentResultsTable).getByText('00:08.765')).toBeInTheDocument();
        expect(within(recentResultsTable).getByText('00:09.876')).toBeInTheDocument();
        expect(within(recentResultsTable).getAllByRole('row')[1]).toHaveTextContent('00:08.765');

        await user.click(screen.getByRole('combobox', {name: 'Rodzaj kostki'}));
        await user.click(screen.getByRole('option', {name: '4×4'}));

        await waitFor(() => expect(useQueryMock.mock.calls.at(-1)[1].variables).toEqual({cubeType: 'FOUR'}));
        expect(screen.getByTestId('cubing-visualizer')).toHaveAttribute('data-cube-type', 'FOUR');

        await user.click(screen.getByRole('combobox', {name: 'Rodzaj kostki'}));
        await user.click(screen.getByRole('option', {name: 'Megaminx'}));

        await waitFor(() => expect(useQueryMock.mock.calls.at(-1)[1].variables).toEqual({cubeType: 'MEGAMINX'}));
        expect(screen.getByTestId('cubing-visualizer')).toHaveAttribute('data-cube-type', 'MEGAMINX');
        expect(screen.getByRole('button', {name: 'Scramble'})).toBeEnabled();
    });

    it('shows a friendly empty state when there are no recent results', () => {
        useQueryMock.mockReturnValue({
            data: {
                cubeResults: {numberOfSolves: 0, todayAverageInMillis: 0, recentResults: []},
            },
            refetch,
        });

        render(<CubesMainPage />);

        expect(screen.getByText('Brak zapisanych wyników.')).toBeInTheDocument();
        expect(screen.queryByRole('table', {name: 'Ostatnie wyniki kostki'})).not.toBeInTheDocument();
    });

    it('shows all results and paginates five rows at a time', async () => {
        const user = userEvent.setup();
        useQueryMock.mockReturnValue({
            data: {
                cubeResults: {
                    numberOfSolves: 21,
                    todayAverageInMillis: 1_000,
                    recentResults: Array.from({length: 21}, (_, index) => ({
                        timeInMillis: index + 1,
                        date: `2026-08-${String(index + 1).padStart(2, '0')}T12:00:00`,
                    })),
                },
            },
            refetch,
        });

        render(<CubesMainPage />);

        const recentResultsTable = screen.getByRole('table', {name: 'Ostatnie wyniki kostki'});
        expect(within(recentResultsTable).getAllByRole('row')).toHaveLength(6);
        expect(screen.getByText('1–5 z 21')).toBeInTheDocument();

        await user.click(screen.getByRole('button', {name: 'Następna strona'}));

        expect(within(recentResultsTable).getAllByRole('row')).toHaveLength(6);
        expect(screen.getByText('6–10 z 21')).toBeInTheDocument();
        expect(within(recentResultsTable).getByText('00:00.016')).toBeInTheDocument();
    });

    it('generates a cubing.js scramble for newly supported puzzle types', async () => {
        const user = userEvent.setup();
        generateCubingScrambleMock.mockResolvedValue('(1, 0) / (-3, 2)');
        render(<CubesMainPage />);

        await user.click(screen.getByRole('combobox', {name: 'Rodzaj kostki'}));
        await user.click(screen.getByRole('option', {name: 'Square-1'}));
        await user.click(screen.getByRole('button', {name: 'Scramble'}));

        await waitFor(() => expect(generateCubingScrambleMock).toHaveBeenCalledWith('SQUARE_1'));
        expect(await screen.findByRole('textbox', {name: 'Scramble'})).toHaveValue('(1, 0) / (-3, 2)');
        expect(screen.getByTestId('cubing-visualizer')).toHaveAttribute('data-cube-type', 'SQUARE_1');
        await waitFor(() => expect(screen.getByTestId('cubing-visualizer')).toHaveTextContent('(1, 0) / (-3, 2)'));
    });

    it('allows editing the scramble without triggering keyboard shortcuts', async () => {
        const user = userEvent.setup();
        render(<CubesMainPage />);

        const scrambleField = screen.getByRole('textbox', {name: 'Scramble'});
        await user.type(scrambleField, 'S R U');

        expect(scrambleField).toHaveValue('S R U');
        await waitFor(() => expect(screen.getByTestId('cubing-visualizer')).toHaveTextContent('S R U'));
        expect(validateCubingScrambleMock).toHaveBeenLastCalledWith('3x3x3', 'S R U');
        expect(screen.getByText('Scramble jest poprawny.')).toBeInTheDocument();
        expect(generateCubingScrambleMock).not.toHaveBeenCalled();
        expect(screen.getByText('IDLE')).toBeInTheDocument();
    });

    it('marks an invalid scramble and keeps the last valid visualization', async () => {
        const user = userEvent.setup();
        validateCubingScrambleMock.mockImplementation((_puzzleId, value) =>
            value.includes('X') ? Promise.reject(new Error('Invalid move: X')) : Promise.resolve()
        );
        render(<CubesMainPage />);

        const scrambleField = screen.getByRole('textbox', {name: 'Scramble'});
        await user.type(scrambleField, 'R U');
        await waitFor(() => expect(screen.getByTestId('cubing-visualizer')).toHaveTextContent('R U'));

        await user.type(scrambleField, ' X');

        expect(await screen.findByText('Niepoprawny scramble: Invalid move: X')).toBeInTheDocument();
        expect(scrambleField).toHaveAttribute('aria-invalid', 'true');
        expect(screen.getByTestId('cubing-visualizer')).toHaveTextContent('R U');
        expect(screen.getByTestId('cubing-visualizer')).not.toHaveTextContent('X');
    });

    it('records a solve with the selected cube type', async () => {
        const user = userEvent.setup();
        render(<CubesMainPage />);

        await user.click(screen.getByRole('combobox', {name: 'Rodzaj kostki'}));
        await user.click(screen.getByRole('option', {name: '4×4'}));

        fireEvent.keyDown(document, {code: 'Space'});
        await screen.findByText('INSPECTION_EARLY');
        expect(screen.getByTestId('stopwatch')).toHaveAttribute('data-inspection-mode', 'countdown');
        expect(screen.getByTestId('stopwatch')).toHaveAttribute('data-color', 'success.main');
        fireEvent.keyUp(document, {code: 'Space'});
        await screen.findByText('SOLVING');
        expect(screen.getByTestId('stopwatch')).not.toHaveAttribute('data-inspection-mode');
        expect(screen.getByTestId('stopwatch')).toHaveAttribute('data-color', 'text.primary');
        fireEvent.keyDown(document, {code: 'Space'});
        await screen.findByText('IDLE');

        expect(screen.getByRole('combobox', {name: 'Rodzaj kostki'})).toHaveAttribute('aria-disabled', 'true');

        fireEvent.keyDown(document, {code: 'Enter'});

        await waitFor(() =>
            expect(storeCubeResult).toHaveBeenCalledWith({
                variables: expect.objectContaining({
                    cubeType: 'FOUR',
                    timeInMillis: 4_321,
                }),
            })
        );
    });

    it('shows a touch target that starts the stopwatch on mobile', async () => {
        useIsTouchDeviceMock.mockReturnValue(true);

        render(<CubesMainPage />);

        const touchTarget = screen.getByRole('button', {name: 'Dotknij i przytrzymaj, aby rozpocząć'});
        expect(touchTarget).toBeVisible();

        fireEvent.touchStart(touchTarget);
        expect(await screen.findByText('INSPECTION_EARLY')).toBeInTheDocument();
        const inspectionTarget = screen.getByRole('button', {name: 'Puść, aby uruchomić stoper'});
        expect(within(inspectionTarget).getByTestId('stopwatch')).toHaveAttribute('data-inspection-mode', 'countdown');
        expect(within(inspectionTarget).getByTestId('stopwatch')).toHaveAttribute('data-color', 'success.main');

        fireEvent.touchEnd(inspectionTarget);
        expect(await screen.findByText('SOLVING')).toBeInTheDocument();

        fireEvent.touchStart(screen.getByRole('dialog'));
        expect(await screen.findByText('IDLE')).toBeInTheDocument();

        const saveButton = await screen.findByRole('button', {name: 'Zapisz wynik'});
        const discardButton = await screen.findByRole('button', {name: 'Odrzuć wynik'});
        expect(saveButton).toHaveClass('MuiButton-colorSuccess');
        expect(discardButton).toHaveClass('MuiButton-colorError');
        expect(saveButton).toHaveStyle({minHeight: '144px'});
        expect(discardButton).toHaveStyle({minHeight: '144px'});
        await waitFor(() =>
            expect(scrollIntoView).toHaveBeenCalledWith({
                behavior: 'smooth',
                block: 'end',
            })
        );
    });
});
