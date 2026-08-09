import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {useQuery} from '@apollo/client/react';
import {Account, CurrencyInfo} from '../types';
import {AccountTransactions} from './AccountTransactions';

jest.mock('@apollo/client/react', () => ({
    useQuery: jest.fn(),
}));

jest.mock('./AccountBalanceActionDialog', () => ({
    AccountBalanceActionDialog: ({action}: {action: any}) => (
        <div
            data-testid="forward-transfer-dialog"
            data-account={action.account.publicId}
            data-amount={action.initialTransfer.fromAmount.toString()}
            data-description={action.initialTransfer.description}
            data-day={action.initialTransfer.day.format('YYYY-MM-DD')}
            data-lock-description={action.lockDescription}
            data-date-editable={action.dateEditable}
        />
    ),
}));

const currency = {code: 'PLN', description: 'Polski złoty'} as CurrencyInfo;
const account = {
    publicId: 'account-id',
    name: 'Konto główne',
    currentBalance: {amount: 1000, currency},
} as Account;

describe('AccountTransactions', () => {
    beforeEach(() => {
        (useQuery as unknown as jest.Mock).mockReturnValue({
            loading: false,
            error: undefined,
            refetch: jest.fn().mockResolvedValue(undefined),
            data: {
                financeManagement: {
                    accounts: [
                        {
                            transactions: [
                                {
                                    publicId: 'credit-id',
                                    description: 'Wynagrodzenie',
                                    timeOfTransaction: '2026-08-08T12:00:00',
                                    source: null,
                                    destination: {publicId: 'account-id'},
                                    debit: null,
                                    credit: {amount: 125, currency},
                                },
                                {
                                    publicId: 'debit-id',
                                    description: 'Zakupy',
                                    timeOfTransaction: '2026-08-07T12:00:00',
                                    source: {publicId: 'account-id'},
                                    destination: null,
                                    debit: {amount: 25, currency},
                                    credit: null,
                                },
                            ],
                        },
                    ],
                },
            },
        });
    });

    it('offers forwarding only for credits and prefills the transfer from the transaction', async () => {
        const user = userEvent.setup();
        render(
            <AccountTransactions
                account={account}
                accounts={[account]}
                onTransferCompleted={jest.fn().mockResolvedValue(undefined)}
            />
        );

        expect(screen.queryByRole('button', {name: 'Przelej dalej: Zakupy'})).not.toBeInTheDocument();
        await user.click(screen.getByRole('button', {name: 'Przelej dalej: Wynagrodzenie'}));

        const transferDialog = screen.getByTestId('forward-transfer-dialog');
        expect(transferDialog).toHaveAttribute('data-account', 'account-id');
        expect(transferDialog).toHaveAttribute('data-amount', '125');
        expect(transferDialog).toHaveAttribute('data-description', 'Wynagrodzenie');
        expect(transferDialog).toHaveAttribute('data-day', '2026-08-08');
        expect(transferDialog).toHaveAttribute('data-lock-description', 'true');
        expect(transferDialog).toHaveAttribute('data-date-editable', 'true');
    });
});
