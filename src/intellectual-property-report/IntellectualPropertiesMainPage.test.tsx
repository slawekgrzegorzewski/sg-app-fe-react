import {useMutation, useQuery} from '@apollo/client/react';
import {render, screen, waitFor, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import dayjs from 'dayjs';
import 'dayjs/locale/pl';
import {IntellectualPropertiesMainPage} from './IntellectualPropertiesMainPage';

jest.mock('@apollo/client/react', () => ({
    useQuery: jest.fn(),
    useMutation: jest.fn(),
}));

jest.mock('react-router-dom', () => ({
    useNavigate: () => jest.fn(),
    useParams: () => ({domainPublicId: 'domain-1'}),
}));

const useQueryMock = useQuery as unknown as jest.Mock;
const useMutationMock = useMutation as unknown as jest.Mock;

function renderPage() {
    return render(<IntellectualPropertiesMainPage />);
}

describe('IntellectualPropertiesMainPage', () => {
    const refetch = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        localStorage.clear();
        useMutationMock.mockReturnValue([
            jest.fn().mockResolvedValue({}),
            {called: false, loading: false, reset: jest.fn()},
        ]);
        useQueryMock.mockReturnValue({
            loading: false,
            error: undefined,
            refetch,
            data: {
                intellectualPropertiesRecords: {
                    reports: [
                        {
                            id: 7,
                            description: 'Moduł rozliczania płatności',
                            domain: {publicId: 'domain-1', name: 'Firma'},
                            tasks: [
                                {
                                    id: 11,
                                    description: 'Obsługa płatności cyklicznych',
                                    coAuthors: 'Anna',
                                    attachments: ['opis-techniczny.pdf'],
                                    timeRecords: [
                                        {
                                            id: 21,
                                            date: '2026-08-03',
                                            numberOfHours: 6,
                                            description: '',
                                        },
                                    ],
                                },
                            ],
                        },
                    ],
                    stats: {
                        firstTimeRecord: '2026-07-01',
                        lastTimeRecord: '2026-08-03',
                    },
                },
            },
        });
    });

    it('shows the responsive report summary and expands task details', async () => {
        const user = userEvent.setup();
        renderPage();

        expect(screen.getByRole('heading', {name: 'Raporty własności intelektualnej'})).toBeVisible();
        expect(screen.getByRole('button', {name: 'Dodaj raport IP'})).toBeVisible();
        expect(screen.getByRole('combobox', {name: 'Miesiąc'})).toHaveTextContent(
            dayjs().locale('pl').format('MMMM YYYY')
        );
        expect(screen.getByText('Raporty: 1')).toBeVisible();
        expect(screen.getAllByText('Zadania: 1')).toHaveLength(2);

        const reportButton = screen.getByRole('button', {name: /Moduł rozliczania płatności/});
        expect(reportButton).toHaveAttribute('aria-expanded', 'false');

        await user.click(reportButton);

        expect(reportButton).toHaveAttribute('aria-expanded', 'true');
        expect(screen.getByRole('heading', {name: 'Zadania'})).toBeVisible();
        expect(screen.getByText('Obsługa płatności cyklicznych')).toBeVisible();
        expect(screen.getByText('opis-techniczny.pdf')).toBeVisible();
        expect(screen.getByText('6 godz.')).toBeVisible();
    });

    it('opens and closes the create dialog with Escape', async () => {
        const user = userEvent.setup();
        renderPage();

        await user.click(screen.getByRole('button', {name: 'Dodaj raport IP'}));

        const dialog = screen.getByRole('dialog', {name: 'Dodaj raport własności intelektualnej'});
        expect(within(dialog).getByRole('textbox', {name: 'Opis'})).toBeVisible();
        expect(within(dialog).getByRole('button', {name: 'Dodaj raport'})).toBeVisible();

        await user.keyboard('{Escape}');

        await waitFor(() =>
            expect(
                screen.queryByRole('dialog', {name: 'Dodaj raport własności intelektualnej'})
            ).not.toBeInTheDocument()
        );
    });

    it('keeps attachment filters mutually exclusive', async () => {
        const user = userEvent.setup();
        renderPage();

        const reportsWithoutAttachments = screen.getByRole('switch', {name: 'Raporty bez załączników'});
        const tasksWithoutAttachments = screen.getByRole('switch', {name: 'Zadania bez załączników'});

        await user.click(reportsWithoutAttachments);
        expect(reportsWithoutAttachments).toBeChecked();
        expect(tasksWithoutAttachments).not.toBeChecked();

        await user.click(tasksWithoutAttachments);
        expect(reportsWithoutAttachments).not.toBeChecked();
        expect(tasksWithoutAttachments).toBeChecked();
        expect(useQueryMock.mock.calls.at(-1)[1].variables).toEqual(
            expect.objectContaining({
                onlyReportsWithoutAttachments: false,
                onlyReportsHavingTasksWithNoAttachments: true,
            })
        );
    });

    it('shows a clear empty state for filters without matching reports', () => {
        useQueryMock.mockReturnValue({
            loading: false,
            error: undefined,
            refetch,
            data: {
                intellectualPropertiesRecords: {
                    reports: [],
                    stats: {firstTimeRecord: null, lastTimeRecord: null},
                },
            },
        });

        renderPage();

        expect(screen.getByText('Raporty: 0')).toBeVisible();
        expect(screen.getByText('Brak raportów spełniających wybrane kryteria.')).toBeVisible();
    });
});
