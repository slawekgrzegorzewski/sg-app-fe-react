import {render, screen, waitFor, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {Expense, Income} from '../types';
import {BillingElementsInCategory} from './BillingElementsInCategory';

describe('BillingElementsInCategory', () => {
    it('shows a responsive income category summary and closes with Escape', async () => {
        const user = userEvent.setup();
        const incomes = [
            {
                __typename: 'Income',
                publicId: 'income-1',
                description: 'Wynagrodzenie podstawowe',
                amount: 5000,
                currency: 'PLN',
                date: '2026-08-10',
                category: {name: 'Pensja', description: ''},
            },
            {
                __typename: 'Income',
                publicId: 'income-2',
                description: 'Premia',
                amount: 500,
                currency: 'PLN',
                date: '2026-08-15',
                category: {name: 'Pensja', description: ''},
            },
        ] as Income[];

        render(<BillingElementsInCategory categoryName="Pensja" billingElements={incomes} />);

        await user.click(screen.getByRole('button', {name: /Pensja/}));

        const dialog = screen.getByRole('dialog', {name: 'Dochody w kategorii: Pensja'});
        expect(within(dialog).getByText('2 pozycje')).toBeVisible();
        expect(within(dialog).getByText('Wynagrodzenie podstawowe')).toBeVisible();
        expect(within(dialog).getByText('Premia')).toBeVisible();
        expect(within(dialog).getByText('10 sie 2026')).toBeVisible();

        await user.keyboard('{Escape}');
        await waitFor(() =>
            expect(screen.queryByRole('dialog', {name: 'Dochody w kategorii: Pensja'})).not.toBeInTheDocument()
        );
    });

    it('marks an expense category and its amount as an expense', async () => {
        const user = userEvent.setup();
        const expenses = [
            {
                __typename: 'Expense',
                publicId: 'expense-1',
                description: 'Zakupy spożywcze',
                amount: 120,
                currency: 'PLN',
                date: '2026-08-12',
                category: {name: 'Jedzenie', description: ''},
            },
        ] as Expense[];

        render(<BillingElementsInCategory categoryName="Jedzenie" billingElements={expenses} />);

        await user.click(screen.getByRole('button', {name: /Jedzenie/}));

        const dialog = screen.getByRole('dialog', {name: 'Wydatki w kategorii: Jedzenie'});
        expect(within(dialog).getByText('Wydatki')).toBeVisible();
        expect(within(dialog).getByText('1 pozycja')).toBeVisible();
        expect(within(dialog).getByText('Zakupy spożywcze')).toBeVisible();
    });
});
