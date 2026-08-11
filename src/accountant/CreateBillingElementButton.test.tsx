import {useMutation, useQuery} from '@apollo/client/react';
import {act, render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {CreateBillingElementButton} from './CreateBillingElementButton';
import {BillingPeriodQuery, GetFinanceManagement} from '../types';

jest.mock('@apollo/client/react', () => ({
    useMutation: jest.fn(),
    useQuery: jest.fn(),
}));

const mockFormDialog = jest.fn();
jest.mock('../utils/dialogs/FormDialog', () => ({
    FormDialog: (properties: unknown) => {
        mockFormDialog(properties);
        return <div role="dialog" aria-label="Formularz elementu rozliczeniowego" />;
    },
}));

const useQueryMock = useQuery as unknown as jest.Mock;
const useMutationMock = useMutation as unknown as jest.Mock;
const mutationMock = jest.fn();

describe('CreateBillingElementButton', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mutationMock.mockResolvedValue({});
        useMutationMock.mockReturnValue([mutationMock]);
        useQueryMock.mockReturnValue({
            loading: false,
            client: {clearStore: jest.fn()},
            refetch: jest.fn(),
            data: {
                financeManagement: {
                    accounts: [
                        {
                            publicId: 'account-1',
                            name: 'Konto główne',
                            order: 1,
                            currentBalance: {amount: 100, currency: {code: 'PLN'}},
                        },
                    ],
                    billingCategories: [],
                    piggyBanks: [],
                },
            },
        });
    });

    it('opens the form directly and lets the user select an account there', async () => {
        const user = userEvent.setup();
        render(<CreateBillingElementButton billingElementType="Income" />);

        await user.click(screen.getByRole('button', {name: 'Dodaj dochód'}));

        expect(screen.getByRole('dialog', {name: 'Formularz elementu rozliczeniowego'})).toBeVisible();
        const formProperties = mockFormDialog.mock.calls.at(-1)[0].formProps;
        expect(formProperties.initialValues.affectedAccountPublicId).toBe('');
        expect(formProperties.fields.find((field: {key: string}) => field.key === 'affectedAccountPublicId')).toEqual(
            expect.objectContaining({editable: true})
        );
    });

    it('refreshes the billing period and finance data after saving', async () => {
        const user = userEvent.setup();
        render(<CreateBillingElementButton billingElementType="Income" />);

        await user.click(screen.getByRole('button', {name: 'Dodaj dochód'}));
        const formProperties = mockFormDialog.mock.calls.at(-1)[0];
        await act(async () => {
            await formProperties.onConfirm({
                billingElementType: 'Income',
                publicId: '',
                affectedAccountPublicId: 'account-1',
                amount: 12.34,
                category: {publicId: 'category-1'},
                date: {format: () => '2026-08-11'},
                description: 'Dochód testowy',
                piggyBank: null,
            });
        });

        expect(mutationMock).toHaveBeenCalledWith({
            variables: {
                accountPublicId: 'account-1',
                description: 'Dochód testowy',
                amount: 12.34,
                currency: 'PLN',
                categoryPublicId: 'category-1',
                date: '2026-08-11',
                piggyBankPublicId: null,
                bankTransactionPublicIds: [],
            },
            refetchQueries: [BillingPeriodQuery, GetFinanceManagement],
            awaitRefetchQueries: true,
        });
        expect(screen.queryByRole('dialog', {name: 'Formularz elementu rozliczeniowego'})).not.toBeInTheDocument();
    });
});
