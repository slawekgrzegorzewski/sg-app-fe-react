import {render, screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {useMutation} from '@apollo/client/react';
import {Account, CreateTransfer, CurrencyInfo} from '../types';
import {AccountBalanceActionDialog} from './AccountBalanceActionDialog';

jest.mock('@apollo/client/react', () => ({
    useMutation: jest.fn(),
}));

jest.mock('./CreateTransferForm', () => ({
    CreateTransferForm: ({onClose}: {onClose: (value: unknown) => void}) => (
        <button
            onClick={() =>
                onClose({
                    fromAccountPublicId: 'account-id',
                    toAccountPublicId: 'target-account-id',
                    fromAmount: 50,
                    toAmount: 50,
                    description: 'Transfer własny',
                    day: {format: () => '2026-08-09'},
                })
            }
        >
            Zapisz transfer
        </button>
    ),
}));

const currency = {code: 'PLN', description: 'Polski złoty'} as CurrencyInfo;
const account = {
    publicId: 'account-id',
    name: 'Konto główne',
    currentBalance: {amount: 1000, currency},
} as Account;

describe('AccountBalanceActionDialog', () => {
    const createTransferMutation = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        createTransferMutation.mockResolvedValue({});
        (useMutation as unknown as jest.Mock).mockImplementation(document => {
            if (document === CreateTransfer) return [createTransferMutation];
            throw new Error('Unexpected mutation');
        });
    });

    it('uses CreateTransfer and refreshes the accounts', async () => {
        const user = userEvent.setup();
        const onClose = jest.fn();
        const onCompleted = jest.fn().mockResolvedValue(undefined);
        render(
            <AccountBalanceActionDialog
                action={{account}}
                accounts={[account]}
                onClose={onClose}
                onCompleted={onCompleted}
            />
        );

        await user.click(screen.getByRole('button', {name: 'Zapisz transfer'}));

        await waitFor(() =>
            expect(createTransferMutation).toHaveBeenCalledWith({
                variables: {
                    fromAccountPublicId: 'account-id',
                    toAccountPublicId: 'target-account-id',
                    fromAmount: 50,
                    toAmount: 50,
                    description: 'Transfer własny',
                    date: '2026-08-09',
                    bankTransactionPublicIds: [],
                },
            })
        );
        await waitFor(() => expect(onCompleted).toHaveBeenCalledTimes(1));
        expect(onClose).toHaveBeenCalledTimes(1);
    });
});
