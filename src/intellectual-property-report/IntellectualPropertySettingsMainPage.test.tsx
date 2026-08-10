import {useMutation, useQuery} from '@apollo/client/react';
import {render, screen, waitFor, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {IntellectualPropertySettingsMainPage} from './IntellectualPropertySettingsMainPage';

jest.mock('@apollo/client/react', () => ({
    useQuery: jest.fn(),
    useMutation: jest.fn(),
}));

const useQueryMock = useQuery as unknown as jest.Mock;
const useMutationMock = useMutation as unknown as jest.Mock;

describe('IntellectualPropertySettingsMainPage', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        useMutationMock.mockReturnValue([
            jest.fn().mockResolvedValue({}),
            {called: false, loading: false, reset: jest.fn()},
        ]);
        useQueryMock.mockReturnValue({
            loading: false,
            error: undefined,
            refetch: jest.fn().mockResolvedValue({}),
            data: {
                allTimeRecordCategories: [
                    {
                        id: 2,
                        name: 'Praca organizacyjna',
                        domain: {publicId: 'domain-1', name: 'Firma'},
                    },
                ],
            },
        });
    });

    it('shows categories in the settings layout', () => {
        render(<IntellectualPropertySettingsMainPage />);

        expect(screen.getByRole('heading', {name: 'Ustawienia raportów'})).toBeVisible();
        expect(screen.getByRole('heading', {name: 'Kategorie raportów czasu'})).toBeVisible();
        expect(screen.getByText('Liczba: 1')).toBeVisible();
        expect(screen.getByText('Praca organizacyjna')).toBeVisible();
        expect(screen.getByRole('button', {name: 'Dodaj kategorię'})).toBeVisible();
    });

    it('opens and closes the category dialog with Escape', async () => {
        const user = userEvent.setup();
        render(<IntellectualPropertySettingsMainPage />);

        await user.click(screen.getByRole('button', {name: 'Dodaj kategorię'}));

        const dialog = screen.getByRole('dialog', {name: 'Dodaj kategorię raportu czasu'});
        expect(within(dialog).getByRole('textbox', {name: 'Nazwa kategorii'})).toBeVisible();

        await user.keyboard('{Escape}');

        await waitFor(() =>
            expect(screen.queryByRole('dialog', {name: 'Dodaj kategorię raportu czasu'})).not.toBeInTheDocument()
        );
    });
});
