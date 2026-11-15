import {fireEvent, render, screen, within} from '@testing-library/react';
import {useMutation, useQuery} from '@apollo/client/react';
import {CfopStage} from '../../types';
import {CubeTrainerPage} from './CubeTrainerPage';

jest.mock('@apollo/client/react', () => ({useQuery: jest.fn(), useMutation: jest.fn()}));
jest.mock('./TrainerCaseThumbnail', () => ({TrainerCaseThumbnail: () => null}));
jest.mock('./TrainerSession', () => ({
    TrainerSession: ({algorithmPublicId, onBusyChange, sidebar}: any) => (
        <>
            <button onClick={() => onBusyChange(true)}>{algorithmPublicId}</button>
            {sidebar}</>
    ),
}));

const cases = [
    {publicId: 'oll1', code: 'OLL-01', name: 'OLL 01', groupName: 'Dot'},
    {publicId: 'oll5', code: 'OLL-05', name: 'OLL 05', groupName: 'Square Shape'},
    {publicId: 'custom', code: 'CUSTOM', name: 'Własny przypadek', groupName: null},
].map(item => ({
    ...item,
    stage: CfopStage.Oll,
    setupAlgorithm: 'R',
    algorithms: [{publicId: `${item.publicId}-a`, name: 'Wariant', sequence: "R'"}],
}));

beforeEach(() => {
    (useQuery as unknown as jest.Mock).mockReturnValue({
        data: {cubeTrainerCases: cases, cubeTrainerAttempts: []},
        loading: false,
        refetch: jest.fn(),
    });
    (useMutation as unknown as jest.Mock).mockReturnValue([jest.fn(), {loading: false}]);
});

function selectOption(
    label: string,
    option: string) {
    fireEvent.mouseDown(screen.getByRole('combobox', {name: label}));
    fireEvent.click(within(screen.getByRole('listbox')).getByRole('option', {name: option}));
}

test('filtruje przypadki według grupy i wybiera jej wariant', () => {
    render(<CubeTrainerPage/>);
    fireEvent.click(screen.getByRole('tab', {name: 'OLL'}));
    selectOption('Grupa przypadków', 'Square Shape');
    expect(screen.getByRole('button', {name: 'oll5-a'})).toBeInTheDocument();
    fireEvent.mouseDown(screen.getByRole('combobox', {name: 'Przypadek'}));
    const menu = within(screen.getByRole('listbox'));
    expect(menu.getByRole('option', {name: 'OLL 05'})).toBeInTheDocument();
    expect(menu.queryByRole('option', {name: 'OLL 01'})).not.toBeInTheDocument();
});

test('obsługuje przypadki bez grupy i resetuje filtr przy zmianie etapu', () => {
    render(<CubeTrainerPage/>);
    fireEvent.click(screen.getByRole('tab', {name: 'OLL'}));
    selectOption('Grupa przypadków', 'Bez grupy');
    expect(screen.getByRole('button', {name: 'custom-a'})).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', {name: 'F2L'}));
    expect(screen.getByRole('combobox', {name: 'Grupa przypadków'})).toHaveTextContent('Wszystkie grupy');
    expect(screen.getByRole('button', {name: 'oll1-a'})).toBeInTheDocument();
});

test('blokuje zmianę grupy podczas próby', () => {
    render(<CubeTrainerPage/>);
    fireEvent.click(screen.getByRole('tab', {name: 'OLL'}));
    fireEvent.click(screen.getByRole('button', {name: 'oll1-a'}));
    expect(screen.getByRole('combobox', {name: 'Grupa przypadków'})).toHaveAttribute('aria-disabled', 'true');
});


test('zachowuje wybraną grupę przy przełączaniu katalogu i historii', () => {
    render(<CubeTrainerPage/>);
    fireEvent.click(screen.getByRole('tab', {name: 'OLL'}));
    selectOption('Grupa przypadków', 'Square Shape');
    fireEvent.click(screen.getByRole('tab', {name: 'Historia (0)'}));
    expect(screen.getByText('Brak zapisanych prób.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', {name: 'Przypadki i algorytmy'}));
    expect(screen.getByRole('combobox', {name: 'Grupa przypadków'})).toHaveTextContent('Square Shape');
    expect(screen.getByRole('button', {name: 'oll5-a'})).toBeInTheDocument();
});
