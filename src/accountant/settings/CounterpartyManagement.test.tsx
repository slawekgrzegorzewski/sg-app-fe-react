import React from 'react';
import {fireEvent, render, screen, within, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {useQuery, useMutation} from '@apollo/client/react';
import {ClientsManagement} from './ClientsManagement';
import {SuppliersManagement} from './SuppliersManagement';

jest.mock('@apollo/client/react', () => ({useQuery: jest.fn(), useMutation: jest.fn()}));
const save = jest.fn();
const refetch = jest.fn();
beforeEach(() => {
    jest.clearAllMocks();
    save.mockResolvedValue({data: {}});
    refetch.mockResolvedValue({data: {}});
    (useQuery as unknown as jest.Mock).mockReturnValue({
        loading: false, refetch, data: {
            counterparties: [
                {
                    kind: 'CLIENT',
                    publicId: 'client-1',
                    name: 'Klient testowy',
                    address: 'Adres klienta',
                    taxId: '1234567890',
                    active: true
                },
                {
                    kind: 'SUPPLIER',
                    publicId: 'supplier-1',
                    name: 'Dostawca testowy',
                    address: 'Adres dostawcy',
                    taxId: '456',
                    active: true
                },
            ]
        }
    });
    (useMutation as unknown as jest.Mock).mockReturnValue([save, {loading: false, reset: jest.fn()}]);
});

test.each([
    ['CLIENT', ClientsManagement, 'Klienci', 'Dodaj klienta', 'Klient testowy', 'Dostawca testowy'],
    ['SUPPLIER', SuppliersManagement, 'Dostawcy', 'Dodaj dostawcę', 'Dostawca testowy', 'Klient testowy'],
] as const)('manages only %s in its existing company settings section', async (kind, Component, title, addLabel, ownName, otherName) => {
    render(<Component/>);
    expect(screen.getByRole('heading', {name: `${title} (1)`})).toBeInTheDocument();
    expect(screen.getByText(ownName)).toBeInTheDocument();
    expect(screen.queryByText(otherName)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', {name: addLabel}));
    const dialog = screen.getByRole('dialog', {name: addLabel});
    expect(within(dialog).queryByLabelText('Typ kontrahenta')).not.toBeInTheDocument();
    await userEvent.type(within(dialog).getByLabelText(/Nazwa kontrahenta/), 'Nowa firma');
    await userEvent.type(within(dialog).getByLabelText('Adres kontrahenta'), 'Nowy adres');
    const user = userEvent.setup();
    const taxId = within(dialog).getByLabelText('NIP kontrahenta');
    const saveButton = within(dialog).getByRole('button', {name: 'Zapisz kontrahenta'});
    await user.click(saveButton);
    expect(taxId).toHaveAttribute('aria-invalid', 'true');
    await user.click(taxId);
    await user.paste('VAT: ???');
    expect(taxId).toHaveValue('???');
    await user.click(saveButton);
    expect(save).not.toHaveBeenCalled();
    await user.click(taxId);
    await user.clear(taxId);
    await user.paste('VAT: nl123456789b01');
    expect(taxId).toHaveValue('NL123456789B01');
    await user.click(saveButton);
    await waitFor(() => expect(save).toHaveBeenCalledWith({
        variables: {
            publicId: null,
            input: {kind, name: 'Nowa firma', address: 'Nowy adres', taxId: 'NL123456789B01', active: true}
        }
    }));
    expect(refetch).toHaveBeenCalledTimes(1);
});

test('edits full client details and archives without deleting the counterparty', async () => {
    render(<ClientsManagement/>);
    await userEvent.click(screen.getByRole('button', {name: 'Edytuj klienta'}));
    const dialog = screen.getByRole('dialog', {name: 'Edytuj klienta'});
    expect(within(dialog).getByLabelText('Adres kontrahenta')).toHaveValue('Adres klienta');
    await userEvent.clear(within(dialog).getByLabelText('Adres kontrahenta'));
    await userEvent.type(within(dialog).getByLabelText('Adres kontrahenta'), 'Nowy adres');
    await userEvent.click(within(dialog).getByRole('button', {name: 'Zapisz kontrahenta'}));
    await waitFor(() => expect(save).toHaveBeenCalledWith({
        variables: {
            publicId: 'client-1',
            input: {kind: 'CLIENT', name: 'Klient testowy', address: 'Nowy adres', taxId: '1234567890', active: true}
        }
    }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', {name: 'Archiwizuj kontrahenta'}));
    await waitFor(() => expect(save).toHaveBeenLastCalledWith({
        variables: {
            publicId: 'client-1',
            input: {kind: 'CLIENT', name: 'Klient testowy', address: 'Adres klienta', taxId: '1234567890', active: false}
        }
    }));
});

test.each(['DE123456789', 'FRAB123456789', 'ATU12345678', 'CHE-123.456.789 MWST',
    '12-3456789', '12.345.678/0001-95', '001234567890123456', '١٢٣٤٥٦٧٨٩', '1', 'A'.repeat(99) + '1'])(
    'accepts international tax identifier %s', async taxId => {
        render(<ClientsManagement/>);
        await userEvent.click(screen.getByRole('button', {name: 'Dodaj klienta'}));
        const dialog = screen.getByRole('dialog');
        fireEvent.change(within(dialog).getByLabelText(/Nazwa kontrahenta/), {target: {value: 'Firma'}});
        fireEvent.change(within(dialog).getByLabelText('NIP kontrahenta'), {target: {value: taxId}});
        await userEvent.click(within(dialog).getByRole('button', {name: 'Zapisz kontrahenta'}));
        await waitFor(() => expect(save).toHaveBeenCalledWith(expect.objectContaining({variables: {
            publicId: null, input: {kind: 'CLIENT', name: 'Firma', address: '', taxId, active: true},
        }})));
    });

test.each(['', 'ABC', '123!', '12@34', '12--34', '-123', '123/', '12  34', '1'.repeat(101)])(
    'rejects malformed tax identifier %s', async taxId => {
        render(<ClientsManagement/>);
        await userEvent.click(screen.getByRole('button', {name: 'Dodaj klienta'}));
        const dialog = screen.getByRole('dialog');
        fireEvent.change(within(dialog).getByLabelText(/Nazwa kontrahenta/), {target: {value: 'Firma'}});
        const input = within(dialog).getByLabelText('NIP kontrahenta');
        fireEvent.change(input, {target: {value: taxId}});
        await userEvent.click(within(dialog).getByRole('button', {name: 'Zapisz kontrahenta'}));
        expect(input).toHaveAttribute('aria-invalid', 'true');
        expect(save).not.toHaveBeenCalled();
    });

test.each([
    ['967-123-87-85', '9671238785'],
    ['PL967-123-87-85', 'PL9671238785'],
    ['PL 967-123-87-85', 'PL9671238785'],
    ['9671238785', '9671238785'],
    ['NIP: pl 012-345-67-89', 'PL0123456789'],
    ['PL\u00a0967-123-87-85', 'PL9671238785'],
    ['DE 123-456-789', 'DE 123-456-789'],
    ['NL123456789B01', 'NL123456789B01'],
    ['CHE-123.456.789 MWST', 'CHE-123.456.789 MWST'],
    ['12-3456789', '12-3456789'],
    ['PL967-123-87-85!', 'PL967-123-87-85!'],
])('normalizes pasted tax ID %s to %s', async (pasted, expected) => {
    const user = userEvent.setup();
    render(<ClientsManagement/>);
    await user.click(screen.getByRole('button', {name: 'Dodaj klienta'}));
    const input = within(screen.getByRole('dialog')).getByLabelText('NIP kontrahenta');
    await user.click(input);
    await user.paste(pasted);
    expect(input).toHaveValue(expected);
});

test('replaces the selected tax ID with a normalized Polish number', async () => {
    const user = userEvent.setup();
    render(<ClientsManagement/>);
    await user.click(screen.getByRole('button', {name: 'Edytuj klienta'}));
    const input = within(screen.getByRole('dialog')).getByLabelText('NIP kontrahenta') as HTMLInputElement;
    await user.click(input);
    input.setSelectionRange(0, input.value.length);
    await user.paste('PL 967-123-87-85');
    expect(input).toHaveValue('PL9671238785');
});
