import {useQuery} from '@apollo/client/react';
import {render, screen, waitFor, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {LocalizationProvider} from '@mui/x-date-pickers';
import {AdapterDayjs} from '@mui/x-date-pickers/AdapterDayjs';
import {StrengthTrainingPlansPage} from './StrengthTrainingPlansPage';

jest.mock('@apollo/client/react', () => ({
    useQuery: jest.fn(),
    useMutation: jest.fn(() => [jest.fn().mockResolvedValue({})]),
}));

jest.mock('react-router-dom', () => ({
    useLocation: jest.fn(() => ({pathname: '/plans'})),
    useNavigate: jest.fn(() => jest.fn()),
}));

const useQueryMock = useQuery as unknown as jest.Mock;
const useMutationMock = jest.requireMock('@apollo/client/react').useMutation as jest.Mock;

function renderPage() {
    return render(
        <LocalizationProvider dateAdapter={AdapterDayjs}>
            <StrengthTrainingPlansPage />
        </LocalizationProvider>
    );
}

describe('StrengthTrainingPlansPage', () => {
    beforeEach(() => {
        useMutationMock.mockClear();
        useMutationMock.mockImplementation(() => [jest.fn().mockResolvedValue({})]);
        useQueryMock.mockReturnValue({
            loading: false,
            error: undefined,
            refetch: jest.fn().mockResolvedValue(undefined),
            data: {
                strengthTraining: {
                    plans: [
                        {
                            publicId: 'plan-1',
                            name: 'Góra / dół',
                            description: 'Plan testowy',
                            startedAt: '2026-08-01',
                            finishedAt: '2026-08-31',
                            canDelete: true,
                            templates: [
                                {
                                    publicId: 'template-1',
                                    name: 'Góra A',
                                    position: 1,
                                    description: null,
                                },
                            ],
                        },
                        {
                            publicId: 'plan-2',
                            name: 'Plan systemowy',
                            description: null,
                            startedAt: '2026-08-01',
                            finishedAt: null,
                            canDelete: false,
                            templates: [],
                        },
                    ],
                },
            },
        });
    });

    it('wyświetla wszystkie plany i liczbę szablonów', () => {
        renderPage();

        expect(screen.getByRole('heading', {name: 'Plany treningowe'})).toBeInTheDocument();
        expect(screen.getByText('Góra / dół')).toBeInTheDocument();
        expect(screen.getByText('Plan testowy')).toBeInTheDocument();
        expect(screen.getByText(/1 dzień treningowy$/)).toBeInTheDocument();
    });

    it('tworzy plan i odświeża listę', async () => {
        const user = userEvent.setup();
        renderPage();
        const queryResult = useQueryMock.mock.results[0].value;

        await user.click(screen.getByRole('button', {name: 'Dodaj plan'}));
        const dialog = screen.getByRole('dialog', {name: 'Dodaj plan treningowy'});
        await user.type(within(dialog).getByRole('textbox', {name: 'Nazwa'}), 'Nowy plan');
        await user.type(within(dialog).getByRole('textbox', {name: 'Opis'}), 'Opis planu');
        await user.click(within(dialog).getByRole('button', {name: 'Dodaj plan'}));

        const mutation = useMutationMock.mock.results[0].value[0] as jest.Mock;
        await waitFor(() => expect(mutation).toHaveBeenCalled());
        expect(mutation).toHaveBeenCalledWith({
            variables: {
                name: 'Nowy plan',
                description: 'Opis planu',
                startedAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
                finishedAt: null,
            },
        });
        expect(queryResult.refetch).toHaveBeenCalled();
    });

    it('pozwala usunąć tylko plan oznaczony jako możliwy do usunięcia', async () => {
        const user = userEvent.setup();
        renderPage();

        expect(screen.getByRole('button', {name: 'Usuń element 1 z sekcji Plany'})).toBeInTheDocument();
        expect(screen.queryByRole('button', {name: 'Usuń element 2 z sekcji Plany'})).not.toBeInTheDocument();

        await user.click(screen.getByRole('button', {name: 'Usuń element 1 z sekcji Plany'}));
        const dialog = screen.getByRole('dialog', {name: 'Usunąć plan „Góra / dół”?'});
        await user.click(within(dialog).getByRole('button', {name: 'Usuń'}));

        const mutation = useMutationMock.mock.results[1].value[0] as jest.Mock;
        await waitFor(() => expect(mutation).toHaveBeenCalledWith({variables: {publicId: 'plan-1'}}));
        expect(useQueryMock.mock.results[0].value.refetch).toHaveBeenCalled();
    });

    it('edytuje nazwę i opis oraz przekazuje datę zakończenia planu', async () => {
        const user = userEvent.setup();
        renderPage();

        await user.click(screen.getByRole('button', {name: 'Edytuj element 1 w sekcji Plany'}));
        const dialog = screen.getByRole('dialog', {name: 'Edytuj plan treningowy'});
        const name = within(dialog).getByRole('textbox', {name: 'Nazwa'});
        const description = within(dialog).getByRole('textbox', {name: 'Opis'});
        expect(
            within(within(dialog).getByRole('group', {name: 'Początek planu'})).getByRole('spinbutton', {name: 'Year'})
        ).toHaveAttribute('aria-disabled', 'true');
        expect(within(dialog).getByRole('group', {name: 'Koniec planu'})).toBeInTheDocument();
        await user.clear(name);
        await user.type(name, 'Nowa nazwa');
        await user.clear(description);
        await user.type(description, 'Nowy opis');
        await user.click(within(dialog).getByRole('button', {name: 'Zapisz zmiany'}));

        const mutation = useMutationMock.mock.results[2].value[0] as jest.Mock;
        await waitFor(() =>
            expect(mutation).toHaveBeenCalledWith({
                variables: {
                    planPublicId: 'plan-1',
                    name: 'Nowa nazwa',
                    description: 'Nowy opis',
                    finishedAt: '2026-08-31',
                },
            })
        );
        expect(useQueryMock.mock.results[0].value.refetch).toHaveBeenCalled();
    });
});
