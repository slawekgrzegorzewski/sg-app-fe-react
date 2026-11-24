import React from 'react';
import {render, screen, within, waitFor} from '@testing-library/react';
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
    await user.paste('NIP: pl 789-12x');
    expect(taxId).toHaveValue('PL78912');
    await user.click(saveButton);
    expect(save).not.toHaveBeenCalled();
    await user.click(taxId);
    await user.paste('-345 67!');
    expect(taxId).toHaveValue('PL7891234567');
    await user.click(saveButton);
    await waitFor(() => expect(save).toHaveBeenCalledWith({
        variables: {
            publicId: null,
            input: {kind, name: 'Nowa firma', address: 'Nowy adres', taxId: 'PL7891234567', active: true}
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
