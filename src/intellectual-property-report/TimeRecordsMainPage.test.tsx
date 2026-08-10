import {useLazyQuery, useMutation, useQuery} from '@apollo/client/react';
import {LocalizationProvider} from '@mui/x-date-pickers';
import {AdapterDayjs} from '@mui/x-date-pickers/AdapterDayjs';
import {plPL} from '@mui/x-date-pickers/locales';
import {render, screen, waitFor, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import 'dayjs/locale/pl';
import {TimeRecordsMainPage} from './TimeRecordsMainPage';

jest.mock('@apollo/client/react', () => ({
    useQuery: jest.fn(),
    useMutation: jest.fn(),
    useLazyQuery: jest.fn(),
}));

const useQueryMock = useQuery as unknown as jest.Mock;
const useMutationMock = useMutation as unknown as jest.Mock;
const useLazyQueryMock = useLazyQuery as unknown as jest.Mock;

function renderPage() {
    return render(
        <LocalizationProvider
            dateAdapter={AdapterDayjs}
            adapterLocale="pl"
            localeText={plPL.components.MuiLocalizationProvider.defaultProps.localeText}
        >
            <TimeRecordsMainPage />
        </LocalizationProvider>
    );
}

describe('TimeRecordsMainPage', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        useMutationMock.mockReturnValue([
            jest.fn().mockResolvedValue({}),
            {called: false, loading: false, reset: jest.fn()},
        ]);
        useLazyQueryMock.mockReturnValue([jest.fn(), {loading: false, error: undefined, data: undefined}]);
        useQueryMock.mockReturnValue({
            loading: false,
            error: undefined,
            refetch: jest.fn().mockResolvedValue({}),
            data: {
                timeRecords: {
                    nonIPTimeRecords: [
                        {
                            id: 1,
                            date: '2026-08-03',
                            numberOfHours: 1.5,
                            description: 'Spotkanie zespołu',
                        },
                    ],
                    taskWithSelectedTimeRecords: [
                        {
                            id: 2,
                            description: 'Moduł płatności',
                            timeRecords: [
                                {
                                    id: 3,
                                    date: '2026-08-03',
                                    numberOfHours: 6,
                                    description: '',
                                },
                            ],
                        },
                    ],
                    stats: {firstTimeRecord: '2026-07-01', lastTimeRecord: '2026-08-03'},
                },
            },
        });
    });

    it('shows a responsive summary and groups entries by day', () => {
        renderPage();

        expect(screen.getByRole('heading', {name: 'Raporty czasu'})).toBeVisible();
        expect(screen.getByText('Wpisy: 2')).toBeVisible();
        expect(screen.getAllByText('7.5 godz.')).toHaveLength(2);
        expect(screen.getByRole('heading', {name: '3 sierpnia 2026'})).toBeVisible();
        expect(screen.getByText('Spotkanie zespołu')).toBeVisible();
        expect(screen.getByText('Moduł płatności')).toBeVisible();
    });

    it('opens and closes the create dialog with Escape', async () => {
        const user = userEvent.setup();
        renderPage();

        await user.click(screen.getByRole('button', {name: 'Dodaj raport czasu'}));

        const dialog = screen.getByRole('dialog', {name: 'Dodaj raport czasu'});
        expect(within(dialog).getByRole('spinbutton', {name: 'Liczba godzin'})).toBeVisible();
        expect(within(dialog).getByRole('button', {name: 'Dodaj raport'})).toBeVisible();

        await user.keyboard('{Escape}');

        await waitFor(() => expect(screen.queryByRole('dialog', {name: 'Dodaj raport czasu'})).not.toBeInTheDocument());
    });

    it('uses a null month filter when all months are selected', async () => {
        const user = userEvent.setup();
        renderPage();

        await user.click(screen.getByRole('combobox', {name: 'Miesiąc'}));
        await user.click(screen.getByRole('option', {name: 'Wszystkie miesiące'}));

        await waitFor(() => expect(useQueryMock.mock.calls.at(-1)[1].variables.yearMonthFilter).toBeNull());
    });
});
