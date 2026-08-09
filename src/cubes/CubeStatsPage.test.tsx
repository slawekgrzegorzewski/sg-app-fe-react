import {useQuery} from '@apollo/client/react';
import {render, screen, waitFor, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import dayjs from 'dayjs';
import {CubeStatsPage, formatCubeTime, summarizeCubeStats} from './CubeStatsPage';

jest.mock('@apollo/client/react', () => ({
    useQuery: jest.fn(),
}));

const useQueryMock = useQuery as unknown as jest.Mock;

describe('cube statistics helpers', () => {
    it('formats milliseconds as a stopwatch time', () => {
        expect(formatCubeTime(5_123)).toBe('00:05.123');
        expect(formatCubeTime(65_007)).toBe('01:05.007');
        expect(formatCubeTime(null)).toBe('—');
    });

    it('summarizes the month while ignoring unavailable averages', () => {
        expect(
            summarizeCubeStats([
                {
                    day: '2026-08-01',
                    min: 10_000,
                    max: 18_000,
                    minAo5: null,
                    minAo30: null,
                    numberOfTries: 4,
                },
                {
                    day: '2026-08-02',
                    min: 9_000,
                    max: 17_000,
                    minAo5: 11_000,
                    minAo30: null,
                    numberOfTries: 6,
                },
            ])
        ).toEqual({numberOfTries: 10, activeDays: 2, bestTime: 9_000, bestAo5: 11_000});
    });
});

describe('CubeStatsPage', () => {
    beforeEach(() => {
        useQueryMock.mockReturnValue({
            loading: false,
            error: undefined,
            refetch: jest.fn(),
            data: {
                cubeResults: {
                    topTenAllTime: [
                        {timeInMillis: 15_000, date: '2026-08-02T12:30:00'},
                        {timeInMillis: 10_000, date: '2026-08-01T09:15:00'},
                        {timeInMillis: 20_000, date: '2026-08-05T16:00:00'},
                        {timeInMillis: 12_000, date: '2026-08-03T10:00:00'},
                        {timeInMillis: 18_000, date: '2026-08-04T14:00:00'},
                    ],
                    stats: [
                        {
                            day: '2026-08-01',
                            min: 12_345,
                            max: 18_200,
                            minAo5: 14_500,
                            minAo30: null,
                            numberOfTries: 5,
                        },
                        {
                            day: '2026-08-02',
                            min: 11_000,
                            max: 17_500,
                            minAo5: 13_500,
                            minAo30: 14_200,
                            numberOfTries: 7,
                        },
                    ],
                },
            },
        });
    });

    it('shows the top three results and expands the remaining places', async () => {
        const user = userEvent.setup();
        render(<CubeStatsPage />);

        expect(screen.getByText('Liczba prób').nextElementSibling).toHaveTextContent('12');
        expect(screen.getByText('Aktywne dni').nextElementSibling).toHaveTextContent('2');
        expect(screen.getByRole('table', {name: 'Dzienne statystyki kostki'})).toBeInTheDocument();
        expect(screen.getAllByText('00:11.000').length).toBeGreaterThan(0);
        expect(screen.getByText('—')).toBeInTheDocument();

        const topTenTable = screen.getByRole('table', {name: 'Top 10 wyników wszech czasów'});
        const topTenHeading = screen.getByRole('heading', {name: 'Top 10 wszech czasów'});
        const monthPager = screen.getByRole('button', {name: 'Poprzedni miesiąc'});
        expect(topTenHeading.compareDocumentPosition(monthPager) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        const topTenRows = within(topTenTable).getAllByRole('row');
        expect(within(topTenRows[1]).getByText('00:10.000')).toBeInTheDocument();
        expect(within(topTenRows[2]).getByText('00:12.000')).toBeInTheDocument();
        expect(within(topTenRows[3]).getByText('00:15.000')).toBeInTheDocument();
        expect(screen.queryByText('00:18.000')).not.toBeInTheDocument();

        await user.click(screen.getByRole('button', {name: 'Pokaż miejsca 4–5'}));

        expect(screen.getByText('00:18.000')).toBeInTheDocument();
        expect(screen.getByText('00:20.000')).toBeInTheDocument();
        expect(screen.getByRole('button', {name: 'Ukryj miejsca 4–5'})).toHaveAttribute('aria-expanded', 'true');
    });

    it('loads statistics for another cube type and month', async () => {
        const user = userEvent.setup();
        render(<CubeStatsPage />);

        await user.click(screen.getByRole('combobox', {name: 'Rodzaj kostki'}));
        await user.click(screen.getByRole('option', {name: '2×2'}));

        await waitFor(() => expect(useQueryMock.mock.calls.at(-1)[1].variables.cubeType).toBe('TWO'));

        await user.click(screen.getByRole('button', {name: 'Poprzedni miesiąc'}));

        await waitFor(() =>
            expect(useQueryMock.mock.calls.at(-1)[1].variables).toEqual({
                cubeType: 'TWO',
                month: dayjs().subtract(1, 'month').format('YYYY-MM'),
            })
        );
    });
});
