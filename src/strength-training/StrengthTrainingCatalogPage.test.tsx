import {useQuery} from '@apollo/client/react';
import {render, screen, waitFor, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {StrengthTrainingCatalogPage} from './StrengthTrainingCatalogPage';
import {uniquePublicIds} from './StrengthTrainingCatalogManagement';

jest.mock('react-router-dom', () => ({
    useNavigate: jest.fn(() => jest.fn()),
    useParams: jest.fn(),
}));

jest.mock('@apollo/client/react', () => ({
    useQuery: jest.fn(),
    useMutation: jest.fn(() => [jest.fn().mockResolvedValue({})]),
}));

const useQueryMock = useQuery as unknown as jest.Mock;
const useMutationMock = jest.requireMock('@apollo/client/react').useMutation as jest.Mock;
const useParamsMock = jest.requireMock('react-router-dom').useParams as jest.Mock;

function latestMutationMock(index: number): jest.Mock {
    return useMutationMock.mock.results[index].value[0];
}

describe('StrengthTrainingCatalogPage', () => {
    beforeEach(() => {
        useMutationMock.mockClear();
        useMutationMock.mockImplementation(() => [jest.fn().mockResolvedValue({})]);
        useParamsMock.mockReturnValue({});
        useQueryMock.mockReturnValue({
            loading: false,
            error: undefined,
            refetch: jest.fn(),
            data: {
                strengthTraining: {
                    exerciseFamilies: [
                        {
                            publicId: 'family-1',
                            name: 'Przysiad',
                            scope: 'SYSTEM',
                            exerciseType: 'WEIGHT_REPS',
                            active: true,
                            dimensions: [
                                {
                                    publicId: 'family-dimension-1',
                                    scope: 'SYSTEM',
                                    position: 1,
                                    required: true,
                                    variantDimension: {publicId: 'dimension-1', name: 'Chwyt'},
                                    allowedValues: [
                                        {
                                            publicId: 'allowed-value-1',
                                            scope: 'DOMAIN',
                                            defaultValue: true,
                                            variantValue: {publicId: 'value-1', name: 'Szeroki'},
                                        },
                                        {
                                            publicId: 'allowed-value-2',
                                            scope: 'SYSTEM',
                                            defaultValue: false,
                                            variantValue: {publicId: 'value-2', name: 'Wąski'},
                                        },
                                    ],
                                },
                            ],
                        },
                    ],
                    variantDimensions: [
                        {
                            publicId: 'dimension-1',
                            name: 'Chwyt',
                            scope: 'SYSTEM',
                            active: true,
                            values: [
                                {
                                    publicId: 'value-1',
                                    name: 'Szeroki',
                                    scope: 'SYSTEM',
                                    active: true,
                                },
                                {
                                    publicId: 'value-2',
                                    name: 'Wąski',
                                    scope: 'SYSTEM',
                                    active: true,
                                },
                            ],
                        },
                        {
                            publicId: 'dimension-2',
                            name: 'Tempo',
                            scope: 'SYSTEM',
                            active: true,
                            values: [],
                        },
                    ],
                },
            },
        });
    });

    it('usuwa powtórzone identyfikatory wartości wariantu przed wysłaniem konfiguracji', () => {
        expect(uniquePublicIds(['value-1', 'value-1', 'value-2', 'value-2'])).toEqual(['value-1', 'value-2']);
    });

    function renderPage(path: string) {
        const page = path.split('/')[3];
        const param1 = path.split('/')[4];
        useParamsMock.mockReturnValue({page, param1});
        return render(<StrengthTrainingCatalogPage />);
    }

    it('wyświetla katalog ćwiczeń i wariantów', () => {
        renderPage('/STRENGTH_TRAINING/domain/catalog');

        expect(screen.getByRole('heading', {name: 'Katalog ćwiczeń'})).toBeInTheDocument();
        expect(screen.getByRole('heading', {name: 'Ćwiczenia'})).toBeInTheDocument();
        expect(screen.getByRole('heading', {name: 'Warianty'})).toBeInTheDocument();
        expect(screen.getByRole('button', {name: 'Konfiguruj warianty ćwiczenia Przysiad'})).toBeInTheDocument();
        expect(screen.getAllByText('Systemowa').length).toBeGreaterThan(0);
        expect(screen.getByText('Ciężar i powtórzenia')).toBeInTheDocument();
    });

    it('wyświetla warianty wybranego ćwiczenia na podstronie', () => {
        const {rerender} = renderPage('/STRENGTH_TRAINING/domain/catalog/family-1');
        const queryResult = useQueryMock.mock.results[0].value;
        queryResult.data.strengthTraining.variantDimensions[0].values.push({
            publicId: 'value-3',
            name: 'Średni',
            scope: 'SYSTEM',
            active: true,
        });
        rerender(<StrengthTrainingCatalogPage />);

        expect(screen.getByRole('heading', {name: 'Warianty'})).toBeInTheDocument();
        expect(screen.getByText('Chwyt')).toBeInTheDocument();
        expect(screen.getAllByText('Systemowa')).toHaveLength(2);
        expect(screen.getByText('Możliwe wartości:')).toBeInTheDocument();
        expect(screen.getByText('Szeroki (domyślna)')).toBeInTheDocument();
        expect(screen.getByText('Wąski')).toBeInTheDocument();
        expect(screen.queryByText('Średni')).not.toBeInTheDocument();
        expect(screen.queryByRole('heading', {name: 'Możliwe wartości wariantów'})).not.toBeInTheDocument();
        expect(screen.getByRole('button', {name: 'Powrót do katalogu'})).toBeInTheDocument();
        expect(screen.queryByRole('heading', {name: 'Ćwiczenia'})).not.toBeInTheDocument();
    });

    it('ustawia następną wolną pozycję i odrzuca zajętą pozycję wariantu', async () => {
        const user = userEvent.setup();
        renderPage('/STRENGTH_TRAINING/domain/catalog/family-1');

        await user.click(screen.getByRole('button', {name: 'Dodaj wariant'}));
        const dialog = screen.getByRole('dialog');
        const positionInput = within(dialog).getByRole('spinbutton', {name: 'Pozycja'});

        expect(within(dialog).queryByRole('textbox', {name: 'Ćwiczenie'})).not.toBeInTheDocument();
        expect(positionInput).toHaveValue(2);

        const variantInput = within(dialog).getByRole('combobox', {name: 'Wariant'});
        await user.click(variantInput);
        expect(screen.getByRole('option', {name: 'Tempo'})).toBeInTheDocument();
        expect(screen.getAllByText('Systemowa').length).toBeGreaterThan(0);
        expect(screen.queryByRole('option', {name: 'Chwyt'})).not.toBeInTheDocument();
        await user.click(screen.getByRole('option', {name: 'Tempo'}));

        await user.clear(positionInput);
        await user.type(positionInput, '1');
        await user.click(within(dialog).getByRole('button', {name: 'Dodaj wariant'}));

        expect(await screen.findByText('Ta pozycja jest już zajęta.')).toBeInTheDocument();
    });

    it('ukrywa przycisk dodawania, gdy wszystkie warianty są przypisane', () => {
        const {rerender} = renderPage('/STRENGTH_TRAINING/domain/catalog/family-1');
        const queryResult = useQueryMock.mock.results[0].value;
        queryResult.data.strengthTraining.exerciseFamilies[0].dimensions.push({
            publicId: 'family-dimension-2',
            position: 2,
            required: false,
            variantDimension: {publicId: 'dimension-2', name: 'Tempo'},
            allowedValues: [],
        });

        rerender(<StrengthTrainingCatalogPage />);

        expect(screen.queryByRole('button', {name: 'Dodaj wariant'})).not.toBeInTheDocument();
    });

    it('otwiera dialog wartości wariantu i pozwala wybrać wartość domyślną', async () => {
        const user = userEvent.setup();
        renderPage('/STRENGTH_TRAINING/domain/catalog/family-1');

        await user.click(screen.getByText('Możliwe wartości:'));
        const dialog = screen.getByRole('dialog');
        expect(within(dialog).getByRole('heading', {name: 'Możliwe wartości wariantu: Chwyt'})).toBeInTheDocument();
        expect(within(dialog).getAllByText('Systemowa')).toHaveLength(2);

        const wideValue = within(dialog).getByRole('checkbox', {name: 'Szeroki'});
        const narrowValue = within(dialog).getByRole('checkbox', {name: 'Wąski'});
        expect(wideValue).toBeChecked();
        expect(wideValue).not.toBeDisabled();
        expect(narrowValue).toBeChecked();
        expect(narrowValue).not.toBeDisabled();
        expect(within(dialog).getAllByRole('checkbox', {name: 'Domyślna'})[0]).toBeChecked();

        await user.click(narrowValue);
        await user.click(narrowValue);
        await user.click(within(dialog).getAllByRole('checkbox', {name: 'Domyślna'})[1]);

        expect(narrowValue).toBeChecked();
        expect(within(dialog).getAllByRole('checkbox', {name: 'Domyślna'})[0]).not.toBeChecked();
        expect(within(dialog).getAllByRole('checkbox', {name: 'Domyślna'})[1]).toBeChecked();

        await user.click(within(dialog).getByRole('button', {name: 'Zapisz'}));
        await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    });

    it('wyświetla wartości wybranego wymiaru wariantu na podstronie', () => {
        renderPage('/STRENGTH_TRAINING/domain/variant-dimensions/dimension-1');

        expect(screen.getByRole('heading', {name: 'Możliwe wartości wariantu'})).toBeInTheDocument();
        expect(screen.getByText('Szeroki')).toBeInTheDocument();
        expect(screen.getByRole('button', {name: 'Powrót do katalogu'})).toBeInTheDocument();
        expect(screen.queryByRole('heading', {name: 'Warianty'})).not.toBeInTheDocument();
    });

    it('nie pozwala dodawać wartości do systemowego wymiaru', () => {
        renderPage('/STRENGTH_TRAINING/domain/variant-dimensions/dimension-1');

        expect(screen.getAllByText('Systemowa').length).toBeGreaterThan(0);
        expect(screen.queryByRole('button', {name: 'Dodaj wartość'})).not.toBeInTheDocument();
    });

    it('pokazuje wszystkie typy ćwiczeń w formularzu', async () => {
        const user = userEvent.setup();
        renderPage('/STRENGTH_TRAINING/domain/catalog');

        await user.click(screen.getByRole('button', {name: 'Dodaj ćwiczenie'}));
        const dialog = screen.getByRole('dialog');
        await user.click(within(dialog).getByRole('combobox', {name: 'Typ ćwiczenia'}));

        expect(screen.getByRole('option', {name: 'Ciężar i powtórzenia'})).toBeInTheDocument();
        expect(screen.getByRole('option', {name: 'Masa ciała i powtórzenia'})).toBeInTheDocument();
        expect(screen.getByRole('option', {name: 'Czas trwania'})).toBeInTheDocument();
        expect(screen.getByRole('option', {name: 'Dystans'})).toBeInTheDocument();
    });

    it('nie wysyła pustej rodziny ćwiczeń i pokazuje błąd walidacji', async () => {
        const user = userEvent.setup();
        renderPage('/STRENGTH_TRAINING/domain/catalog');

        await user.click(screen.getByRole('button', {name: 'Dodaj ćwiczenie'}));
        const dialog = screen.getByRole('dialog');
        await user.click(within(dialog).getByRole('button', {name: 'Dodaj ćwiczenie'}));

        expect(await within(dialog).findByText('Wymagana')).toBeInTheDocument();
        expect(latestMutationMock(0)).not.toHaveBeenCalled();
    });

    it('przekazuje opcjonalność wariantu do mutacji przypisania', async () => {
        const user = userEvent.setup();
        renderPage('/STRENGTH_TRAINING/domain/catalog/family-1');

        await user.click(screen.getByRole('button', {name: 'Dodaj wariant'}));
        const dialog = screen.getByRole('dialog');
        await user.click(within(dialog).getByRole('combobox', {name: 'Wariant'}));
        await user.click(screen.getByRole('option', {name: 'Tempo'}));
        await user.click(within(dialog).getByRole('checkbox', {name: 'Wymagany'}));
        await user.click(within(dialog).getByRole('button', {name: 'Dodaj wariant'}));

        await waitFor(() => expect(latestMutationMock(3)).toHaveBeenCalled());
        expect(latestMutationMock(3)).toHaveBeenCalledWith({
            variables: {
                exerciseFamilyPublicId: 'family-1',
                variantDimensionPublicId: 'dimension-2',
                position: 2,
                required: false,
            },
        });
    });

    it('wysyła wybrane wartości i wartość domyślną oraz odświeża katalog', async () => {
        const user = userEvent.setup();
        renderPage('/STRENGTH_TRAINING/domain/catalog/family-1');
        const queryResult = useQueryMock.mock.results[0].value;

        await user.click(screen.getByText('Możliwe wartości:'));
        const dialog = screen.getByRole('dialog');
        const wideValue = within(dialog).getByRole('checkbox', {name: 'Szeroki'});
        await user.click(wideValue);
        await user.click(within(dialog).getAllByRole('checkbox', {name: 'Domyślna'})[1]);
        await user.click(within(dialog).getByRole('button', {name: 'Zapisz'}));

        const setAllowedMutation = () =>
            useMutationMock.mock.results
                .map(result => result.value[0] as jest.Mock)
                .find(mutation => mutation.mock.calls.length > 0);
        await waitFor(() => expect(setAllowedMutation()).toBeDefined());
        expect(setAllowedMutation()).toHaveBeenCalledWith({
            variables: {
                familyDimensionPublicId: 'family-dimension-1',
                variantValuePublicIds: ['value-2'],
                defaultValuePublicId: 'value-2',
            },
        });
        expect(queryResult.refetch).toHaveBeenCalled();
    });

    it('pokazuje komunikat dla nieistniejącego ćwiczenia i wymiaru', () => {
        const {rerender} = renderPage('/STRENGTH_TRAINING/domain/catalog/missing-family');
        expect(screen.getByText('Nie znaleziono wybranego ćwiczenia.')).toBeInTheDocument();
        expect(screen.getByRole('button', {name: 'Powrót do katalogu'})).toBeInTheDocument();

        useParamsMock.mockReturnValue({page: 'variant-dimensions', param1: 'missing-dimension'});
        rerender(<StrengthTrainingCatalogPage />);
        expect(screen.getByText('Nie znaleziono wybranego wariantu.')).toBeInTheDocument();
    });
});
