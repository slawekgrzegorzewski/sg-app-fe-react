import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import {useApolloClient, useMutation, useQuery} from '@apollo/client/react';
import {KsefImportPanel} from './KsefImportPanel';
import {GetKsefImports, KsefImportStatus, KsefInvoiceDirection, KsefInvoiceStatus} from '../types';

jest.mock('@apollo/client/react', () => ({useApolloClient: jest.fn(), useMutation: jest.fn(), useQuery: jest.fn()}));

const start = jest.fn();
const refetch = jest.fn().mockResolvedValue({});
const startPolling = jest.fn();
const stopPolling = jest.fn();
const onImported = jest.fn().mockResolvedValue({});
let configured = true;
let run: any;

beforeEach(() => {
    jest.clearAllMocks();
    onImported.mockResolvedValue({});
    refetch.mockResolvedValue({});
    configured = true;
    run = undefined;
    (useMutation as unknown as jest.Mock).mockReturnValue([start, {loading: false}]);
    (useApolloClient as unknown as jest.Mock).mockReturnValue({query: jest.fn()});
    (useQuery as unknown as jest.Mock).mockImplementation(query => query === GetKsefImports
            ? {data: {ksefConnection: {configured, nip: '5265877635', environment: 'TEST'}, ksefImports: run ? [run] : []},
                loading: false, refetch, startPolling, stopPolling}
            : {data: {ksefImportInvoices: run ? [{publicId: 'source', invoiceNumber: 'FV/1', ksefNumber: 'KSeF/1',
                status: KsefInvoiceStatus.ReviewRequired, reviewReason: 'Sprawdź zaliczkę'}] : []}, loading: false, refetch});
});

test('shows configuration requirement without collecting secrets in browser', () => {
    configured = false;
    render(<KsefImportPanel onImported={onImported} />);
    expect(screen.getByText(/Skonfiguruj na serwerze token KSeF/)).toBeInTheDocument();
    expect(screen.queryByRole('button', {name: 'Pobierz faktury z KSeF'})).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/token/i)).not.toBeInTheDocument();
});

test('starts purchase import and refreshes documents when background import finishes', async () => {
    const pending = {publicId: 'run', status: KsefImportStatus.Pending, direction: KsefInvoiceDirection.Purchase,
        createdAt: '2026-11-01T12:00:00Z', importedCount: 0, duplicateCount: 0, reviewCount: 0};
    start.mockImplementation(async () => {
        run = {...pending};
        return {data: {startKsefImport: run}};
    });
    const view = render(<KsefImportPanel onImported={onImported} />);
    fireEvent.click(screen.getByRole('button', {name: 'Import z KSeF'}));
    fireEvent.change(screen.getByLabelText('Zapis w KSeF od'), {target: {value: '2026-11-01'}});
    fireEvent.change(screen.getByLabelText('Zapis w KSeF do'), {target: {value: '2026-11-02'}});
    fireEvent.click(screen.getByRole('button', {name: 'Pobierz faktury z KSeF'}));
    await waitFor(() => expect(start).toHaveBeenCalledWith({variables: {input: {
        dateFrom: '2026-11-01', dateTo: '2026-11-02', direction: KsefInvoiceDirection.Purchase,
    }}}));
    await waitFor(() => expect(startPolling).toHaveBeenCalledWith(3000));
    expect(screen.getByRole('button', {name: 'Import w toku'})).toBeDisabled();
    run = {...pending, status: KsefImportStatus.Completed, importedCount: 1, reviewCount: 1};
    view.rerender(<KsefImportPanel onImported={onImported} />);
    await waitFor(() => expect(onImported).toHaveBeenCalledTimes(1));
    expect(screen.getByText('Sprawdź zaliczkę')).toBeInTheDocument();
    expect(screen.getByRole('button', {name: 'Pobierz XML'})).toBeInTheDocument();
});
