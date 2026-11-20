import React from 'react';
import {render, screen} from '@testing-library/react';
import {MemoryRouter, Route, Routes} from 'react-router-dom';
import {useQuery} from '@apollo/client/react';
import {AccountantDispatcher} from './AccountantDispatcher';

jest.mock(
        'react-router-dom',
        () => {
            global.TextEncoder = require('util').TextEncoder;
            return require('react-router');
        });

jest.mock(
        '@apollo/client/react',
        () => ({useQuery: jest.fn()}));
jest.mock(
        '../../../utils/use-application-and-domain',
        () => ({
            useApplicationAndDomain: () => ({currentApplicationId: 'ACCOUNTANT', currentDomainPublicId: 'domain'}),
        }));
jest.mock(
        '../../../accountant/CompanyAccounting',
        () => ({CompanyAccounting: () => <div>Księga firmy</div>}));
jest.mock(
        '../../../accountant/BillingPeriods',
        () => ({BillingPeriods: () => <div>Miesiące prywatne</div>}));
jest.mock(
        '../../../accountant/Accounts',
        () => ({Accounts: () => <div>Konta prywatne</div>}));
jest.mock(
        '../../../loans/Loans',
        () => ({Loans: () => <div>Lista pożyczek</div>}));
jest.mock(
        '../../../loans/Loan',
        () => ({Loan: () => <div>Szczegóły pożyczki</div>}));
jest.mock(
        '../../../accountant/settings/AccountantSettings',
        () => ({AccountantSettings: () => <div>Ustawienia księgowości</div>}));

function pageAt(path: string) {
    return (
        <MemoryRouter initialEntries={[path]}>
            <Routes>
                <Route
                    path="/ACCOUNTANT/:domainPublicId/:page?/:param1?"
                    element={<AccountantDispatcher />}
                />
            </Routes>
        </MemoryRouter>
    );
}

function configureMode(isCompany: boolean) {
    (useQuery as unknown as jest.Mock).mockReturnValue(
            {
                loading: false,
                data: {settings: {accountantSettings: {isCompany}}},
                refetch: jest.fn(),
            });
}

test.each(
        [
            [true, '', 'Księga firmy'],
            [true, '/home', 'Księga firmy'],
            [true, '/company-accounting', 'Księga firmy'],
            [false, '', 'Miesiące prywatne'],
            [false, '/accounts', 'Konta prywatne'],
            [false, '/loans', 'Lista pożyczek'],
            [false, '/loans/loan-1', 'Szczegóły pożyczki'],
            [true, '/settings', 'Ustawienia księgowości'],
            [false, '/settings', 'Ustawienia księgowości'],
        ])(
        'renders the correct page for company=%s at %s',
        (
                isCompany,
                path,
                content) => {
            configureMode(isCompany);
            render(
                    pageAt(`/ACCOUNTANT/domain${path}`));
            expect(
                    screen.getByText(content)).toBeInTheDocument();
        });

test.each(['/accounts', '/loans', '/loans/loan-1'])(
        'redirects a private page %s to the company home',
        path => {
            configureMode(true);
            render(
                    pageAt(`/ACCOUNTANT/domain${path}`));
            expect(
                    screen.getByText('Księga firmy')).toBeInTheDocument();
            expect(
                    screen.queryByText('Konta prywatne')).not.toBeInTheDocument();
            expect(
                    screen.queryByText('Lista pożyczek')).not.toBeInTheDocument();
            expect(
                    screen.queryByText('Szczegóły pożyczki')).not.toBeInTheDocument();
        });

test(
        'redirects the company page to the private home when company mode is disabled',
        () => {
            configureMode(false);
            render(
                    pageAt('/ACCOUNTANT/domain/company-accounting'));
            expect(
                    screen.getByText('Miesiące prywatne')).toBeInTheDocument();
            expect(
                    screen.queryByText('Księga firmy')).not.toBeInTheDocument();
        });

test(
        'changes the home page immediately after the setting is refreshed',
        () => {
            configureMode(false);
            const view = render(
                    pageAt('/ACCOUNTANT/domain'));
            expect(
                    screen.getByText('Miesiące prywatne')).toBeInTheDocument();
            configureMode(true);
            view.rerender(
                    pageAt('/ACCOUNTANT/domain'));
            expect(
                    screen.getByText('Księga firmy')).toBeInTheDocument();
            expect(
                    screen.queryByText('Miesiące prywatne')).not.toBeInTheDocument();
        });
