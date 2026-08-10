import {render, screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {Account, BankTransactionToImport} from '../types';
import {CreateCustomImportForm} from './CreateCustomImportForm';

jest.mock('./utils/customImportSummary', () => {
    const Decimal = require('decimal.js');
    return {
        transactionCustomImportSummary: (_transactions: unknown, _accounts: unknown, billingElements: unknown[]) => [
            {
                bankAccountPublicId: 'bank-1',
                currency: 'PLN',
                balanceFromImportingTransactions: new Decimal(100),
                balanceAfterImport: new Decimal(billingElements.length > 0 ? 0 : 100),
            },
        ],
    };
});

jest.mock('./CreateBillingElementForm', () => {
    const Decimal = require('decimal.js');
    const dayjs = require('dayjs');
    return {
        CreateBillingElementForm: ({billingElementToCreate, onClose}: any) => (
            <>
                <button onClick={() => onClose(null)}>Anuluj element</button>
                <button
                    onClick={() =>
                        onClose({
                            ...billingElementToCreate,
                            affectedAccountPublicId: 'account-1',
                            amount: new Decimal(100),
                            category: {publicId: 'category-1', name: 'Pensja'},
                            date: dayjs('2026-08-10'),
                            description: 'Pensja',
                        })
                    }
                >
                    Zapisz element
                </button>
            </>
        ),
    };
});

jest.mock('./CreateTransferForm', () => ({
    CreateTransferForm: () => null,
}));

describe('CreateCustomImportForm', () => {
    const account = {
        publicId: 'account-1',
        name: 'Konto główne',
        bankAccount: {publicId: 'bank-1', iban: 'PL00'},
        currentBalance: {amount: 1_000, currency: {code: 'PLN', description: 'Polski złoty'}},
    } as Account;
    const transaction = {
        id: 1,
        transactionPublicId: 'transaction-1',
        creditBankAccountPublicId: 'bank-1',
        credit: 100,
        debit: 0,
        conversionRate: 1,
        description: 'Pensja',
        timeOfTransaction: '2026-08-10T12:00:00',
    } as BankTransactionToImport;

    it('uses a balanced, card-based workflow and does not retain cancelled drafts', async () => {
        const user = userEvent.setup();
        const onClose = jest.fn();

        render(
            <CreateCustomImportForm
                accountsWithAssignedBankAccounts={[account]}
                accountsWithoutAssignedBankAccounts={[]}
                billingCategories={[]}
                piggyBanks={[]}
                bankTransactions={[transaction]}
                onClose={onClose}
            />
        );

        expect(screen.getByRole('heading', {name: 'Własny import'})).toBeVisible();
        expect(screen.getByText('Bilans wymaga uzupełnienia')).toBeVisible();
        expect(screen.getByText('Liczba elementów: 0')).toBeVisible();
        expect(screen.getByRole('button', {name: 'Potwierdź import'})).toBeDisabled();

        await user.click(screen.getByRole('button', {name: 'Dodaj dochód'}));
        expect(screen.getByRole('heading', {name: 'Dodaj dochód'})).toBeVisible();
        await user.keyboard('{Escape}');

        await waitFor(() => expect(screen.queryByRole('heading', {name: 'Dodaj dochód'})).not.toBeInTheDocument());
        expect(screen.getByText('Liczba elementów: 0')).toBeVisible();

        await user.click(screen.getByRole('button', {name: 'Dodaj dochód'}));
        await user.click(screen.getByRole('button', {name: 'Anuluj element'}));

        await waitFor(() => expect(screen.getByText('Liczba elementów: 0')).toBeVisible());
        expect(screen.queryByRole('button', {name: 'Edytuj element rozliczeniowy'})).not.toBeInTheDocument();

        await user.click(screen.getByRole('button', {name: 'Dodaj dochód'}));
        await user.click(screen.getByRole('button', {name: 'Zapisz element'}));

        await waitFor(() => expect(screen.getByText('Bilans poprawny')).toBeVisible());
        expect(screen.getByText('Liczba elementów: 1')).toBeVisible();
        expect(screen.getByRole('button', {name: 'Edytuj element rozliczeniowy'})).toBeVisible();

        await user.click(screen.getByRole('button', {name: 'Potwierdź import'}));
        expect(onClose).toHaveBeenCalledWith({
            billingElements: [expect.objectContaining({description: 'Pensja'})],
            transfers: [],
        });
    });
});
