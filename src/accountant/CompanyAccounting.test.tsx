import React from 'react';
import {fireEvent, render, screen, waitFor, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {useApolloClient, useMutation, useQuery} from '@apollo/client/react';
import {CompanyAccounting} from './CompanyAccounting';
import {AccountantSettingsContext} from '../application/components/dispatchers/AccountantDispatcher';
import {
    AccountingDocumentType,
    CreateAccountingDocument,
    SaveCounterpartyWithConflict,
    CreateCompanyLedgerEntry,
    UpdateCompanyLedgerEntry,
    UpdateAccountingDocument,
    UploadAccountingDocumentAttachment,
    DownloadAccountingDocumentAttachment,
    DeleteAccountingDocumentAttachment,
    CreateCounterpartyFromDocument,
    LedgerCalculationStrategyType,
    LedgerColumn
} from '../types';

jest.mock('./KsefImportPanel', () => ({KsefImportPanel: () => null}));

jest.mock('@apollo/client/react', () => ({useApolloClient: jest.fn(), useMutation: jest.fn(), useQuery: jest.fn()}));
jest.mock('../application/components/dispatchers/AccountantDispatcher', () => ({
    AccountantSettingsContext: require('react').createContext({accountantSettings: {isCompany: false}}),
}));

const mockEntry = jest.fn();
const mockUpdate = jest.fn();
const mockUpdateDocument = jest.fn();
const mockCreate = jest.fn();
const mockCounterpartySave = jest.fn();
const mockRefetch = jest.fn();
const strategies = [
    {
        publicId: 'full',
        name: 'Kwota netto',
        strategyType: LedgerCalculationStrategyType.NetAndVatPercentage,
        parameters: {
            __typename: 'NetAndVatPercentageParameters',
            strategyType: LedgerCalculationStrategyType.NetAndVatPercentage,
            costPercentage: 100,
            deductibleVatPercentage: 100
        }
    },
    {
        publicId: 'net-vat',
        name: 'Eksploatacja auta w środkach trwałych — użytek mieszany (odliczenie 50% VAT)',
        parameters: {
            __typename: 'NetAndVatPercentageParameters',
            strategyType: LedgerCalculationStrategyType.NetAndVatPercentage,
            costPercentage: 75,
            deductibleVatPercentage: 50
        },
        strategyType: LedgerCalculationStrategyType.NetAndVatPercentage
    },
];
const document = {
    postedToLedger: false,
    publicId: 'document-1',
    documentNumber: 'INV/1',
    documentDate: '2026-09-01',
    counterparty: 'Example',
    counterpartyAddress: '',
    counterpartyTaxId: '1234567890',
    ksefNumber: '',
    description: 'Services',
    amount: 200,
    netAmount: 200,
    vatAmount: 0,
    currency: 'PLN',
    documentType: AccountingDocumentType.PurchaseVatInvoice,
};

function renderPage(isCompany = true) {
    const result = (useQuery as unknown as jest.Mock)();
    if (result?.data && !result.data.companyLedgerAvailableDocuments) {
        (useQuery as unknown as jest.Mock).mockReturnValue({...result, data: {...result.data,
            companyLedgerAvailableDocuments: result.data.companyAccountingDocuments ?? [],
        }});
    }
    return render(
        <AccountantSettingsContext.Provider value={{accountantSettings: {isCompany}, refreshSettings: jest.fn()}}>
            <CompanyAccounting/>
        </AccountantSettingsContext.Provider>
    );
}

beforeEach(() => {
    jest.clearAllMocks();
    (useApolloClient as unknown as jest.Mock).mockReturnValue({query: jest.fn()});
    (useQuery as unknown as jest.Mock).mockReturnValue({
        loading: false, refetch: mockRefetch,
        data: {
            ledgerCalculationStrategies: strategies,
            companyLedger: {nextEntryOrder: 18, yearMonth: '2026-09', entries: []},
            companyAccountingDocuments: [document]
        },
    });
    (useMutation as unknown as jest.Mock).mockImplementation(query => [
        query === SaveCounterpartyWithConflict ? mockCounterpartySave : query === UpdateAccountingDocument ? mockUpdateDocument : query === UpdateCompanyLedgerEntry ? mockUpdate : query === CreateCompanyLedgerEntry ? mockEntry : query === CreateAccountingDocument ? mockCreate : jest.fn(),
        {loading: false, reset: jest.fn()},
    ]);
    mockUpdate.mockResolvedValue({data: {updateCompanyLedgerEntry: {publicId: 'entry-1'}}});
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
    fireEvent.change(within(dialog).getByLabelText('Uwagi'), {target: {value: 'Manual entry'}});
    await userEvent.click(within(dialog).getByRole('button', {name: 'Zapisz wpis'}));
    await waitFor(() => expect(mockEntry).toHaveBeenCalledWith({
        variables: {
            input: expect.objectContaining({
                accountingDocumentPublicId: 'document-1',
                entryOrder: 18,
                calculationStrategyPublicId: 'full',
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
    fireEvent.change(within(dialog).getByLabelText(/Kwota netto/), {target: {value: '200.00'}});
    fireEvent.change(within(dialog).getByLabelText(/Kwota VAT/), {target: {value: '46.00'}});
    await userEvent.click(within(dialog).getByRole('button', {name: 'Zapisz dokument'}));
    await waitFor(() => expect(mockCreate).toHaveBeenCalledWith({
        variables: {input: expect.objectContaining({documentNumber: 'INV/2', netAmount: '200.00', vatAmount: '46.00'})},
    }));
});

test('keeps the entry form open and displays a save failure', async () => {
    mockEntry.mockRejectedValue(new Error('Nie udało się zapisać danych'));
    (useMutation as unknown as jest.Mock).mockImplementation(query => [
        query === UpdateAccountingDocument ? mockUpdateDocument : query === UpdateCompanyLedgerEntry ? mockUpdate : query === CreateCompanyLedgerEntry ? mockEntry : mockCreate,
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
        data: {ledgerCalculationStrategies: strategies, companyLedger: {nextEntryOrder: 1, entries: []}, companyAccountingDocuments: []},
    });
    renderPage();
    expect(screen.getByRole('button', {name: 'Dodaj wpis do księgi'})).toBeDisabled();
});

test('posts a percentage of a foreign document using the explicit exchange rate', async () => {
    (useQuery as unknown as jest.Mock).mockReturnValue({
        loading: false,
        refetch: mockRefetch,
        data: {
            ledgerCalculationStrategies: strategies, companyLedger: {nextEntryOrder: 1, entries: []},
            companyAccountingDocuments: [{...document, amount: 100, netAmount: 100, currency: 'EUR'}],
        },
    });
    renderPage();
    await userEvent.click(screen.getByRole('button', {name: 'Dodaj wpis do księgi'}));
    const dialog = screen.getByRole('dialog', {name: 'Dodaj wpis do księgi'});
    await userEvent.click(within(dialog).getByRole('combobox', {name: /Strategia przeliczenia/}));
    await userEvent.click(screen.getByRole('option', {name: 'Eksploatacja auta w środkach trwałych — użytek mieszany (odliczenie 50% VAT)'}));
    fireEvent.change(within(dialog).getByLabelText(/Kurs do PLN/), {target: {value: '4.30'}});
    expect(within(dialog).getByText(/322,50 PLN/)).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', {name: 'Zapisz wpis'}));
    await waitFor(() => expect(mockEntry).toHaveBeenCalledWith({
        variables: {
            input: expect.objectContaining({
                calculationStrategyPublicId: 'net-vat',
                exchangeRate: '4.30'
            })
        },
    }));
});

test.each([
    [AccountingDocumentType.SalesVatInvoice, 2, false],
    [AccountingDocumentType.PurchaseVatInvoice, 4, true],
    [AccountingDocumentType.Zus, 4, true],
    [AccountingDocumentType.InsurancePolicy, 4, true],
])('limits ledger columns and cost fields for document type %s', async (documentType, columnCount, costsVisible) => {
    (useQuery as unknown as jest.Mock).mockReturnValue({
        loading: false,
        refetch: mockRefetch,
        data: {
            ledgerCalculationStrategies: strategies,
            companyLedger: {nextEntryOrder: 1, entries: []},
            companyAccountingDocuments: [{...document, documentType}]
        },
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

test.each([AccountingDocumentType.Receipt, AccountingDocumentType.OtherExpense])(
    'lets users choose the direction for %s and clears hidden cost amounts',
    async documentType => {
        (useQuery as unknown as jest.Mock).mockReturnValue({
            loading: false,
            refetch: mockRefetch,
            data: {
                ledgerCalculationStrategies: strategies,
                companyLedger: {nextEntryOrder: 1, entries: []},
                companyAccountingDocuments: [{...document, documentType}]
            },
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
            ledgerCalculationStrategies: strategies, companyLedger: {nextEntryOrder: 1, entries: []},
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
    await userEvent.click(screen.getByRole('option', {name: /^SPR\/2 ·/}));
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
            ledgerCalculationStrategies: strategies, companyLedger: {nextEntryOrder: 1, currency: 'PLN', entries: []},
            companyAccountingDocuments: [
                {...document, currency: 'EUR'},
                {...document, publicId: 'pln-2', documentNumber: 'PLN/2'},
            ],
        },
    });
    renderPage();
    await userEvent.click(screen.getByRole('button', {name: 'Dodaj wpis do księgi'}));
    const dialog = screen.getByRole('dialog', {name: 'Dodaj wpis do księgi'});
    await userEvent.click(within(dialog).getByRole('combobox', {name: /Strategia przeliczenia/}));
    await userEvent.click(screen.getByRole('option', {name: 'Eksploatacja auta w środkach trwałych — użytek mieszany (odliczenie 50% VAT)'}));
    fireEvent.change(within(dialog).getByLabelText(/Kurs do PLN/), {target: {value: '4.30'}});
    await userEvent.click(within(dialog).getByRole('combobox', {name: /Dokument księgowy/}));
    await userEvent.click(screen.getByRole('option', {name: /^PLN\/2 ·/}));
    expect(within(dialog).queryByLabelText(/Kurs do/)).not.toBeInTheDocument();
    expect(within(dialog).getByRole('alert')).toHaveTextContent('150,00 PLN');
    await userEvent.click(within(dialog).getByRole('button', {name: 'Zapisz wpis'}));
    await waitFor(() => expect(mockEntry).toHaveBeenCalledWith({
        variables: {input: expect.objectContaining({accountingDocumentPublicId: 'pln-2', exchangeRate: '1'})},
    }));
});

test('previews mixed use car costs and submits the selected strategy without client amounts', async () => {
    (useQuery as unknown as jest.Mock).mockReturnValue({
        loading: false, refetch: mockRefetch,
        data: {
            ledgerCalculationStrategies: strategies,
            companyLedger: {nextEntryOrder: 1, entries: []},
            companyAccountingDocuments: [{...document, netAmount: 100, vatAmount: 23, amount: 123}]
        }
    });
    renderPage();
    await userEvent.click(screen.getByRole('button', {name: 'Dodaj wpis do księgi'}));
    const dialog = screen.getByRole('dialog', {name: 'Dodaj wpis do księgi'});
    expect(within(dialog).getByRole('alert')).toHaveTextContent('100,00 PLN');
    await userEvent.click(within(dialog).getByRole('combobox', {name: /Strategia przeliczenia/}));
    await userEvent.click(screen.getByRole('option', {name: 'Eksploatacja auta w środkach trwałych — użytek mieszany (odliczenie 50% VAT)'}));
    expect(within(dialog).getByRole('alert')).toHaveTextContent('83,63 PLN');
    await userEvent.click(within(dialog).getByRole('button', {name: 'Zapisz wpis'}));
    await waitFor(() => expect(mockEntry).toHaveBeenCalledWith({
        variables: {
            input: expect.objectContaining({
                calculationStrategyPublicId: 'net-vat',
                exchangeRate: '1'
            })
        }
    }));
    expect(mockEntry.mock.calls[0][0].variables.input).not.toHaveProperty('includedAmount');
    expect(mockEntry.mock.calls[0][0].variables.input).not.toHaveProperty('costPercentage');
    expect(mockEntry.mock.calls[0][0].variables.input).not.toHaveProperty('deductibleVatPercentage');
});

test.each([
    [23.01, '11,50', '11,51', '111,51', '83,63'],
    [23.05, '11,52', '11,53', '111,53', '83,65'],
    [-23.05, '-11,52', '-11,53', '-111,53', '-83,65'],
])('splits VAT %s into full cents before calculating mixed use car costs', async (vat, deductible, nonDeductible, basis, cost) => {
    const net = vat < 0 ? -100 : 100;
    (useQuery as unknown as jest.Mock).mockReturnValue({
        loading: false,
        refetch: mockRefetch,
        data: {
            ledgerCalculationStrategies: strategies,
            companyLedger: {nextEntryOrder: 1, entries: []},
            companyAccountingDocuments: [{...document, netAmount: net, vatAmount: vat, amount: net + vat}]
        }
    });
    renderPage();
    await userEvent.click(screen.getByRole('button', {name: 'Dodaj wpis do księgi'}));
    const dialog = screen.getByRole('dialog', {name: 'Dodaj wpis do księgi'});
    await userEvent.click(within(dialog).getByRole('combobox', {name: /Strategia przeliczenia/}));
    await userEvent.click(screen.getByRole('option', {name: 'Eksploatacja auta w środkach trwałych — użytek mieszany (odliczenie 50% VAT)'}));
    expect(within(dialog).getByText(`VAT do odliczenia: ${deductible} PLN`)).toBeInTheDocument();
    expect(within(dialog).getByText(`VAT nieodliczony: ${nonDeductible} PLN`)).toBeInTheDocument();
    expect(within(dialog).getByText(`Podstawa kosztu (netto + VAT nieodliczony): ${basis} PLN`)).toBeInTheDocument();
    expect(within(dialog).getByRole('alert')).toHaveTextContent(`${cost} PLN`);
});

test('blocks posting documents without net and VAT amounts', async () => {
    (useQuery as unknown as jest.Mock).mockReturnValue({
        loading: false, refetch: mockRefetch,
        data: {
            ledgerCalculationStrategies: strategies,
            companyLedger: {nextEntryOrder: 1, entries: []},
            companyAccountingDocuments: [{...document, netAmount: null, vatAmount: null}]
        }
    });
    renderPage();
    await userEvent.click(screen.getByRole('button', {name: 'Dodaj wpis do księgi'}));
    expect(screen.getByText(/Dokument historyczny nie ma podziału/)).toBeInTheDocument();
    expect(screen.getByRole('button', {name: 'Zapisz wpis'})).toBeDisabled();
});

test('shows fixed cost and VAT deduction parameters and switches previews', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('button', {name: 'Dodaj wpis do księgi'}));
    expect(screen.queryByLabelText(/Część kwoty/)).not.toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('200,00 PLN');
    await userEvent.click(screen.getByRole('combobox', {name: /Strategia przeliczenia/}));
    await userEvent.click(screen.getByRole('option', {name: 'Eksploatacja auta w środkach trwałych — użytek mieszany (odliczenie 50% VAT)'}));
    expect(screen.getByText('Koszt: 75% · Odliczenie VAT: 50%')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('150,00 PLN');
});

test('blocks entries when the system strategy catalog is empty', () => {
    (useQuery as unknown as jest.Mock).mockReturnValue({
        loading: false, refetch: mockRefetch,
        data: {ledgerCalculationStrategies: [], companyLedger: {nextEntryOrder: 1, entries: []}, companyAccountingDocuments: [document]}
    });
    renderPage();
    expect(screen.getByText(/Brak dostępnych strategii/)).toBeInTheDocument();
    expect(screen.getByRole('button', {name: 'Dodaj wpis do księgi'})).toBeDisabled();
});

test('blocks a strategy with an unsupported parameter variant', async () => {
    (useQuery as unknown as jest.Mock).mockReturnValue({
        loading: false, refetch: mockRefetch,
        data: {
            ledgerCalculationStrategies: [{
                publicId: 'future',
                name: 'Przyszła strategia',
                parameters: {__typename: 'FutureParameters', value: 10}
            }], companyLedger: {nextEntryOrder: 1, entries: []}, companyAccountingDocuments: [document]
        }
    });
    renderPage();
    await userEvent.click(screen.getByRole('button', {name: 'Dodaj wpis do księgi'}));
    expect(screen.getByText('Ten typ strategii nie jest obsługiwany przez formularz.')).toBeInTheDocument();
    expect(screen.getByRole('button', {name: 'Zapisz wpis'})).toBeDisabled();
    expect(screen.queryByText(/Netto × procent netto/)).not.toBeInTheDocument();
});

test('blocks posting a document already included in another month while preserving its details', async () => {
    (useQuery as unknown as jest.Mock).mockReturnValue({
        loading: false,
        refetch: mockRefetch,
        data: {
            ledgerCalculationStrategies: strategies,
            companyLedger: {nextEntryOrder: 1, yearMonth: '2026-09', entries: []},
            companyAccountingDocuments: [{...document, postedToLedger: true}],
        },
    });
    renderPage();
    expect(screen.getByRole('button', {name: 'Dodaj wpis do księgi'})).toBeDisabled();
    expect(screen.getByText('Wszystkie dokumenty z tego miesiąca są już ujęte w KPiR.')).toBeInTheDocument();
    expect(screen.getByText(/Ujęty w KPiR/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', {name: 'INV/1'}));
    expect(screen.getByRole('dialog', {name: 'Dokument księgowy'})).toBeInTheDocument();
    expect(mockEntry).not.toHaveBeenCalled();
});

test('offers only unposted documents and selects the first available document', async () => {
    (useQuery as unknown as jest.Mock).mockReturnValue({
        loading: false,
        refetch: mockRefetch,
        data: {
            ledgerCalculationStrategies: strategies,
            companyLedger: {nextEntryOrder: 1, yearMonth: '2026-09', entries: []},
            companyAccountingDocuments: [
                {...document, postedToLedger: true},
                {...document, publicId: 'document-2', documentNumber: 'INV/2'},
            ],
        },
    });
    renderPage();
    await userEvent.click(screen.getByRole('button', {name: 'Dodaj wpis do księgi'}));
    const dialog = screen.getByRole('dialog', {name: 'Dodaj wpis do księgi'});
    await userEvent.click(within(dialog).getByRole('combobox', {name: /Dokument księgowy/}));
    expect(screen.getByRole('option', {name: /^INV\/2 ·/})).toBeInTheDocument();
    expect(screen.queryByRole('option', {name: /^INV\/1 ·/})).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('option', {name: /^INV\/2 ·/}));
    await userEvent.click(within(dialog).getByRole('button', {name: 'Zapisz wpis'}));
    expect(mockEntry).toHaveBeenCalledWith({variables: {input: expect.objectContaining({accountingDocumentPublicId: 'document-2'})}});
});

test('disables saving when a document becomes posted while the form is open', async () => {
    const {rerender} = renderPage();
    await userEvent.click(screen.getByRole('button', {name: 'Dodaj wpis do księgi'}));
    (useQuery as unknown as jest.Mock).mockReturnValue({
        loading: false,
        refetch: mockRefetch,
        data: {
            ledgerCalculationStrategies: strategies,
            companyLedger: {nextEntryOrder: 1, yearMonth: '2026-09', entries: []},
            companyAccountingDocuments: [{...document, postedToLedger: true}],
            companyLedgerAvailableDocuments: [],
        },
    });
    rerender(
        <AccountantSettingsContext.Provider value={{accountantSettings: {isCompany: true}, refreshSettings: jest.fn()}}>
            <CompanyAccounting/>
        </AccountantSettingsContext.Provider>
    );
    const dialog = screen.getByRole('dialog', {name: 'Dodaj wpis do księgi'});
    expect(within(dialog).getByText('Ten dokument nie jest już dostępny do wpisu w KPiR. Wybierz inny dokument.')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', {name: 'Zapisz wpis'})).toBeDisabled();
    expect(mockEntry).not.toHaveBeenCalled();
});


test.each([
    [AccountingDocumentType.Zus, 'ZUS'],
    [AccountingDocumentType.InsurancePolicy, 'Polisa'],
])('creates expense document %s with net and VAT amounts', async (documentType, label) => {
    renderPage();
    expect(screen.queryByRole('button', {name: 'Dodaj wpis bez dokumentu'})).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', {name: 'Dodaj dokument księgowy'}));
    const dialog = screen.getByRole('dialog', {name: 'Dodaj dokument księgowy'});
    await userEvent.click(within(dialog).getByRole('combobox', {name: /Rodzaj dokumentu/}));
    await userEvent.click(screen.getByRole('option', {name: label}));
    await userEvent.type(within(dialog).getByLabelText(/Numer dokumentu/), 'DOC/11/2026');
    fireEvent.change(within(dialog).getByLabelText(/Kwota netto/), {target: {value: '100.00'}});
    fireEvent.change(within(dialog).getByLabelText(/Kwota VAT/), {target: {value: '0.00'}});
    await userEvent.click(within(dialog).getByRole('button', {name: 'Zapisz dokument'}));
    await waitFor(() => expect(mockCreate).toHaveBeenCalledWith({
        variables: {input: expect.objectContaining({documentType, netAmount: '100.00', vatAmount: '0.00'})},
    }));
});


test('selects catalog counterparty and allows editing its document snapshot', async () => {
    (useQuery as unknown as jest.Mock).mockReturnValue({loading: false, refetch: mockRefetch, data: {
        companyLedger: {nextEntryOrder: 1, entries: []}, companyAccountingDocuments: [document], ledgerCalculationStrategies: strategies,
        counterparties: [{kind: 'SUPPLIER', publicId: 'party-1', name: 'Firma katalogowa', address: 'Adres katalogowy', taxId: '123', active: true}],
    }});
    renderPage();
    await userEvent.click(screen.getByRole('button', {name: 'Dodaj dokument księgowy'}));
    const dialog = screen.getByRole('dialog', {name: 'Dodaj dokument księgowy'});
    await userEvent.click(within(dialog).getByRole('combobox', {name: /Kontrahent z katalogu/}));
    await userEvent.click(screen.getByRole('option', {name: /Firma katalogowa/}));
    expect(within(dialog).getByLabelText('Kontrahent')).toHaveValue('Firma katalogowa');
    expect(within(dialog).getByLabelText('Adres kontrahenta')).toHaveValue('Adres katalogowy');
    await userEvent.clear(within(dialog).getByLabelText('Kontrahent'));
    await userEvent.type(within(dialog).getByLabelText('Kontrahent'), 'Nazwa na dokumencie');
    await userEvent.type(within(dialog).getByLabelText(/Numer dokumentu/), 'FV/1');
    fireEvent.change(within(dialog).getByLabelText(/Kwota netto/), {target: {value: '100'}});
    fireEvent.change(within(dialog).getByLabelText(/Kwota VAT/), {target: {value: '0'}});
    await userEvent.click(within(dialog).getByRole('button', {name: 'Zapisz dokument'}));
    await waitFor(() => expect(mockCreate).toHaveBeenCalledWith({variables: {input: expect.objectContaining({counterpartyPublicId: 'party-1', counterparty: 'Nazwa na dokumencie', counterpartyAddress: 'Adres katalogowy', counterpartyTaxId: '123'})}}));
});

test.each([AccountingDocumentType.PurchaseVatInvoice, AccountingDocumentType.OtherExpense])(
        'creates a supplier from a %s document', async documentType => {
    const result = (useQuery as unknown as jest.Mock)();
    (useQuery as unknown as jest.Mock).mockReturnValue(
            {...result, data: {...result.data, companyAccountingDocuments: [{...document, documentType}]}});
    const from = jest.fn().mockResolvedValue({data: {createCounterpartyFromDocument: {publicId: 'party-2'}}});
    (useMutation as unknown as jest.Mock).mockImplementation(query => [query === CreateCounterpartyFromDocument ? from : mockCreate, {loading: false, reset: jest.fn()}]);
    renderPage();
    expect(screen.queryByRole('button', {name: 'Dodaj kontrahenta'})).not.toBeInTheDocument();
    await userEvent.click(await screen.findByRole('button', {name: 'INV/1'}));
    const dialog = screen.getByRole('dialog', {name: 'Dokument księgowy'});
    await userEvent.click(within(dialog).getByRole('button', {name: 'Utwórz kontrahenta z dokumentu'}));
    await waitFor(() => expect(from).toHaveBeenCalledWith({variables: {documentPublicId: 'document-1', kind: 'SUPPLIER'}}));
    expect(await within(dialog).findByText(/Dokument jest powiązany/)).toBeInTheDocument();
});


test.each([
    [AccountingDocumentType.SalesVatInvoice, 'Faktura VAT sprzedaży'],
    [AccountingDocumentType.OtherIncome, 'Inny dokument przychodowy'],
])('filters clients and clears the supplier link when switching to %s', async (
        documentType,
        label) => {
    const queryResult = (useQuery as unknown as jest.Mock)();
    (useQuery as unknown as jest.Mock).mockReturnValue({...queryResult, data: {...queryResult.data,
        counterparties: [
            {kind: 'CLIENT', publicId: 'client-1', name: 'Klient testowy', address: 'Adres klienta', taxId: '1', active: true},
            {kind: 'SUPPLIER', publicId: 'supplier-1', name: 'Dostawca testowy', address: 'Adres dostawcy', taxId: '2', active: true},
        ],
    }});
    renderPage();
    await userEvent.click(screen.getByRole('button', {name: 'Dodaj dokument księgowy'}));
    const dialog = screen.getByRole('dialog');
    await userEvent.click(within(dialog).getByRole('combobox', {name: /Kontrahent z katalogu/}));
    expect(screen.queryByRole('option', {name: /Klient testowy/})).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('option', {name: /Dostawca testowy/}));
    await userEvent.click(within(dialog).getByRole('combobox', {name: /Rodzaj dokumentu/}));
    await userEvent.click(screen.getByRole('option', {name: label}));
    expect(within(dialog).getByRole('combobox', {name: /Kontrahent z katalogu/})).toHaveTextContent('Dane ręczne');
    expect(within(dialog).getByLabelText('Kontrahent')).toHaveValue('Dostawca testowy');
    await userEvent.click(within(dialog).getByRole('combobox', {name: /Kontrahent z katalogu/}));
    expect(screen.queryByRole('option', {name: /Dostawca testowy/})).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('option', {name: /Klient testowy/}));
    expect(within(dialog).getByLabelText('Kontrahent')).toHaveValue('Klient testowy');
    await userEvent.type(within(dialog).getByLabelText(/Numer dokumentu/), 'SPRZ/1');
    fireEvent.change(within(dialog).getByLabelText(/Kwota netto/), {target: {value: '100'}});
    fireEvent.change(within(dialog).getByLabelText(/Kwota VAT/), {target: {value: '23'}});
    await userEvent.click(within(dialog).getByRole('button', {name: 'Zapisz dokument'}));
    await waitFor(() => expect(mockCreate).toHaveBeenCalledWith({variables: {input: expect.objectContaining({counterpartyPublicId: 'client-1', documentType})}}));
});

test.each([AccountingDocumentType.SalesVatInvoice, AccountingDocumentType.OtherIncome])(
        'creates a client from a %s document', async documentType => {
    const queryResult = (useQuery as unknown as jest.Mock)();
    (useQuery as unknown as jest.Mock).mockReturnValue({...queryResult, data: {...queryResult.data,
        companyAccountingDocuments: [{...document, documentType}],
    }});
    const from = jest.fn().mockResolvedValue({data: {createCounterpartyFromDocument: {publicId: 'client-1'}}});
    (useMutation as unknown as jest.Mock).mockImplementation(query => [query === CreateCounterpartyFromDocument ? from : mockCreate, {loading: false, reset: jest.fn()}]);
    renderPage();
    await userEvent.click(screen.getByRole('button', {name: 'INV/1'}));
    const dialog = screen.getByRole('dialog', {name: 'Dokument księgowy'});
    expect(within(dialog).queryByLabelText('Typ kontrahenta z dokumentu')).not.toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', {name: 'Utwórz kontrahenta z dokumentu'}));
    await waitFor(() => expect(from).toHaveBeenCalledWith({variables: {documentPublicId: 'document-1', kind: 'CLIENT'}}));
});


test('overrides the strategy amount before currency conversion and submits it explicitly', async () => {
    const queryResult = (useQuery as unknown as jest.Mock)();
    (useQuery as unknown as jest.Mock).mockReturnValue({...queryResult, data: {...queryResult.data,
        companyAccountingDocuments: [{...document, currency: 'EUR'}],
    }});
    renderPage();
    await userEvent.click(screen.getByRole('button', {name: 'Dodaj wpis do księgi'}));
    const dialog = screen.getByRole('dialog', {name: 'Dodaj wpis do księgi'});
    fireEvent.change(within(dialog).getByLabelText(/Kurs do PLN/), {target: {value: '4.30'}});
    fireEvent.change(within(dialog).getByLabelText('Kwota po nadpisaniu (EUR)'), {target: {value: '90.01'}});
    expect(within(dialog).getByRole('alert')).toHaveTextContent('387,04 PLN');
    await userEvent.click(within(dialog).getByRole('button', {name: 'Zapisz wpis'}));
    await waitFor(() => expect(mockEntry).toHaveBeenCalledWith({variables: {input: expect.objectContaining({amountOverride: '90.01', exchangeRate: '4.30'})}}));
});

test.each(['0', '-0.01'])('allows a manual amount of %s and clearing restores the strategy result', async value => {
    renderPage();
    await userEvent.click(screen.getByRole('button', {name: 'Dodaj wpis do księgi'}));
    const dialog = screen.getByRole('dialog', {name: 'Dodaj wpis do księgi'});
    const input = within(dialog).getByLabelText('Kwota po nadpisaniu (PLN)');
    fireEvent.change(input, {target: {value}});
    expect(within(dialog).getByRole('button', {name: 'Zapisz wpis'})).toBeEnabled();
    expect(within(dialog).getByRole('alert')).toHaveTextContent(value === '0' ? '0,00 PLN' : '-0,01 PLN');
    fireEvent.change(input, {target: {value: ''}});
    expect(within(dialog).getByRole('alert')).toHaveTextContent('200,00 PLN');
    await userEvent.click(within(dialog).getByRole('button', {name: 'Zapisz wpis'}));
    await waitFor(() => expect(mockEntry.mock.calls[0][0].variables.input.amountOverride).toBeNull());
});

test.each(['1.001', '100000000000000000'])('blocks an invalid manual amount: %s', async value => {
    renderPage();
    await userEvent.click(screen.getByRole('button', {name: 'Dodaj wpis do księgi'}));
    const dialog = screen.getByRole('dialog', {name: 'Dodaj wpis do księgi'});
    fireEvent.change(within(dialog).getByLabelText('Kwota po nadpisaniu (PLN)'), {target: {value}});
    expect(within(dialog).getByRole('button', {name: 'Zapisz wpis'})).toBeDisabled();
    expect(within(dialog).getByText(/Kwota może mieć maksymalnie/)).toBeInTheDocument();
    expect(mockEntry).not.toHaveBeenCalled();
});

test('clears the manual override after changing the strategy or document', async () => {
    const queryResult = (useQuery as unknown as jest.Mock)();
    (useQuery as unknown as jest.Mock).mockReturnValue({...queryResult, data: {...queryResult.data,
        companyAccountingDocuments: [document, {...document, publicId: 'document-2', documentNumber: 'INV/2'}],
    }});
    renderPage();
    await userEvent.click(screen.getByRole('button', {name: 'Dodaj wpis do księgi'}));
    const dialog = screen.getByRole('dialog', {name: 'Dodaj wpis do księgi'});
    const input = within(dialog).getByLabelText('Kwota po nadpisaniu (PLN)');
    fireEvent.change(input, {target: {value: '90'}});
    await userEvent.click(within(dialog).getByRole('combobox', {name: /Strategia przeliczenia/}));
    await userEvent.click(screen.getByRole('option', {name: /Eksploatacja auta/}));
    expect(input).toHaveValue(null);
    expect(within(dialog).getByRole('alert')).toHaveTextContent('150,00 PLN');
    fireEvent.change(input, {target: {value: '90'}});
    await userEvent.click(within(dialog).getByRole('combobox', {name: /Dokument księgowy/}));
    await userEvent.click(screen.getByRole('option', {name: /^INV\/2 ·/}));
    expect(input).toHaveValue(null);
    expect(within(dialog).getByRole('alert')).toHaveTextContent('150,00 PLN');
});


test('normalizes trailing zeros in the manual amount before submission', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('button', {name: 'Dodaj wpis do księgi'}));
    const dialog = screen.getByRole('dialog', {name: 'Dodaj wpis do księgi'});
    fireEvent.change(within(dialog).getByLabelText('Kwota po nadpisaniu (PLN)'), {target: {value: '1.000'}});
    await userEvent.click(within(dialog).getByRole('button', {name: 'Zapisz wpis'}));
    await waitFor(() => expect(mockEntry.mock.calls[0][0].variables.input.amountOverride).toBe('1.00'));
});


test('posts an unposted document from a previous year into the selected ledger month', async () => {
    const result = (useQuery as unknown as jest.Mock)();
    (useQuery as unknown as jest.Mock).mockReturnValue({...result, data: {...result.data,
        companyAccountingDocuments: [],
        companyLedgerAvailableDocuments: [{...document, publicId: 'older-document', documentNumber: 'OLD/1', documentDate: '2025-12-15'}],
    }});
    renderPage();
    await userEvent.click(screen.getByRole('button', {name: 'Dodaj wpis do księgi'}));
    const dialog = screen.getByRole('dialog', {name: 'Dodaj wpis do księgi'});
    expect(within(dialog).getByRole('combobox', {name: 'Dokument księgowy'})).toHaveTextContent('OLD/1 · 15.12.2025');
    const date = within(dialog).getByLabelText(/Data zdarzenia/);
    expect(date).not.toHaveAttribute('min');
    expect(date).toHaveValue('2025-12-15');
    fireEvent.change(date, {target: {value: '2025-12-20'}});
    await userEvent.click(within(dialog).getByRole('button', {name: 'Zapisz wpis'}));
    await waitFor(() => expect(mockEntry).toHaveBeenCalledWith({variables: {input: expect.objectContaining({accountingDocumentPublicId: 'older-document', entryDate: '2025-12-20', ledgerMonth: expect.stringMatching(/^\d{4}-\d{2}$/)})}}));
});


test('edits a posted entry without creating a duplicate and preserves its original amount', async () => {
    const result = (useQuery as unknown as jest.Mock)();
    (useQuery as unknown as jest.Mock).mockReturnValue({...result, data: {...result.data,
        companyLedgerAvailableDocuments: [],
        companyLedger: {nextEntryOrder: 1, yearMonth: '2026-11', entries: [{
            publicId: 'entry-1', calculationStrategyPublicId: 'full', accountingDocument: {...document, postedToLedger: true},
            includedAmount: 88.25, exchangeRate: 1, ledgerColumn: LedgerColumn.OtherExpense,
            entryOrder: 1, entryDate: '2025-12-20', comments: 'Przed zmianą',
        }]},
    }});
    renderPage();
    await userEvent.click(screen.getByRole('button', {name: 'Edytuj wpis'}));
    const dialog = screen.getByRole('dialog', {name: 'Edytuj wpis KPiR'});
    expect(within(dialog).getByRole('combobox', {name: 'Dokument księgowy'})).toHaveAttribute('aria-disabled', 'true');
    expect(within(dialog).getByLabelText('Kwota po nadpisaniu (PLN)')).toHaveValue(88.25);
    fireEvent.change(within(dialog).getByLabelText('Uwagi'), {target: {value: 'Po zmianie'}});
    await userEvent.click(within(dialog).getByRole('button', {name: 'Zapisz zmiany'}));
    await waitFor(() => expect(mockUpdate).toHaveBeenCalledWith({variables: {
        publicId: 'entry-1', input: expect.objectContaining({amountOverride: '88.25', comments: 'Po zmianie', entryDate: '2025-12-20'}),
    }}));
    expect(mockEntry).not.toHaveBeenCalled();
    expect(mockRefetch).toHaveBeenCalled();
});


test('shows monthly and year-to-date totals even when the selected month has no entries', () => {
    const result = (useQuery as unknown as jest.Mock)();
    const zero = {providedGoodsAndServicesValue: 0, otherIncome: 0, totalIncome: 0, purchasedGoodsAndMaterialsValue: 0, additionalCostOfPurchase: 0, remunerationInCashOrInKind: 0, otherExpense: 0, totalExpense: 0, additionalColumnValue: 0, researchAndDevelopmentExpense: 0};
    (useQuery as unknown as jest.Mock).mockReturnValue({...result, data: {...result.data,
        companyLedger: {nextEntryOrder: 1, yearMonth: '2026-11', entries: [], monthSummary: zero,
            yearToDateSummary: {...zero, providedGoodsAndServicesValue: 123.45, totalIncome: 123.45, otherExpense: -0.01, totalExpense: -0.01}},
    }});
    renderPage();
    const monthly = screen.getByRole('row', {name: /Podsumowanie miesiąca/});
    expect(within(monthly).getAllByRole('cell')).toHaveLength(11);
    const yearly = screen.getByRole('row', {name: /Podsumowanie od początku roku/});
    expect(yearly).toHaveTextContent('123,45');
    expect(yearly).toHaveTextContent('-0,01');
    expect(screen.getByText(/Brak wpisów w tym miesiącu/)).toBeInTheDocument();
});

test('edits an existing document and submits only its input fields', async () => {
    mockUpdateDocument.mockResolvedValue({data: {updateAccountingDocument: document}});
    renderPage();
    await userEvent.click(screen.getByRole('button', {name: 'INV/1'}));
    await userEvent.click(screen.getByRole('button', {name: 'Edytuj dokument'}));
    const dialog = screen.getByRole('dialog', {name: 'Edytuj dokument księgowy'});
    expect(within(dialog).getByLabelText(/Numer dokumentu/)).toHaveValue('INV/1');
    fireEvent.change(within(dialog).getByLabelText(/Kwota netto/), {target: {value: '123.45'}});
    fireEvent.change(within(dialog).getByLabelText('Opis'), {target: {value: 'Poprawiony opis'}});
    await userEvent.click(within(dialog).getByRole('button', {name: 'Zapisz zmiany dokumentu'}));
    await waitFor(() => expect(mockUpdateDocument).toHaveBeenCalledWith({variables: {
        publicId: 'document-1',
        input: {
            counterpartyPublicId: null,
            documentType: document.documentType,
            documentNumber: document.documentNumber,
            documentDate: document.documentDate,
            netAmount: '123.45', vatAmount: 0, currency: 'PLN',
            counterparty: document.counterparty, counterpartyAddress: '', counterpartyTaxId: document.counterpartyTaxId,
            ksefNumber: '', description: 'Poprawiony opis',
        },
    }}));
    expect(mockCreate).not.toHaveBeenCalled();
    expect(mockRefetch).toHaveBeenCalled();
});

test('locks type and currency of a posted document but allows correcting its amounts', async () => {
    const result = (useQuery as unknown as jest.Mock)();
    (useQuery as unknown as jest.Mock).mockReturnValue({...result, data: {...result.data,
        companyAccountingDocuments: [{...document, postedToLedger: true}],
    }});
    renderPage();
    await userEvent.click(screen.getByRole('button', {name: 'INV/1'}));
    await userEvent.click(screen.getByRole('button', {name: 'Edytuj dokument'}));
    const dialog = screen.getByRole('dialog', {name: 'Edytuj dokument księgowy'});
    expect(within(dialog).getByLabelText(/Waluta dokumentu/)).toBeDisabled();
    expect(within(dialog).getByLabelText(/Kwota netto/)).toBeEnabled();
    expect(within(dialog).getByText(/Edycja nie przelicza zapisanego wpisu/)).toBeInTheDocument();
});

test('cancelling document changes restores details without saving', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('button', {name: 'INV/1'}));
    await userEvent.click(screen.getByRole('button', {name: 'Edytuj dokument'}));
    const dialog = screen.getByRole('dialog', {name: 'Edytuj dokument księgowy'});
    fireEvent.change(within(dialog).getByLabelText(/Numer dokumentu/), {target: {value: 'Nie zapisuj'}});
    await userEvent.click(within(dialog).getByRole('button', {name: 'Anuluj'}));
    await screen.findByRole('button', {name: 'Edytuj dokument'});
    expect(mockUpdateDocument).not.toHaveBeenCalled();
});

test('adds and removes a PDF in the saved document details', async () => {
    const upload = jest.fn().mockResolvedValue({data: {uploadAccountingDocumentAttachment: 'invoice.pdf'}});
    const remove = jest.fn().mockResolvedValue({data: {deleteAccountingDocumentAttachment: true}});
    const mutation = useMutation as unknown as jest.Mock;
    const fallback = mutation.getMockImplementation()!;
    mutation.mockImplementation(
            query => {
                if (query === UploadAccountingDocumentAttachment) {
                    return [upload];
                }
                if (query === DeleteAccountingDocumentAttachment) {
                    return [remove];
                }
                return fallback(query);
            });

    renderPage();
    await userEvent.click(
            screen.getByRole('button', {name: 'INV/1'}));
    const details = within(
            screen.getByRole('dialog', {name: 'Dokument księgowy'}));
    const input = details.getByLabelText('Wybierz plik PDF');
    expect(details.getByText('Brak załącznika PDF.')).toBeInTheDocument();
    fireEvent.change(
            input,
            {target: {files: [new File(['text'], 'invoice.txt')]}});
    expect(details.getByRole('alert')).toHaveTextContent('Wybierz plik PDF');
    expect(upload).not.toHaveBeenCalled();

    const file = new File(
            ['%PDF-1.7'],
            'invoice.pdf',
            {type: 'application/pdf'});
    fireEvent.change(
            input,
            {target: {files: [file]}});
    expect(upload).toHaveBeenCalledWith({variables: {publicId: 'document-1', file}});
    expect(await details.findByText('invoice.pdf')).toBeInTheDocument();
    await userEvent.click(
            details.getByRole('button', {name: 'Usuń PDF'}));
    const confirmation = within(
            screen.getByRole('dialog', {name: 'Usunąć załącznik PDF?'}));
    await userEvent.click(
            confirmation.getByRole('button', {name: 'Usuń'}));
    expect(remove).toHaveBeenCalledWith({variables: {publicId: 'document-1'}});
    expect(await details.findByText('Brak załącznika PDF.')).toBeInTheDocument();
});


describe.each(['create', 'edit'])('tax ID paste in document %s form', mode => {
    test.each([
        ['PL967-123-87-85', 'PL9671238785'],
        ['967-123-87-85', '9671238785'],
        ['PL 967-123-87-85', 'PL9671238785'],
        ['NL123456789B01', 'NL123456789B01'],
        ['CHE-123.456.789', 'CHE-123.456.789'],
    ])('saves pasted %s as %s', async (
            pasted,
            expected) => {
        const user = userEvent.setup();
        renderPage();
        if (mode === 'edit') {
            await user.click(
                    screen.getByRole('button', {name: 'INV/1'}));
            await user.click(
                    screen.getByRole('button', {name: 'Edytuj dokument'}));
        } else {
            await user.click(
                    screen.getByRole('button', {name: 'Dodaj dokument księgowy'}));
        }
        const dialog = screen.getByRole(
                'dialog',
                {name: mode === 'edit' ? 'Edytuj dokument księgowy' : 'Dodaj dokument księgowy'});
        if (mode === 'create') {
            await user.type(
                    within(dialog).getByLabelText(/Numer dokumentu/),
                    'INV/2');
            fireEvent.change(
                    within(dialog).getByLabelText(/Kwota netto/),
                    {target: {value: '100'}});
            fireEvent.change(
                    within(dialog).getByLabelText(/Kwota VAT/),
                    {target: {value: '23'}});
        }
        const input = within(dialog).getByLabelText('NIP kontrahenta') as HTMLInputElement;
        await user.click(input);
        input.select();
        await user.paste(pasted);
        expect(input).toHaveValue(expected);
        await user.click(
                within(dialog).getByRole(
                        'button',
                        {name: mode === 'edit' ? 'Zapisz zmiany dokumentu' : 'Zapisz dokument'}));
        await waitFor(
                () => expect(mode === 'edit' ? mockUpdateDocument : mockCreate).toHaveBeenCalledWith(
                        expect.objectContaining(
                                {variables: expect.objectContaining(
                                        {input: expect.objectContaining({counterpartyTaxId: expected})})})));
    });
});



test.each(['typing', 'paste', 'editing'])('uses the local supplier after %s a matching NIP', async method => {
    const supplier = {
        publicId: 'supplier-by-nip',
        kind: 'SUPPLIER',
        name: 'Dostawca z katalogu',
        address: 'Adres z katalogu',
        taxId: 'PL5260250274',
        active: true,
    };
    const result = (useQuery as unknown as jest.Mock)();
    (useQuery as unknown as jest.Mock).mockReturnValue({
        ...result,
        data: {
            ...result.data,
            companyAccountingDocuments: [{...document, counterpartyPublicId: 'previous-supplier'}],
            counterparties: [
                supplier,
                {...supplier, publicId: 'previous-supplier', name: document.counterparty,
                    address: document.counterpartyAddress, taxId: document.counterpartyTaxId},
            ],
        },
    });
    renderPage();
    const user = userEvent.setup();
    if (method === 'editing') {
        await user.click(
                screen.getByRole('button', {name: 'INV/1'}));
        await user.click(
                screen.getByRole('button', {name: 'Edytuj dokument'}));
    } else {
        await user.click(
                screen.getByRole('button', {name: 'Dodaj dokument księgowy'}));
    }
    const form = within(
            screen.getByRole('dialog', {
                name: method === 'editing' ? 'Edytuj dokument księgowy' : 'Dodaj dokument księgowy',
            }));
    const input = form.getByLabelText('NIP kontrahenta');
    if (method === 'editing') {
        await user.clear(input);
    }
    if (method === 'paste') {
        await user.click(input);
        await user.paste('NIP: PL 526-025-02-74');
    } else {
        await user.type(input, '526-025-02-74');
    }
    expect(form.getByLabelText('Kontrahent')).toHaveValue(supplier.name);
    expect(form.getByLabelText('Adres kontrahenta')).toHaveValue(supplier.address);
    expect(form.getByRole('combobox', {name: 'Kontrahent z katalogu'})).toHaveTextContent(supplier.name);
    expect(form.queryByRole('button', {name: /Pobierz z Wykazu/})).not.toBeInTheDocument();

    await user.clear(input);
    expect(form.getByLabelText('Kontrahent')).toHaveValue('');
});

test.each(['create', 'edit'])('fills %s document counterparty details after an explicit registry lookup', async mode => {
    const originalFetch = global.fetch;
    const fetchRegistry = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
            result: {subject: {nip: '5260250274', name: 'Podmiot z wykazu', workingAddress: 'Adres z wykazu'}},
        }),
    });
    global.fetch = fetchRegistry;
    try {
        renderPage();
        if (mode === 'edit') {
            await userEvent.click(
                    screen.getByRole('button', {name: 'INV/1'}));
            await userEvent.click(
                    screen.getByRole('button', {name: 'Edytuj dokument'}));
        } else {
            await userEvent.click(
                    screen.getByRole('button', {name: 'Dodaj dokument księgowy'}));
        }
        const form = within(
                screen.getByRole('dialog', {name: mode === 'edit' ? 'Edytuj dokument księgowy' : 'Dodaj dokument księgowy'}));
        const input = form.getByLabelText('NIP kontrahenta');
        fireEvent.change(input, {target: {value: 'PL 526-025-02-74'}});
        expect(fetchRegistry).not.toHaveBeenCalled();
        const lookupButton = form.getByRole('button', {name: /Pobierz z Wykazu/});
        await userEvent.click(input);
        await userEvent.tab();
        expect(lookupButton).toHaveFocus();
        await userEvent.click(lookupButton);
        expect(form.getByLabelText('Kontrahent')).toHaveValue('Podmiot z wykazu');
        expect(form.getByLabelText('Adres kontrahenta')).toHaveValue('Adres z wykazu');
        expect(fetchRegistry).toHaveBeenCalledTimes(1);
        expect(mockCreate).not.toHaveBeenCalled();
        expect(mockUpdateDocument).not.toHaveBeenCalled();
        expect(mockCounterpartySave).not.toHaveBeenCalled();
    } finally {
        global.fetch = originalFetch;
    }
});

test('shows the attachment name and explicit status for each document without downloading files', () => {
    const result = (useQuery as unknown as jest.Mock)();
    (useQuery as unknown as jest.Mock).mockReturnValue(
            {
                ...result,
                data: {...result.data, companyAccountingDocuments: [
                    {...document, attachmentFileName: 'faktura.pdf'},
                    {...document, publicId: 'document-2', documentNumber: 'INV/2', attachmentFileName: null},
                ]},
            });
    renderPage();
    const attached = within(
            screen.getByRole('region', {name: 'Załącznik dokumentu INV/1'}));
    expect(attached.getByText('PDF załączony')).toBeInTheDocument();
    expect(attached.getByRole('button', {name: 'Pobierz PDF: faktura.pdf'})).toBeInTheDocument();
    const missing = within(
            screen.getByRole('region', {name: 'Załącznik dokumentu INV/2'}));
    expect(missing.getByText('Brak załącznika')).toBeInTheDocument();
    expect(missing.queryByRole('button')).not.toBeInTheDocument();
    expect((useApolloClient as jest.Mock)().query).not.toHaveBeenCalled();
});

test('downloads the selected document attachment on demand and displays a recoverable error', async () => {
    const result = (useQuery as unknown as jest.Mock)();
    (useQuery as unknown as jest.Mock).mockReturnValue(
            {
                ...result,
                data: {...result.data, companyAccountingDocuments: [{...document, attachmentFileName: 'faktura.pdf'}]},
            });
    const query = jest.fn().mockRejectedValue(new Error('Unavailable'));
    (useApolloClient as unknown as jest.Mock).mockReturnValue({query});
    renderPage();
    await userEvent.click(
            screen.getByRole('button', {name: 'Pobierz PDF: faktura.pdf'}));
    expect(query).toHaveBeenCalledWith({
        query: DownloadAccountingDocumentAttachment,
        variables: {publicId: 'document-1'},
        fetchPolicy: 'no-cache',
    });
    expect(await screen.findByRole('alert')).toHaveTextContent('Nie udało się pobrać pliku PDF.');
    expect(screen.getByRole('button', {name: 'Pobierz PDF: faktura.pdf'})).toBeEnabled();
});


test('posts an other income document to other income and hides expense columns', async () => {
    const result = (useQuery as unknown as jest.Mock)();
    (useQuery as unknown as jest.Mock).mockReturnValue(
            {...result, data: {...result.data, companyAccountingDocuments: [
                {...document, documentType: AccountingDocumentType.OtherIncome},
            ]}});
    renderPage();
    await userEvent.click(
            screen.getByRole('button', {name: 'Dodaj wpis do księgi'}));
    const dialog = within(
            screen.getByRole('dialog', {name: 'Dodaj wpis do księgi'}));
    expect(dialog.queryByLabelText('Rodzaj wpisu')).not.toBeInTheDocument();
    expect(dialog.getByRole('combobox', {name: 'Kolumna KPiR'})).toHaveTextContent('Pozostałe przychody');
    await userEvent.click(
            dialog.getByRole('combobox', {name: 'Kolumna KPiR'}));
    expect(screen.queryByRole('option', {name: 'Pozostałe wydatki'})).not.toBeInTheDocument();
    await userEvent.click(
            screen.getByRole('option', {name: 'Pozostałe przychody'}));
    await userEvent.click(
            dialog.getByRole('button', {name: 'Zapisz wpis'}));
    await waitFor(
            () => expect(mockEntry).toHaveBeenCalledWith(
                    {variables: {input: expect.objectContaining({ledgerColumn: LedgerColumn.OtherIncome})}}));
});


test('offers only clients when editing an other income document', async () => {
    const result = (useQuery as unknown as jest.Mock)();
    (useQuery as unknown as jest.Mock).mockReturnValue(
            {...result, data: {...result.data,
                companyAccountingDocuments: [{...document, documentType: AccountingDocumentType.OtherIncome}],
                counterparties: [
                    {kind: 'CLIENT', publicId: 'client-1', name: 'Klient', address: '', taxId: '1', active: true},
                    {kind: 'SUPPLIER', publicId: 'supplier-1', name: 'Dostawca', address: '', taxId: '2', active: true},
                ],
            }});
    renderPage();
    await userEvent.click(
            screen.getByRole('button', {name: 'INV/1'}));
    await userEvent.click(
            screen.getByRole('button', {name: 'Edytuj dokument'}));
    const dialog = within(
            screen.getByRole('dialog', {name: 'Edytuj dokument księgowy'}));
    await userEvent.click(
            dialog.getByRole('combobox', {name: 'Kontrahent z katalogu'}));
    expect(screen.queryByRole('option', {name: /Dostawca/})).not.toBeInTheDocument();
    await userEvent.click(
            screen.getByRole('option', {name: /Klient ·/}));
    await userEvent.click(
            dialog.getByRole('button', {name: 'Zapisz zmiany dokumentu'}));
    await waitFor(
            () => expect(mockUpdateDocument).toHaveBeenCalledWith(
                    {variables: {publicId: 'document-1', input: expect.objectContaining({
                        counterpartyPublicId: 'client-1', documentType: AccountingDocumentType.OtherIncome,
                    })}}));
});


test.each(['create', 'edit'])('offers only suppliers for other expense in %s form', async mode => {
    const result = (useQuery as unknown as jest.Mock)();
    (useQuery as unknown as jest.Mock).mockReturnValue(
            {...result, data: {...result.data,
                companyAccountingDocuments: [{...document, documentType: AccountingDocumentType.OtherExpense}],
                counterparties: [
                    {kind: 'CLIENT', publicId: 'client-1', name: 'Klient', address: '', taxId: '1', active: true},
                    {kind: 'SUPPLIER', publicId: 'supplier-1', name: 'Dostawca', address: '', taxId: '2', active: true},
                ],
            }});
    renderPage();
    if (mode === 'edit') {
        await userEvent.click(
                screen.getByRole('button', {name: 'INV/1'}));
        await userEvent.click(
                screen.getByRole('button', {name: 'Edytuj dokument'}));
    } else {
        await userEvent.click(
                screen.getByRole('button', {name: 'Dodaj dokument księgowy'}));
    }
    const dialog = within(
            screen.getByRole('dialog', {name: mode === 'edit'
                    ? 'Edytuj dokument księgowy' : 'Dodaj dokument księgowy'}));
    if (mode === 'create') {
        await userEvent.click(
                dialog.getByRole('combobox', {name: 'Rodzaj dokumentu'}));
        await userEvent.click(
                screen.getByRole('option', {name: 'Inny dokument kosztowy'}));
        fireEvent.change(
                dialog.getByLabelText(/Numer dokumentu/),
                {target: {value: 'OTHER/2'}});
        fireEvent.change(
                dialog.getByLabelText(/Kwota netto/),
                {target: {value: '100'}});
        fireEvent.change(
                dialog.getByLabelText(/Kwota VAT/),
                {target: {value: '0'}});
    }
    await userEvent.click(
            dialog.getByRole('combobox', {name: 'Kontrahent z katalogu'}));
    expect(screen.queryByRole('option', {name: /Klient ·/})).not.toBeInTheDocument();
    await userEvent.click(
            screen.getByRole('option', {name: /Dostawca ·/}));
    await userEvent.click(
            dialog.getByRole('button', {name: mode === 'edit' ? 'Zapisz zmiany dokumentu' : 'Zapisz dokument'}));
    await waitFor(
            () => expect(mode === 'edit' ? mockUpdateDocument : mockCreate).toHaveBeenCalledWith(
                    expect.objectContaining({variables: expect.objectContaining({input: expect.objectContaining({
                        counterpartyPublicId: 'supplier-1', documentType: AccountingDocumentType.OtherExpense,
                    })})})));
});

test.each([
    ['Użyj istniejącego wpisu', false],
    ['Nadpisz nowymi danymi', false],
    ['Zapisz scalone dane', false],
    ['Użyj istniejącego wpisu', true],
    ['Nadpisz nowymi danymi', true],
    ['Zapisz scalone dane', true],
] as const)('resolves manual document tax ID with %s (editing: %s)', async (action, editing) => {
    const supplier = {
        publicId: 'supplier-match', kind: 'SUPPLIER', name: 'Firma z katalogu', address: 'Adres z katalogu',
        taxId: 'PL9671238785', active: true,
    };
    const result = (useQuery as unknown as jest.Mock)();
    (useQuery as unknown as jest.Mock).mockReturnValue({...result, data: {...result.data,
        counterparties: [supplier, {...supplier, publicId: 'client-same-tax-id', kind: 'CLIENT'}],
    }});
    mockCounterpartySave.mockImplementation(async ({variables}) => ({data: {saveCounterpartyWithConflict: {
        saved: {...supplier, ...variables.input}, conflict: null,
    }}}));
    mockUpdateDocument.mockResolvedValue({data: {updateAccountingDocument: document}});
    renderPage();
    if (editing) {
        await userEvent.click(screen.getByRole('button', {name: 'INV/1'}));
        await userEvent.click(screen.getByRole('button', {name: 'Edytuj dokument'}));
    } else {
        await userEvent.click(screen.getByRole('button', {name: 'Dodaj dokument księgowy'}));
    }
    const form = screen.getByRole('dialog');
    if (!editing) {
        fireEvent.mouseDown(within(form).getByRole('combobox', {name: 'Rodzaj dokumentu'}));
        await userEvent.click(screen.getByRole('option', {name: 'Faktura VAT zakupu'}));
        fireEvent.change(within(form).getByLabelText(/Numer dokumentu/), {target: {value: 'NOWY/1'}});
    }
    fireEvent.change(within(form).getByLabelText('Kontrahent'), {target: {value: 'Nowa nazwa'}});
    fireEvent.change(within(form).getByLabelText('Adres kontrahenta'), {target: {value: 'Nowy adres'}});
    fireEvent.change(within(form).getByLabelText('NIP kontrahenta'), {target: {value: '967-123-87-85'}});
    expect(within(form).getByText(/Ten NIP jest już w katalogu/)).toBeInTheDocument();
    await userEvent.click(within(form).getByRole('button', {name: editing ? 'Zapisz zmiany dokumentu' : 'Zapisz dokument'}));
    const conflict = await screen.findByRole('dialog', {name: 'Kontrahent o tym NIP-ie już istnieje'});
    expect(mockCreate).not.toHaveBeenCalled();
    expect(mockUpdateDocument).not.toHaveBeenCalled();
    if (action === 'Zapisz scalone dane') {
        await userEvent.click(within(conflict).getByRole('button', {name: 'Użyj istniejącego: adres kontrahenta'}));
        fireEvent.change(within(conflict).getByLabelText(/Nazwa kontrahenta/), {target: {value: 'Scalona nazwa'}});
    }
    await userEvent.click(within(conflict).getByRole('button', {name: action}));
    const expectedName = action === 'Użyj istniejącego wpisu' ? supplier.name
            : action === 'Zapisz scalone dane' ? 'Scalona nazwa' : 'Nowa nazwa';
    const expectedAddress = action === 'Nadpisz nowymi danymi' ? 'Nowy adres' : supplier.address;
    const mutation = editing ? mockUpdateDocument : mockCreate;
    await waitFor(() => expect(mutation).toHaveBeenCalledWith({variables: expect.objectContaining({
        input: expect.objectContaining({
            counterpartyPublicId: supplier.publicId, counterparty: expectedName, counterpartyAddress: expectedAddress,
        }),
    })}));
    expect(mockCounterpartySave).toHaveBeenCalledTimes(action === 'Użyj istniejącego wpisu' ? 0 : 1);
    const expectedSave = action === 'Użyj istniejącego wpisu'
            ? undefined
            : {variables: {
                publicId: supplier.publicId,
                input: expect.objectContaining({name: expectedName, address: expectedAddress}),
                expected: {kind: supplier.kind, name: supplier.name, address: supplier.address,
                    taxId: supplier.taxId, active: true},
            }};
    expect(mockCounterpartySave.mock.calls[0]?.[0]).toEqual(expectedSave);
});

test('reuses the active catalog entry after clearing the counterparty selection', async () => {
    const supplier = {
        publicId: 'supplier-1',
        kind: 'SUPPLIER',
        name: document.counterparty,
        address: document.counterpartyAddress,
        taxId: `PL${document.counterpartyTaxId}`,
        active: true,
    };
    const linkedDocument = {...document, counterpartyPublicId: supplier.publicId};
    const result = (useQuery as unknown as jest.Mock)();
    (useQuery as unknown as jest.Mock).mockReturnValue({...result, data: {...result.data,
        companyAccountingDocuments: [linkedDocument],
        counterparties: [supplier],
    }});
    mockUpdateDocument.mockResolvedValue({data: {updateAccountingDocument: linkedDocument}});
    renderPage();
    await userEvent.click(screen.getByRole('button', {name: 'INV/1'}));
    await userEvent.click(screen.getByRole('button', {name: 'Edytuj dokument'}));
    const form = within(screen.getByRole('dialog', {name: 'Edytuj dokument księgowy'}));
    await userEvent.click(form.getByRole('combobox', {name: 'Kontrahent z katalogu'}));
    await userEvent.click(screen.getByRole('option', {name: /Dane ręczne/}));
    await userEvent.click(form.getByRole('button', {name: 'Zapisz zmiany dokumentu'}));

    await waitFor(
            () => expect(mockUpdateDocument).toHaveBeenCalledWith(
                    expect.objectContaining({variables: expect.objectContaining({input: expect.objectContaining({
                        counterpartyPublicId: supplier.publicId,
                    })})})));
    expect(screen.queryByRole('dialog', {name: 'Kontrahent o tym NIP-ie już istnieje'})).not.toBeInTheDocument();
    expect(mockCounterpartySave).not.toHaveBeenCalled();
});

test('reuses identical supplier from a saved document without asking to merge', async () => {
    const queryResult = (useQuery as unknown as jest.Mock)();
    (useQuery as unknown as jest.Mock).mockReturnValue({...queryResult, data: {...queryResult.data,
        counterparties: [{kind: 'SUPPLIER', publicId: 'supplier-1', name: document.counterparty,
            address: document.counterpartyAddress, taxId: `PL${document.counterpartyTaxId}`, active: true}],
    }});
    const from = jest.fn().mockResolvedValue({data: {createCounterpartyFromDocument: {publicId: 'supplier-1'}}});
    (useMutation as unknown as jest.Mock).mockImplementation(query => [
        query === CreateCounterpartyFromDocument ? from : mockCounterpartySave,
        {loading: false, reset: jest.fn()},
    ]);
    renderPage();
    await userEvent.click(screen.getByRole('button', {name: 'INV/1'}));
    await userEvent.click(screen.getByRole('button', {name: 'Utwórz kontrahenta z dokumentu'}));
    await waitFor(() => expect(from).toHaveBeenCalledWith({variables: {
        documentPublicId: 'document-1', kind: 'SUPPLIER', counterpartyPublicId: 'supplier-1',
    }}));
    expect(screen.queryByRole('dialog', {name: 'Kontrahent o tym NIP-ie już istnieje'})).not.toBeInTheDocument();
    expect(mockCounterpartySave).not.toHaveBeenCalled();
});
