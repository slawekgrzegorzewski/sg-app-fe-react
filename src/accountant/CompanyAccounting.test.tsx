import React from 'react';
import {fireEvent, render, screen, waitFor, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {useMutation, useQuery} from '@apollo/client/react';
import {CompanyAccounting} from './CompanyAccounting';
import {AccountantSettingsContext} from '../application/components/dispatchers/AccountantDispatcher';
import {AccountingDocumentType, LedgerColumn, CreateAccountingDocument, CreateCompanyLedgerEntry} from '../types';

jest.mock('@apollo/client/react', () => ({useMutation: jest.fn(), useQuery: jest.fn()}));
jest.mock('../application/components/dispatchers/AccountantDispatcher', () => ({
    AccountantSettingsContext: require('react').createContext({accountantSettings: {isCompany: false}}),
}));

const mockEntry = jest.fn();
const mockCreate = jest.fn();
const mockRefetch = jest.fn();
const document = {
    publicId: 'document-1',
    documentNumber: 'INV/1',
    documentDate: '2026-09-01',
    counterparty: 'Example',
    counterpartyAddress: '',
    counterpartyTaxId: '1234567890',
    ksefNumber: '',
    description: 'Services',
    amount: 200,
    currency: 'PLN',
    documentType: AccountingDocumentType.PurchaseVatInvoice,
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
    expect(screen.getByText(/włącz tryb firmowy/)).toBeInTheDocument();
    expect(useQuery).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({skip: true}));
});

test('creates a manual ledger entry with exact decimal input and document reference', async () => {
    renderPage();
    expect(screen.queryByLabelText('Select ledger PDF')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', {name: 'Dodaj wpis do księgi'}));
    const dialog = screen.getByRole('dialog', {name: 'Dodaj wpis do księgi'});
    expect(within(dialog).queryByLabelText(/Kurs do/)).not.toBeInTheDocument();
    fireEvent.change(within(dialog).getByLabelText(/Kwota z dokumentu do ujęcia/), {target: {value: '123.45'}});
    fireEvent.change(within(dialog).getByLabelText('Uwagi'), {target: {value: 'Manual entry'}});
    await userEvent.click(within(dialog).getByRole('button', {name: 'Zapisz wpis'}));
    await waitFor(() => expect(mockEntry).toHaveBeenCalledWith({
        variables: {
            input: expect.objectContaining({
                accountingDocumentPublicId: 'document-1',
                entryOrder: 1,
                includedAmount: '123.45',
                exchangeRate: '1',
                ledgerColumn: LedgerColumn.OtherExpense,
                comments: 'Manual entry',
            })
        },
    }));
    expect(mockRefetch).toHaveBeenCalled();
    expect(await screen.findByText('Dodano wpis do księgi.')).toBeInTheDocument();
});

test('opens document details and creates a document independently', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('button', {name: 'INV/1'}));
    const details = screen.getByRole('dialog', {name: 'Dokument księgowy'});
    expect(within(details).getByText('1234567890')).toBeInTheDocument();
    await userEvent.click(within(details).getByRole('button', {name: /^Zamknij$/}));
    await userEvent.click(await screen.findByRole('button', {name: 'Dodaj dokument księgowy'}));
    const dialog = screen.getByRole('dialog', {name: 'Dodaj dokument księgowy'});
    await userEvent.type(within(dialog).getByLabelText(/Numer dokumentu/i), 'INV/2');
    fireEvent.change(within(dialog).getByLabelText(/Kwota dokumentu/), {target: {value: '200.00'}});
    await userEvent.click(within(dialog).getByRole('button', {name: 'Zapisz dokument'}));
    await waitFor(() => expect(mockCreate).toHaveBeenCalledWith({
        variables: {input: expect.objectContaining({documentNumber: 'INV/2'})},
    }));
});

