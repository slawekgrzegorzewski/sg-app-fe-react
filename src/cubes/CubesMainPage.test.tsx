import {useMutation, useQuery} from '@apollo/client/react';
import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {newCube} from './visualizer';
import {CubesMainPage} from './CubesMainPage';

jest.mock('@apollo/client/react', () => ({
    useMutation: jest.fn(),
    useQuery: jest.fn(),
}));

jest.mock('./visualizer', () => ({
    newCube: jest.fn(),
}));

jest.mock('../utils/use-wake-lock', () => ({
    useWakeLock: () => [false, jest.fn(), jest.fn()],
}));

jest.mock('../utils/use-is-touch-screen', () => ({
    useIsTouchDevice: () => false,
}));

jest.mock('./StopWatch', () => {
    const React = require('react');
    return {
        StopWatch: ({startTrigger, stopTrigger, resetTrigger}: any) => {
            React.useEffect(() => {
                startTrigger.current = jest.fn();
                stopTrigger.current = () => 4_321;
                resetTrigger.current = jest.fn();
            });
            return <div data-testid="stopwatch" />;
        },
    };
});

const useQueryMock = useQuery as unknown as jest.Mock;
const useMutationMock = useMutation as unknown as jest.Mock;
const newCubeMock = newCube as unknown as jest.Mock;

describe('CubesMainPage', () => {
    const storeCubeResult = jest.fn().mockResolvedValue(undefined);
    const refetch = jest.fn().mockResolvedValue(undefined);

    beforeEach(() => {
        jest.clearAllMocks();
        storeCubeResult.mockResolvedValue(undefined);
        refetch.mockResolvedValue(undefined);
        useQueryMock.mockReturnValue({
            data: {
                cubeResults: {
                    numberOfSolves: 10,
                    todayAverageInMillis: 12_000,
                },
            },
            refetch,
        });
        useMutationMock.mockReturnValue([storeCubeResult]);
        newCubeMock.mockImplementation(() => ({
            puzzle: {performAlg: jest.fn()},
            enableKey: jest.fn(),
            dispose: jest.fn(),
        }));
    });

    it('loads results and a visualizer for the selected cube type', async () => {
        const user = userEvent.setup();
        render(<CubesMainPage />);

        expect(useQueryMock.mock.calls.at(-1)[1].variables).toEqual({cubeType: 'THREE'});
        await waitFor(() => expect(newCubeMock).toHaveBeenLastCalledWith(expect.any(HTMLElement), 3));

        await user.click(screen.getByRole('combobox', {name: 'Rodzaj kostki'}));
        await user.click(screen.getByRole('option', {name: '4×4'}));

        await waitFor(() => expect(useQueryMock.mock.calls.at(-1)[1].variables).toEqual({cubeType: 'FOUR'}));
        await waitFor(() => expect(newCubeMock).toHaveBeenLastCalledWith(expect.any(HTMLElement), 4));

        await user.click(screen.getByRole('combobox', {name: 'Rodzaj kostki'}));
        await user.click(screen.getByRole('option', {name: 'Megaminx'}));

        expect(screen.getByText('Generator i wizualizacja nie są jeszcze dostępne dla Megaminx.')).toBeInTheDocument();
        expect(screen.getByRole('button', {name: 'Scramble'})).toBeDisabled();
    });

    it('records a solve with the selected cube type', async () => {
        const user = userEvent.setup();
        render(<CubesMainPage />);

        await user.click(screen.getByRole('combobox', {name: 'Rodzaj kostki'}));
        await user.click(screen.getByRole('option', {name: '4×4'}));

        fireEvent.keyDown(document, {code: 'Space'});
        await screen.findByText('INSPECTION_EARLY');
        fireEvent.keyUp(document, {code: 'Space'});
        await screen.findByText('SOLVING');
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
});
