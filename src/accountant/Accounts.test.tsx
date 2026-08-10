import {render, screen} from '@testing-library/react';
import {useMutation, useQuery} from '@apollo/client/react';
import {Accounts} from './Accounts';
import type {Account, CurrencyInfo, PiggyBank} from '../types';
import userEvent from '@testing-library/user-event';
import {ACCOUNTANT_SETTINGS_ACTIVE_TAB_LOCAL_STORAGE_KEY} from './settings/accountant-settings-tabs';

const mockChangePage = jest.fn();

jest.mock('@apollo/client/react', () => ({
    useMutation: jest.fn(),
    useQuery: jest.fn(),
}));

jest.mock('../utils/use-application-navigation', () => ({
    useApplicationNavigation: () => ({changePage: mockChangePage}),
}));

const currency = {code: 'PLN', description: 'Polski złoty'} as CurrencyInfo;
const account = {
    publicId: 'account-id',
    name: 'Konto główne',
    visible: true,
    order: 1,
    currentBalance: {amount: 1250, currency},
} as Account;
const hiddenAccount = {
    ...account,
    publicId: 'hidden-account-id',
    name: 'Konto ukryte',
    visible: false,
} as Account;
const piggyBank = {
    publicId: 'piggy-bank-id',
    name: 'Wakacje',
    description: '',
    domain: {publicId: 'domain-id', name: 'Rodzina'},
    balance: {amount: 500, currency},
    monthlyTopUp: {amount: 0, currency},
    savings: false,
} as PiggyBank;

describe('Accounts', () => {
    beforeEach(() => {
        mockChangePage.mockReset();
        window.localStorage.removeItem(ACCOUNTANT_SETTINGS_ACTIVE_TAB_LOCAL_STORAGE_KEY);
        (useMutation as unknown as jest.Mock).mockReturnValue([jest.fn()]);
        (useQuery as unknown as jest.Mock).mockReturnValue({
            loading: false,
            error: undefined,
            refetch: jest.fn().mockResolvedValue(undefined),
            data: {
                financeManagement: {
                    accounts: [hiddenAccount, account],
                    piggyBanks: [piggyBank],
                },
            },
        });
    });

    it('presents visible accounts and piggy banks in separate sections', async () => {
        const user = userEvent.setup();
        render(<Accounts />);

        expect(screen.getByRole('heading', {level: 3, name: 'Konta'})).toBeInTheDocument();
        expect(screen.getByText('Liczba kont: 2')).toBeInTheDocument();
        const hiddenAccounts = screen.getByRole('button', {name: 'Ukrytych: 1. Przejdź do Ustawienia, Konta'});
        expect(hiddenAccounts).toBeInTheDocument();
        expect(screen.getByText('Liczba skarbonek: 1')).toBeInTheDocument();
        expect(screen.getByRole('button', {name: /^Konto główne/})).toHaveAttribute('aria-haspopup', 'dialog');
        expect(screen.queryByText('Konto ukryte')).not.toBeInTheDocument();
        expect(screen.getByText('Wakacje')).toBeInTheDocument();
        expect(screen.getByRole('button', {name: 'Dodaj środki do skarbonki Wakacje'})).toBeInTheDocument();
        expect(screen.getByRole('button', {name: 'Odejmij środki ze skarbonki Wakacje'})).toBeInTheDocument();

        await user.click(hiddenAccounts);

        expect(window.localStorage.getItem(ACCOUNTANT_SETTINGS_ACTIVE_TAB_LOCAL_STORAGE_KEY)).toBe('konta');
        expect(mockChangePage).toHaveBeenCalledWith('settings');
    });
});