test('keeps the entry form open and displays a save failure', async () => {
    mockEntry.mockRejectedValue(new Error('Nie udało się zapisać danych'));
    (useMutation as unknown as jest.Mock).mockImplementation(query => [
        query === CreateCompanyLedgerEntry ? mockEntry : mockCreate,
        {
            loading: false,
            reset: jest.fn(),
            error: query === CreateCompanyLedgerEntry ? new Error('Nie udało się zapisać danych') : undefined
        },
    ]);
    renderPage();
    await userEvent.click(screen.getByRole('button', {name: 'Dodaj wpis do księgi'}));
    const dialog = screen.getByRole('dialog', {name: 'Dodaj wpis do księgi'});
    await userEvent.click(within(dialog).getByRole('button', {name: 'Zapisz wpis'}));
    await waitFor(() => expect(mockEntry).toHaveBeenCalled());
    expect(within(dialog).getByText('Nie udało się zapisać danych')).toBeInTheDocument();
    expect(mockRefetch).not.toHaveBeenCalled();
});

test('requires a document before creating ledger entries', () => {
    (useQuery as unknown as jest.Mock).mockReturnValue({
        loading: false, refetch: mockRefetch,
        data: {companyLedger: {entries: []}, companyAccountingDocuments: []},
    });
    renderPage();
    expect(screen.getByRole('button', {name: 'Dodaj wpis do księgi'})).toBeDisabled();
});

test('posts a percentage of a foreign document using the explicit exchange rate', async () => {
    (useQuery as unknown as jest.Mock).mockReturnValue({
        loading: false,
        refetch: mockRefetch,
        data: {
            companyLedger: {entries: []},
            companyAccountingDocuments: [{...document, amount: 100, currency: 'EUR'}],
        },
    });
    renderPage();
    await userEvent.click(screen.getByRole('button', {name: 'Dodaj wpis do księgi'}));
    const dialog = screen.getByRole('dialog', {name: 'Dodaj wpis do księgi'});
    fireEvent.change(within(dialog).getByLabelText(/Część kwoty dokumentu/), {target: {value: '75'}});
    fireEvent.change(within(dialog).getByLabelText(/Kurs do PLN/), {target: {value: '4.30'}});
    expect(within(dialog).getByText(/322,50 PLN/)).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', {name: 'Zapisz wpis'}));
    await waitFor(() => expect(mockEntry).toHaveBeenCalledWith({
        variables: {input: expect.objectContaining({includedAmount: '75.00', exchangeRate: '4.30'})},
    }));
});

test.each([
    [AccountingDocumentType.SalesVatInvoice, 2, false],
    [AccountingDocumentType.PurchaseVatInvoice, 4, true],
])('limits ledger columns and cost fields for document type %s', async (documentType, columnCount, costsVisible) => {
    (useQuery as unknown as jest.Mock).mockReturnValue({
        loading: false,
        refetch: mockRefetch,
        data: {companyLedger: {entries: []}, companyAccountingDocuments: [{...document, documentType}]},
    });
    renderPage();
    await userEvent.click(screen.getByRole('button', {name: 'Dodaj wpis do księgi'}));
    const dialog = screen.getByRole('dialog', {name: 'Dodaj wpis do księgi'});
    expect(within(dialog).queryByRole('combobox', {name: /Rodzaj wpisu/})).not.toBeInTheDocument();
    expect(Boolean(within(dialog).queryByLabelText(/Koszty działalności B\+R/))).toBe(costsVisible);
    expect(Boolean(within(dialog).queryByLabelText('Opis kosztów B+R'))).toBe(costsVisible);
    await userEvent.click(within(dialog).getByRole('combobox', {name: /Kolumna KPiR/}));
    expect(screen.getAllByRole('option')).toHaveLength(columnCount);
    expect(Boolean(screen.queryByRole('option', {name: 'Sprzedaż towarów i usług'}))).toBe(!costsVisible);
    expect(Boolean(screen.queryByRole('option', {name: 'Pozostałe wydatki'}))).toBe(costsVisible);
});

