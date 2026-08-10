import {useLazyQuery, useMutation} from '@apollo/client/react';
import {render, screen, waitFor, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import dayjs from 'dayjs';
import {BillingPeriods} from './BillingPeriods';

jest.mock('@apollo/client/react', () => ({
    useLazyQuery: jest.fn(),
    useMutation: jest.fn(),
}));

jest.mock('./BillingElementsInCategory', () => ({
    BillingElementsInCategory: ({categoryName}: {categoryName: string}) => <div>{categoryName}</div>,
}));

jest.mock('./CreateBillingElementButton', () => ({
    CreateBillingElementButton: ({billingElementType}: {billingElementType: string}) => (
        <button>Dodaj {billingElementType}</button>
    ),
}));

jest.mock('./BankTransactionsImporter', () => ({
    BankTransactionsImporter: () => <div>Importer transakcji</div>,
}));

const useLazyQueryMock = useLazyQuery as unknown as jest.Mock;
const useMutationMock = useMutation as unknown as jest.Mock;

describe('BillingPeriods', () => {
    const performSearch = jest.fn();
    const refetch = jest.fn();
    const clearStore = jest.fn().mockResolvedValue(undefined);

    beforeEach(() => {
        jest.clearAllMocks();
        clearStore.mockResolvedValue(undefined);
        useMutationMock.mockReturnValue([jest.fn()]);
    });

    it('uses the cubes-page layout for an active billing period', async () => {
        const user = userEvent.setup();
        useLazyQueryMock.mockReturnValue([
            performSearch,
            {
                loading: false,
                error: undefined,
                client: {clearStore},
                refetch,
                data: {
                    billingPeriod: {
                        billingPeriod: {
                            publicId: 'period-1',
                            name: 'Current period',
                            period: dayjs().format('YYYY-MM'),
                            monthSummary: null,
                            incomes: [
                                {
                                    __typename: 'Income',
                                    publicId: 'income-1',
                                    description: 'Salary',
                                    amount: 100,
                                    currency: 'PLN',
                                    date: dayjs().format('YYYY-MM-DD'),
                                    category: {name: 'Pensja', description: ''},
                                },
                            ],
                            expenses: [],
                        },
                        creationBlockers: {
                            alreadyExists: true,
                            unfinishedBillingPeriods: false,
                            notForCurrentMonth: false,
                        },
                    },
                },
            },
        ]);

        render(<BillingPeriods />);

        expect(screen.getByRole('heading', {name: 'Okresy rozliczeniowe'})).toBeVisible();
        expect(screen.getByText('Okres aktywny')).toBeVisible();
        expect(screen.getByRole('heading', {name: 'Dochody'})).toBeVisible();
        expect(screen.getByRole('heading', {name: 'Wydatki'})).toBeVisible();
        expect(screen.getByText('Liczba pozycji: 1')).toBeVisible();
        expect(screen.getByText('Liczba pozycji: 0')).toBeVisible();
        expect(screen.getByRole('button', {name: 'Zakończ okres'})).toBeVisible();

        await user.click(screen.getByRole('button', {name: 'Zakończ okres'}));

        const confirmationDialog = screen.getByRole('dialog', {name: 'Zakończ okres rozliczeniowy?'});
        expect(within(confirmationDialog).getByText(/zostanie zakończony/)).toBeVisible();
        expect(
            within(confirmationDialog).getByText(/nie będzie można dodawać ani edytować dochodów i wydatków/)
        ).toBeVisible();
        expect(within(confirmationDialog).getByRole('button', {name: 'Zakończ okres'})).toHaveClass(
            'MuiButton-containedError'
        );

        await user.click(within(confirmationDialog).getByRole('button', {name: 'Anuluj'}));
        await waitFor(() =>
            expect(screen.queryByRole('dialog', {name: 'Zakończ okres rozliczeniowy?'})).not.toBeInTheDocument()
        );

        await user.click(screen.getByRole('button', {name: 'Następny miesiąc'}));
        await waitFor(() =>
            expect(performSearch).toHaveBeenLastCalledWith({
                variables: {yearMonth: dayjs().add(1, 'month').format('YYYY-MM')},
            })
        );
    });

    it('shows a clear creation state when the selected month can be opened', () => {
        useLazyQueryMock.mockReturnValue([
            performSearch,
            {
                loading: false,
                error: undefined,
                client: {clearStore},
                refetch,
                data: {
                    billingPeriod: {
                        billingPeriod: null,
                        creationBlockers: {
                            alreadyExists: false,
                            unfinishedBillingPeriods: false,
                            notForCurrentMonth: false,
                        },
                    },
                },
            },
        ]);

        render(<BillingPeriods />);

        expect(screen.getByRole('heading', {name: 'Brak okresu rozliczeniowego'})).toBeVisible();
        expect(screen.getByRole('button', {name: 'Utwórz okres'})).toBeVisible();
    });

    it('does not expose editing or importing actions for a finished billing period', () => {
        useLazyQueryMock.mockReturnValue([
            performSearch,
            {
                loading: false,
                error: undefined,
                client: {clearStore},
                refetch,
                data: {
                    billingPeriod: {
                        billingPeriod: {
                            publicId: 'period-1',
                            name: 'Finished period',
                            period: dayjs().format('YYYY-MM'),
                            monthSummary: {savings: [], accounts: [], piggyBanks: []},
                            incomes: [],
                            expenses: [],
                        },
                        creationBlockers: {
                            alreadyExists: true,
                            unfinishedBillingPeriods: false,
                            notForCurrentMonth: false,
                        },
                    },
                },
            },
        ]);

        render(<BillingPeriods />);

        expect(screen.getByText('Okres zakończony')).toBeVisible();
        expect(screen.queryByText('Importer transakcji')).not.toBeInTheDocument();
        expect(screen.queryByRole('button', {name: /Dodaj/})).not.toBeInTheDocument();
        expect(screen.queryByRole('button', {name: 'Zakończ okres'})).not.toBeInTheDocument();
    });
});
