import {fireEvent, render, screen, waitFor, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Decimal from 'decimal.js';
import {calculateNewPiggyBankBalance, PiggyBankBalanceEditor} from './PiggyBankBalanceEditor';
import type {PiggyBankDTO} from './PiggyBanksManagement';

jest.mock('@apollo/client/react', () => ({
    useLazyQuery: jest.fn(),
}));

const piggyBank: PiggyBankDTO = {
    publicId: 'piggy-bank-id',
    name: 'Wakacje',
    balance: new Decimal('100'),
    monthlyTopUp: new Decimal('20'),
    description: 'Fundusz wakacyjny',
    currency: 'PLN',
    savings: true,
};

describe('calculateNewPiggyBankBalance', () => {
    it('adds the credited amount without floating-point drift', () => {
        expect(calculateNewPiggyBankBalance(new Decimal('0.1'), 0.2, 'CREDIT').toString()).toBe('0.3');
    });

    it('subtracts the debited amount', () => {
        expect(calculateNewPiggyBankBalance(new Decimal('100'), 25.5, 'DEBIT').toString()).toBe('74.5');
    });
});

describe('PiggyBankBalanceEditor', () => {
    it('previews the resulting balance and returns it on confirmation', async () => {
        const user = userEvent.setup();
        const onSave = jest.fn();

        render(<PiggyBankBalanceEditor type="CREDIT" piggyBank={piggyBank} onSave={onSave} onCancel={jest.fn()} />);

        expect(screen.getByRole('dialog', {name: 'Dodaj środki: Wakacje'})).toBeInTheDocument();
        expect(screen.getByText('Aktualne saldo')).toBeInTheDocument();
        const amount = screen.getByRole('spinbutton', {name: 'Kwota'});
        await user.clear(amount);
        await user.type(amount, '25.5');

        expect(
            within(screen.getByRole('region', {name: 'Podsumowanie salda'})).getByText(/PLN\s*125\.50/)
        ).toBeVisible();

        await user.click(screen.getByRole('button', {name: 'Dodaj środki'}));

        await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
        expect(onSave.mock.calls[0][0].balance.toString()).toBe('125.5');
    });

    it('can be cancelled with the cancel button and close button', async () => {
        const user = userEvent.setup();
        const onCancel = jest.fn();
        const {rerender} = render(
            <PiggyBankBalanceEditor type="DEBIT" piggyBank={piggyBank} onSave={jest.fn()} onCancel={onCancel} />
        );

        await user.click(screen.getByRole('button', {name: 'Anuluj'}));
        expect(onCancel).toHaveBeenCalledTimes(1);

        rerender(<PiggyBankBalanceEditor type="DEBIT" piggyBank={piggyBank} onSave={jest.fn()} onCancel={onCancel} />);
        await user.click(screen.getByRole('button', {name: 'Zamknij'}));
        expect(onCancel).toHaveBeenCalledTimes(2);
    });

    it('can be cancelled with Escape', async () => {
        const onCancel = jest.fn();
        render(<PiggyBankBalanceEditor type="DEBIT" piggyBank={piggyBank} onSave={jest.fn()} onCancel={onCancel} />);

        fireEvent.keyDown(screen.getByRole('dialog'), {key: 'Escape', code: 'Escape'});

        await waitFor(() => expect(onCancel).toHaveBeenCalledTimes(1));
    });

    it('can be cancelled by clicking the backdrop', async () => {
        const user = userEvent.setup();
        const onCancel = jest.fn();
        render(<PiggyBankBalanceEditor type="DEBIT" piggyBank={piggyBank} onSave={jest.fn()} onCancel={onCancel} />);

        await user.click(screen.getByTestId('information-dialog-backdrop'));

        expect(onCancel).toHaveBeenCalledTimes(1);
    });
});
