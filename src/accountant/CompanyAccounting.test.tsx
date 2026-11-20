import React from 'react';
import {fireEvent, render, screen, waitFor, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {useMutation, useQuery} from '@apollo/client/react';
import {CompanyAccounting} from './CompanyAccounting';
import {AccountantSettingsContext} from '../application/components/dispatchers/AccountantDispatcher';
import {CreateAccountingDocument, CreateCompanyLedgerEntry} from '../types';

jest.mock('@apollo/client/react', () => ({useMutation: jest.fn(), useQuery: jest.fn()}));
jest.mock('../application/components/dispatchers/AccountantDispatcher', () => ({
    AccountantSettingsContext: require('react').createContext({accountantSettings: {isCompany: false}}),
}));

const mockEntry = jest.fn();
const mockCreate = jest.fn();
const mockRefetch = jest.fn();
const document = {
    publicId: 'document-1', documentNumber: 'INV/1', documentDate: '2026-09-01',
    counterparty: 'Example', counterpartyAddress: '', counterpartyTaxId: '1234567890',
    ksefNumber: '', description: 'Services',
};

function renderPage(isCompany = true) {
    return render(
        <AccountantSettingsContext.Provider value={{accountantSettings: {isCompany}, refreshSettings: jest.fn()}}>
            <CompanyAccounting/>
        </AccountantSettingsContext.Provider>
    );
}

beforeEach(() => {
    jest.clearAllMocks();
    (useQuery as unknown as jest.Mock).mockReturnValue({
        loading: false, refetch: mockRefetch,
        data: {companyLedger: {yearMonth: '2026-09', entries: []}, companyAccountingDocuments: [document]},
    });
    (useMutation as unknown as jest.Mock).mockImplementation(query => [
        query === CreateCompanyLedgerEntry ? mockEntry : query === CreateAccountingDocument ? mockCreate : jest.fn(),
        {loading: false, reset: jest.fn()},
    ]);
    mockEntry.mockResolvedValue({data: {createCompanyLedgerEntry: {publicId: 'entry-1'}}});
    mockCreate.mockResolvedValue({data: {createAccountingDocument: document}});
});

test('blocks company data requests when company mode is disabled', () => {
    renderPage(false);
    expect(screen.getByText(/Enable company accounting/)).toBeInTheDocument();
    expect(useQuery).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({skip: true}));
});

test('creates a manual ledger entry with exact decimal input and document reference', async () => {
    renderPage();
    expect(screen.queryByLabelText('Select ledger PDF')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', {name: 'Add ledger entry'}));
    const dialog = screen.getByRole('dialog', {name: 'Add ledger entry'});
    fireEvent.change(within(dialog).getByLabelText(/Other income/), {target: {value: '123.45'}});
    fireEvent.change(within(dialog).getByLabelText('Comments'), {target: {value: 'Manual entry'}});
    await userEvent.click(within(dialog).getByRole('button', {name: 'Create ledger entry'}));
    await waitFor(() => expect(mockEntry).toHaveBeenCalledWith({
        variables: {
            input: expect.objectContaining({
                accountingDocumentPublicId: 'document-1',
                entryOrder: 1,
                otherIncome: '123.45',
                comments: 'Manual entry',
            })
        },
    }));
    expect(mockRefetch).toHaveBeenCalled();
    expect(await screen.findByText('Ledger entry created.')).toBeInTheDocument();
});

test('opens document details and creates a document independently', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('button', {name: 'INV/1'}));
    const details = screen.getByRole('dialog', {name: 'Accounting document'});
    expect(within(details).getByText('1234567890')).toBeInTheDocument();
    await userEvent.click(within(details).getByRole('button', {name: /^Close$/}));
    await userEvent.click(await screen.findByRole('button', {name: 'Create accounting document'}));
    const dialog = screen.getByRole('dialog', {name: 'Create accounting document'});
    await userEvent.type(within(dialog).getByLabelText(/Document number/i), 'INV/2');
    await userEvent.click(within(dialog).getByRole('button', {name: 'Create document'}));
    await waitFor(() => expect(mockCreate).toHaveBeenCalledWith({
        variables: {input: expect.objectContaining({documentNumber: 'INV/2'})},
    }));
});

test('keeps the entry form open and displays a save failure', async () => {
    mockEntry.mockRejectedValue(new Error('Save failed'));
    (useMutation as unknown as jest.Mock).mockImplementation(query => [
        query === CreateCompanyLedgerEntry ? mockEntry : mockCreate,
        {
            loading: false,
            reset: jest.fn(),
            error: query === CreateCompanyLedgerEntry ? new Error('Save failed') : undefined
        },
    ]);
    renderPage();
    await userEvent.click(screen.getByRole('button', {name: 'Add ledger entry'}));
    const dialog = screen.getByRole('dialog', {name: 'Add ledger entry'});
    await userEvent.click(within(dialog).getByRole('button', {name: 'Create ledger entry'}));
    await waitFor(() => expect(mockEntry).toHaveBeenCalled());
    expect(within(dialog).getByText('Save failed')).toBeInTheDocument();
    expect(mockRefetch).not.toHaveBeenCalled();
});

test('requires a document before creating ledger entries', () => {
    (useQuery as unknown as jest.Mock).mockReturnValue({
        loading: false, refetch: mockRefetch,
        data: {companyLedger: {entries: []}, companyAccountingDocuments: []},
    });
    renderPage();
    expect(screen.getByRole('button', {name: 'Add ledger entry'})).toBeDisabled();
});
