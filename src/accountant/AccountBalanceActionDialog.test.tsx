import {render, screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {useMutation} from '@apollo/client/react';
import {Account, CreateTransfer, CurrencyInfo} from '../types';
import {AccountBalanceActionDialog} from './AccountBalanceActionDialog';
import Decimal from 'decimal.js';
import dayjs from 'dayjs';

jest.mock('@apollo/client/react', () => ({
    useMutation: jest.fn(),
}));

jest.mock('./CreateTransferForm', () => ({
    CreateTransferForm: ({
        onClose,
        transferToCreate,
        descriptionEditable,
        dateEditable,
    }: {
        onClose: (value: unknown) => void;
        descriptionEditable: boolean;
        dateEditable: boolean;
        transferToCreate: {
            fromAccountPublicId: string;
            fromAmount: {toString: () => string};
            description: string;
            day: {format: (format: string) => string} | null;
        };
    }) => (
        <button
            data-from-account={transferToCreate.fromAccountPublicId}
            data-from-amount={transferToCreate.fromAmount.toString()}
            data-description={transferToCreate.description}
            data-description-editable={descriptionEditable}
            data-date-editable={dateEditable}
            data-day={transferToCreate.day?.format('YYYY-MM-DD')}
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
                action={{
                    account,
                    initialTransfer: {
                        fromAmount: new Decimal(125),
                        description: 'Źródłowa transakcja',
                        day: dayjs('2026-08-08'),
                    },
                    lockDescription: true,
                    dateEditable: true,
                }}
                accounts={[account]}
                onClose={onClose}
                onCompleted={onCompleted}
            />
        );

        const submitButton = screen.getByRole('button', {name: 'Zapisz transfer'});
        expect(submitButton).toHaveAttribute('data-from-account', 'account-id');
        expect(submitButton).toHaveAttribute('data-from-amount', '125');
        expect(submitButton).toHaveAttribute('data-description', 'Źródłowa transakcja');
        expect(submitButton).toHaveAttribute('data-description-editable', 'false');
        expect(submitButton).toHaveAttribute('data-date-editable', 'true');
        expect(submitButton).toHaveAttribute('data-day', '2026-08-08');

        await user.click(submitButton);

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
