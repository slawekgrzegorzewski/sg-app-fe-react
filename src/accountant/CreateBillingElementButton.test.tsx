import {useMutation, useQuery} from '@apollo/client/react';
import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {CreateBillingElementButton} from './CreateBillingElementButton';

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

describe('CreateBillingElementButton', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        useMutationMock.mockReturnValue([jest.fn()]);
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
});
