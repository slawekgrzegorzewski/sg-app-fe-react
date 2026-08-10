import {useMutation, useQuery} from '@apollo/client/react';
import {render, screen, within} from '@testing-library/react';
import dayjs from 'dayjs';
import {IntellectualPropertyReportMainPage} from './IntellectualPropertyReportMainPage';

jest.mock('@apollo/client/react', () => ({
    useQuery: jest.fn(),
    useMutation: jest.fn(),
}));

jest.mock('../utils/ExportExcel', () => ({
    __esModule: true,
    default: ({buttonText}: {buttonText: string}) => <button>{buttonText}</button>,
}));

const useQueryMock = useQuery as unknown as jest.Mock;
const useMutationMock = useMutation as unknown as jest.Mock;

describe('IntellectualPropertyReportMainPage', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        useMutationMock.mockReturnValue([
            jest.fn().mockResolvedValue({}),
            {called: false, loading: false, reset: jest.fn()},
        ]);
        useQueryMock.mockReturnValue({
            loading: false,
            error: undefined,
            refetch: jest.fn().mockResolvedValue({}),
            data: {
                intellectualPropertiesReport: {
                    availableYears: [Number(dayjs().format('YYYY'))],
                    timeRecordCategories: [{id: 4, name: 'Praca organizacyjna'}],
                    report: {
                        year: Number(dayjs().format('YYYY')),
                        countOfDifferentIPs: 2,
                        ipHours: 12,
                        nonIPHours: 3,
                        ipPercentage: 80,
                        monthReports: [
                            {
                                yearMonth: dayjs().format('YYYY-08'),
                                ipHours: 12,
                                nonIPHours: 3,
                                ipPercentage: 80,
                                timeRecordReports: [{description: 'Moduł płatności', ipHours: 12, nonIPHours: 0}],
                                nonCategorizedTimeRecords: [
                                    {id: 9, description: 'Spotkanie zespołu', numberOfHours: 3},
                                ],
                            },
                        ],
                    },
                },
            },
        });
    });

    it('shows annual metrics and a responsive report table', () => {
        render(<IntellectualPropertyReportMainPage />);

        expect(screen.getByRole('heading', {name: 'Raporty roczne'})).toBeVisible();
        expect(screen.getByText('Prace autorskie: 2')).toBeVisible();
        expect(screen.getByText('IP: 12 godz.')).toBeVisible();
        expect(screen.getByRole('combobox', {name: 'Rok'})).toHaveTextContent(dayjs().format('YYYY'));

        const table = screen.getByRole('table', {
            name: `Raport własności intelektualnej za rok ${dayjs().format('YYYY')}`,
        });
        expect(within(table).getByText('Moduł płatności')).toBeVisible();
        expect(within(table).getByText('Spotkanie zespołu')).toBeVisible();
        expect(within(table).getByRole('combobox', {name: 'Kategoria'})).toBeVisible();
    });
});