test.each([AccountingDocumentType.Receipt, AccountingDocumentType.Other])(
    'lets users choose the direction for %s and clears hidden cost amounts',
    async documentType => {
        (useQuery as unknown as jest.Mock).mockReturnValue({
            loading: false,
            refetch: mockRefetch,
            data: {companyLedger: {entries: []}, companyAccountingDocuments: [{...document, documentType}]},
        });
        renderPage();
        await userEvent.click(screen.getByRole('button', {name: 'Dodaj wpis do księgi'}));
        const dialog = screen.getByRole('dialog', {name: 'Dodaj wpis do księgi'});
        fireEvent.change(within(dialog).getByLabelText(/Koszty działalności B\+R/), {target: {value: '25'}});
        fireEvent.change(within(dialog).getByLabelText('Opis kosztów B+R'), {target: {value: 'Koszt'}});
        await userEvent.click(within(dialog).getByRole('combobox', {name: /Rodzaj wpisu/}));
        await userEvent.click(screen.getByRole('option', {name: 'Przychód'}));
        expect(within(dialog).queryByLabelText(/Koszty działalności B\+R/)).not.toBeInTheDocument();
        await userEvent.click(within(dialog).getByRole('button', {name: 'Zapisz wpis'}));
        await waitFor(() => expect(mockEntry).toHaveBeenCalledWith({
            variables: {
                input: expect.objectContaining({
                    ledgerColumn: LedgerColumn.Sales,
                    researchAndDevelopmentExpense: '0',
                    researchAndDevelopmentDescription: '',
                })
            },
        }));
    });

test('resets the column and hidden cost fields after selecting a sales document', async () => {
    (useQuery as unknown as jest.Mock).mockReturnValue({
        loading: false,
        refetch: mockRefetch,
        data: {
            companyLedger: {entries: []},
            companyAccountingDocuments: [document, {
                ...document,
                publicId: 'sales-2',
                documentNumber: 'SPR/2',
                documentType: AccountingDocumentType.SalesVatInvoice,
            }],
        },
    });
    renderPage();
    await userEvent.click(screen.getByRole('button', {name: 'Dodaj wpis do księgi'}));
    const dialog = screen.getByRole('dialog', {name: 'Dodaj wpis do księgi'});
    fireEvent.change(within(dialog).getByLabelText(/Koszty działalności B\+R/), {target: {value: '25'}});
    await userEvent.click(within(dialog).getByRole('combobox', {name: /Dokument księgowy/}));
    await userEvent.click(screen.getByRole('option', {name: 'SPR/2'}));
    expect(within(dialog).getByRole('combobox', {name: /Kolumna KPiR/})).toHaveTextContent('Sprzedaż towarów i usług');
    expect(within(dialog).queryByLabelText(/Koszty działalności B\+R/)).not.toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', {name: 'Zapisz wpis'}));
    await waitFor(() => expect(mockEntry).toHaveBeenCalledWith({
        variables: {
            input: expect.objectContaining({
                accountingDocumentPublicId: 'sales-2',
                ledgerColumn: LedgerColumn.Sales,
                researchAndDevelopmentExpense: '0',
            })
        },
    }));
});

test('hides the exchange rate and resets it to one when switching to the ledger currency', async () => {
    (useQuery as unknown as jest.Mock).mockReturnValue({
        loading: false,
        refetch: mockRefetch,
        data: {
            companyLedger: {currency: 'PLN', entries: []},
            companyAccountingDocuments: [
                {...document, currency: 'EUR'},
                {...document, publicId: 'pln-2', documentNumber: 'PLN/2'},
            ],
        },
    });
    renderPage();
    await userEvent.click(screen.getByRole('button', {name: 'Dodaj wpis do księgi'}));
    const dialog = screen.getByRole('dialog', {name: 'Dodaj wpis do księgi'});
    fireEvent.change(within(dialog).getByLabelText(/Kurs do PLN/), {target: {value: '4.30'}});
    await userEvent.click(within(dialog).getByRole('combobox', {name: /Dokument księgowy/}));
    await userEvent.click(screen.getByRole('option', {name: 'PLN/2'}));
    expect(within(dialog).queryByLabelText(/Kurs do/)).not.toBeInTheDocument();
    expect(within(dialog).getByRole('alert')).toHaveTextContent('200,00 PLN');
    await userEvent.click(within(dialog).getByRole('button', {name: 'Zapisz wpis'}));
    await waitFor(() => expect(mockEntry).toHaveBeenCalledWith({
        variables: {input: expect.objectContaining({accountingDocumentPublicId: 'pln-2', exchangeRate: '1'})},
    }));
});
