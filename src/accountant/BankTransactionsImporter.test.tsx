import {useMutation, useQuery} from '@apollo/client/react';
import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {BankTransactionsImporter} from './BankTransactionsImporter';

jest.mock('@apollo/client/react', () => ({
    useMutation: jest.fn(),
    useQuery: jest.fn(),
}));

jest.mock('./BankTransactionsToImportPicker', () => ({
    BankTransactionsToImportPicker: ({onClose}: any) => (
        <div>
            <button
                onClick={() =>
                    onClose({
                        selectedBankTransactions: [{transactionPublicId: 'transaction-1'}],
                        importDecision: {importType: 'custom'},
                    })
                }
            >
                Wybierz własny import
            </button>
            <button
                onClick={() =>
                    onClose({
                        selectedBankTransactions: [{transactionPublicId: 'transaction-1'}],
                        importDecision: {
                            importType: 'billingElement',
                            data: {billingElementType: 'Income'},
                        },
                    })
                }
            >
                Wybierz dochód
            </button>
            <button
                onClick={() =>
                    onClose({
                        selectedBankTransactions: [{transactionPublicId: 'transaction-1'}],
                        importDecision: {
                            importType: 'transfer',
                            data: {},
                        },
                    })
                }
            >
                Wybierz transfer
            </button>
        </div>
    ),
    isBillingElementToCreate: (decision: {importType: string}) => decision.importType === 'billingElement',
    isTransferToCreate: (decision: {importType: string}) => decision.importType === 'transfer',
    isTransactionsToMutuallyCancel: () => false,
    isCustomImport: (decision: {importType: string}) => decision.importType === 'custom',
}));

jest.mock('./CreateBillingElementForm', () => ({
    CreateBillingElementForm: ({onClose}: any) => (
        <div>
            <span>Formularz dochodu</span>
            <button onClick={() => onClose(null)}>Anuluj dochód</button>
        </div>
    ),
}));

jest.mock('./CreateTransferForm', () => ({
    CreateTransferForm: ({onClose}: any) => (
        <div>
            <span>Formularz transferu</span>
            <button onClick={() => onClose(null)}>Anuluj transfer</button>
        </div>
    ),
}));

jest.mock('./CreateCustomImportForm', () => ({
    CreateCustomImportForm: ({onClose}: any) => (
        <div>
            <span>Formularz własnego importu</span>
            <button onClick={() => onClose(null)}>Anuluj własny import</button>
        </div>
    ),
}));

const useQueryMock = useQuery as unknown as jest.Mock;
const useMutationMock = useMutation as unknown as jest.Mock;

describe('BankTransactionsImporter', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        useMutationMock.mockReturnValue([jest.fn()]);
        useQueryMock.mockReturnValue({
            loading: false,
            error: undefined,
            data: {
                bankTransactionsToImport: [{transactionPublicId: 'transaction-1'}],
                financeManagement: {
                    accounts: [],
                    billingCategories: [],
                    piggyBanks: [],
                },
            },
        });
    });

    it('returns to the transaction picker after cancelling a custom import', async () => {
        const user = userEvent.setup();

        render(<BankTransactionsImporter onRefetch={jest.fn().mockResolvedValue(undefined)} />);

        await user.click(screen.getByRole('button', {name: '1 transakcja do zaimportowania'}));
        await user.click(screen.getByRole('button', {name: 'Wybierz własny import'}));

        expect(screen.getByText('Formularz własnego importu')).toBeVisible();
        await user.click(screen.getByRole('button', {name: 'Anuluj własny import'}));

        expect(screen.getByRole('button', {name: 'Wybierz własny import'})).toBeVisible();
        expect(screen.queryByText('Formularz własnego importu')).not.toBeInTheDocument();
    });

    it('returns to the transaction picker after closing an income or expense form', async () => {
        const user = userEvent.setup();

        render(<BankTransactionsImporter onRefetch={jest.fn().mockResolvedValue(undefined)} />);

        await user.click(screen.getByRole('button', {name: '1 transakcja do zaimportowania'}));
        await user.click(screen.getByRole('button', {name: 'Wybierz dochód'}));

        expect(screen.getByText('Formularz dochodu')).toBeVisible();
        await user.keyboard('{Escape}');

        expect(screen.getByRole('button', {name: 'Wybierz dochód'})).toBeVisible();
        expect(screen.queryByText('Formularz dochodu')).not.toBeInTheDocument();
    });

    it('returns to the transaction picker after cancelling a transfer form', async () => {
        const user = userEvent.setup();

        render(<BankTransactionsImporter onRefetch={jest.fn().mockResolvedValue(undefined)} />);

        await user.click(screen.getByRole('button', {name: '1 transakcja do zaimportowania'}));
        await user.click(screen.getByRole('button', {name: 'Wybierz transfer'}));

        expect(screen.getByText('Formularz transferu')).toBeVisible();
        await user.click(screen.getByRole('button', {name: 'Anuluj transfer'}));

        expect(screen.getByRole('button', {name: 'Wybierz transfer'})).toBeVisible();
        expect(screen.queryByText('Formularz transferu')).not.toBeInTheDocument();
    });
});
