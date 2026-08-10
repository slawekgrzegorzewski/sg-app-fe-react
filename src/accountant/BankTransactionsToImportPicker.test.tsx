import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {Account, BankTransactionToImport, CurrencyInfo} from '../types';
import {BankTransactionsToImportPicker} from './BankTransactionsToImportPicker';

describe('BankTransactionsToImportPicker', () => {
    const currency: CurrencyInfo = {code: 'PLN', description: 'Polski złoty'};
    const account = {
        publicId: 'account-1',
        name: 'Konto główne',
        order: 1,
        visible: true,
        transactions: [],
        currentBalance: {amount: 1_000, currency},
        creditLimit: {amount: 0, currency},
    } as Account;
    const transaction = {
        id: 1,
        transactionPublicId: 'transaction-1',
        sourceAccountPublicId: account.publicId,
        destinationAccountPublicId: null,
        debit: 50,
        credit: 0,
        conversionRate: 1,
        description: 'Zakupy spożywcze',
        timeOfTransaction: '2026-08-10T12:00:00',
    } as BankTransactionToImport;

    it('shows transactions as selectable cards and exposes valid import actions', async () => {
        const user = userEvent.setup();
        const onClose = jest.fn();

        render(
            <BankTransactionsToImportPicker accounts={[account]} bankTransactions={[transaction]} onClose={onClose} />
        );

        expect(screen.getByRole('heading', {name: 'Import transakcji'})).toBeVisible();
        expect(screen.getByText('Wybrano: 0 z 1')).toBeVisible();
        expect(screen.queryByRole('button', {name: 'Utwórz wydatek'})).not.toBeInTheDocument();

        const transactionButton = screen.getByRole('button', {name: 'Transakcja Zakupy spożywcze'});
        await user.click(transactionButton);

        expect(transactionButton).toHaveAttribute('aria-pressed', 'true');
        expect(screen.getByText('Wybrano: 1 z 1')).toBeVisible();
        expect(screen.getByRole('button', {name: 'Własny import'})).toBeVisible();

        await user.click(screen.getByRole('button', {name: 'Utwórz wydatek'}));

        expect(onClose).toHaveBeenCalledWith({
            selectedBankTransactions: [transaction],
            importDecision: {
                importType: 'billingElement',
                data: expect.objectContaining({
                    billingElementType: 'Expense',
                    affectedAccountPublicId: account.publicId,
                    description: transaction.description,
                }),
            },
        });
    });
});
