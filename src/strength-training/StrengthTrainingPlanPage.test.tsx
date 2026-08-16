import {useQuery} from '@apollo/client/react';
import {render, screen, waitFor, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {LocalizationProvider} from '@mui/x-date-pickers';
import {AdapterDayjs} from '@mui/x-date-pickers/AdapterDayjs';
import {StrengthTrainingPlanPage} from './StrengthTrainingPlanPage';

jest.mock('@apollo/client/react', () => ({
    useQuery: jest.fn(),
    useLazyQuery: jest.fn(() => [jest.fn(), {data: undefined, loading: false}]),
    useMutation: jest.fn(() => [jest.fn().mockResolvedValue({})]),
}));

jest.mock('react-router-dom', () => ({
    useNavigate: jest.fn(() => jest.fn()),
    useParams: jest.fn(() => ({param1: 'plan-1'})),
}));

const useQueryMock = useQuery as unknown as jest.Mock;
const useLazyQueryMock = jest.requireMock('@apollo/client/react').useLazyQuery as jest.Mock;
const useMutationMock = jest.requireMock('@apollo/client/react').useMutation as jest.Mock;

describe('StrengthTrainingPlanPage', () => {
    beforeEach(() => {
        useMutationMock.mockClear();
        useMutationMock.mockImplementation(() => [jest.fn().mockResolvedValue({})]);
        useLazyQueryMock.mockClear();
        useLazyQueryMock.mockImplementation(() => [
            jest.fn(),
            {
                data: {
                    strengthTraining: {
                        exercisePresets: [
                            {
                                publicId: 'preset-1',
                                exerciseFamilyPublicId: 'family-1',
                                exerciseFamilyName: 'Przysiad',
                                name: 'Przysiad ze sztangą',
                                variantSignature: '',
                                variantValuePublicIds: [],
                            },
                        ],
                    },
                },
                loading: false,
            },
        ]);
        useQueryMock.mockReturnValue({
            loading: false,
            error: undefined,
            refetch: jest.fn().mockResolvedValue(undefined),
            data: {
                strengthTraining: {
                    exerciseFamilies: [
                        {
                            publicId: 'family-1',
                            name: 'Przysiad',
                            exerciseType: 'WEIGHT_REPS',
                            dimensions: [
                                {
                                    publicId: 'family-dimension-1',
                                    scope: 'SYSTEM',
                                    position: 1,
                                    required: true,
                                    variantDimension: {
                                        publicId: 'dimension-1',
                                        scope: 'SYSTEM',
                                        name: 'Sprzęt',
                                    },
                                    allowedValues: [
                                        {
                                            publicId: 'allowed-value-1',
                                            scope: 'SYSTEM',
                                            defaultValue: false,
                                            variantValue: {
                                                publicId: 'variant-value-1',
                                                scope: 'SYSTEM',
                                                name: 'Hantle',
                                            },
                                        },
                                    ],
                                },
                            ],
                        },
                    ],
                    plans: [
                        {
                            publicId: 'plan-1',
                            name: 'Góra / dół',
                            description: 'Plan testowy',
                            startedAt: '2026-08-01',
                            finishedAt: null,
                            templates: [
                                {
                                    publicId: 'template-1',
                                    name: 'Góra A',
                                    position: 1,
                                    description: 'Pierwszy dzień',
                                    canDelete: true,
                                    exercises: [],
                                },
                                {
                                    publicId: 'template-2',
                                    name: 'Systemowy dzień',
                                    position: 2,
                                    description: null,
                                    canDelete: false,
                                    exercises: [],
                                },
                            ],
                        },
                    ],
                },
            },
        });
    });

    it('wyświetla plan i pozwala dodać dzień treningowy', async () => {
        const user = userEvent.setup();
        render(
            <LocalizationProvider dateAdapter={AdapterDayjs}>
                <StrengthTrainingPlanPage />
            </LocalizationProvider>
        );

        expect(screen.getByRole('heading', {name: 'Góra / dół'})).toBeInTheDocument();
        expect(screen.getByText('Góra A')).toBeInTheDocument();

        await user.click(screen.getByRole('button', {name: 'Dodaj dzień treningowy'}));
        const dialog = screen.getByRole('dialog', {name: 'Dodaj dzień treningowy'});
        await user.type(within(dialog).getByRole('textbox', {name: 'Nazwa'}), 'Dół A');
        await user.type(within(dialog).getByRole('textbox', {name: 'Opis'}), 'Drugi dzień');
        await user.click(within(dialog).getByRole('button', {name: 'Dodaj dzień treningowy'}));

        const mutation = useMutationMock.mock.results[0].value[0] as jest.Mock;
        await waitFor(() =>
            expect(mutation).toHaveBeenCalledWith({
                variables: {
                    planPublicId: 'plan-1',
                    name: 'Dół A',
                    position: 3,
                    description: 'Drugi dzień',
                },
            })
        );
        expect(useQueryMock.mock.results[0].value.refetch).toHaveBeenCalled();
    });

    it('edytuje i usuwa dzień treningowy zgodnie z canDelete', async () => {
        const user = userEvent.setup();
        render(
            <LocalizationProvider dateAdapter={AdapterDayjs}>
                <StrengthTrainingPlanPage />
            </LocalizationProvider>
        );

        expect(screen.getByRole('button', {name: 'Usuń element 1 z sekcji Dni treningowe'})).toBeInTheDocument();
        expect(screen.queryByRole('button', {name: 'Usuń element 2 z sekcji Dni treningowe'})).not.toBeInTheDocument();
        await user.click(screen.getByRole('button', {name: 'Edytuj element 1 w sekcji Dni treningowe'}));
        const editDialog = screen.getByRole('dialog', {name: 'Edytuj dzień treningowy'});
        await user.clear(within(editDialog).getByRole('textbox', {name: 'Nazwa'}));
        await user.type(within(editDialog).getByRole('textbox', {name: 'Nazwa'}), 'Góra B');
        await user.click(within(editDialog).getByRole('button', {name: 'Dodaj ćwiczenie'}));
        await user.click(within(editDialog).getByRole('combobox', {name: 'Ćwiczenie'}));
        await user.click(screen.getByRole('option', {name: /Przysiad ze sztangą/}));
        await user.click(within(editDialog).getByRole('button', {name: 'Zapisz zmiany'}));

        await waitFor(() =>
            expect(useMutationMock.mock.results.some(result => result.value[0].mock.calls.length > 0)).toBe(true)
        );
        const updateMutation = useMutationMock.mock.results
            .map(result => result.value[0] as jest.Mock)
            .find(mutation => mutation.mock.calls.some(call => call[0]?.variables?.templatePublicId === 'template-1'))!;
        expect(updateMutation).toHaveBeenCalledWith({
            variables: {templatePublicId: 'template-1', name: 'Góra B', description: 'Pierwszy dzień'},
        });

        const updateExercisesMutation = useMutationMock.mock.results
            .map(result => result.value[0] as jest.Mock)
            .find(mutation => mutation.mock.calls.some(call => call[0]?.variables?.exercises));
        expect(updateExercisesMutation).toHaveBeenCalledWith({
            variables: {
                templatePublicId: 'template-1',
                exercises: [
                    {
                        exerciseFamilyPublicId: 'family-1',
                        name: 'Przysiad ze sztangą',
                        variantValuePublicIds: [],
                        position: 1,
                        notes: null,
                    },
                ],
            },
        });

        await user.click(screen.getByRole('button', {name: 'Usuń element 1 z sekcji Dni treningowe'}));
        const deleteDialog = screen.getByRole('dialog', {name: 'Usunąć dzień treningowy „Góra A”?'});
        await user.click(within(deleteDialog).getByRole('button', {name: 'Usuń'}));

        const deleteMutation = useMutationMock.mock.results
            .map(result => result.value[0] as jest.Mock)
            .find(mutation => mutation.mock.calls.some(call => call[0]?.variables?.publicId === 'template-1'))!;
        expect(deleteMutation).toHaveBeenCalledWith({variables: {publicId: 'template-1'}});
    });
});
