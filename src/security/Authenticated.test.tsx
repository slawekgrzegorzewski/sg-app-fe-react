import React from 'react';
import {render, screen} from '@testing-library/react';
import {ApolloClient} from '@apollo/client';
import {useMutation} from '@apollo/client/react';
import {useNavigate, useParams} from 'react-router-dom';
import {Authenticated} from './Authenticated';
import {getKeycloakAccessToken, initializeKeycloak} from './keycloak';
import {CURRENT_USER_KEY} from '../utils/users/use-current-user';

jest.mock('@apollo/client', () => ({
    ApolloClient: jest.fn(),
    ApolloLink: Object.assign(jest.fn(), {from: jest.fn()}),
    defaultDataIdFromObject: jest.fn(),
    InMemoryCache: jest.fn(),
    Observable: jest.fn(),
    ServerError: {is: jest.fn()},
    ServerParseError: {is: jest.fn()},
}));
jest.mock('@apollo/client/react', () => ({
    ApolloProvider: ({children}: {children: React.ReactNode}) => children,
    useMutation: jest.fn(),
}));
jest.mock('@apollo/client/link/error', () => ({ErrorLink: jest.fn()}));
jest.mock('@apollo/client/errors', () => ({CombinedGraphQLErrors: {is: jest.fn()}}));
jest.mock('@apollo/client/link/context', () => {
    let callback: (context: {headers?: Record<string, string>}) => Promise<{headers: Record<string, string>}>;
    return {
        SetContextLink: jest.fn(value => {
            callback = value;
        }),
        getAuthCallback: () => callback,
    };
});
jest.mock('apollo-upload-client/UploadHttpLink.mjs', () => ({__esModule: true, default: jest.fn()}));
jest.mock('../types', () => ({GetCurrentUser: {}, SwitchDomain: {}}));

jest.mock('./keycloak', () => ({
    initializeKeycloak: jest.fn(),
    getKeycloakAccessToken: jest.fn(),
    logoutKeycloak: jest.fn(),
}));

jest.mock('react-router-dom', () => ({
    useNavigate: jest.fn(),
    useParams: jest.fn(),
    Navigate: ({to}: {to: string}) => `Przekierowanie: ${to}`,
}));

test('profil currentUser otwiera aplikację bez starego logowania', async () => {
    localStorage.removeItem(CURRENT_USER_KEY);
    (initializeKeycloak as jest.Mock).mockResolvedValue(true);
    (useNavigate as jest.Mock).mockReturnValue(jest.fn());
    (useParams as jest.Mock).mockReturnValue({applicationId: 'ACCOUNTANT'});
    const query = jest.fn().mockResolvedValue({
        data: {
            currentUser: {
                login: 'slag',
                name: 'Sławek',
                email: 'slag@example.com',
                roles: ['ACCOUNTANT'],
                domain: {publicId: 'domain-1', name: 'Domena'},
                domains: [{publicId: 'domain-1', name: 'Domena'}],
            },
        },
    });
    Object.assign(ApolloClient.prototype, {query});

    render(
        <Authenticated>
            <div>Chroniona treść</div>
        </Authenticated>
    );

    expect(await screen.findByText('Przekierowanie: /ACCOUNTANT/domain-1')).toBeInTheDocument();
    expect(initializeKeycloak).toHaveBeenCalledTimes(1);
    expect(query).toHaveBeenCalledWith(expect.objectContaining({fetchPolicy: 'network-only'}));
    expect(JSON.parse(localStorage.getItem(CURRENT_USER_KEY)!).user.domainPublicId).toBe('domain-1');
    expect(screen.queryByText('Przekierowanie: /login')).not.toBeInTheDocument();
});

test('odświeżenie wybranej aplikacji i domeny zachowuje bieżącą trasę', async () => {
    localStorage.removeItem(CURRENT_USER_KEY);
    const navigate = jest.fn();
    (initializeKeycloak as jest.Mock).mockResolvedValue(true);
    (useNavigate as jest.Mock).mockReturnValue(navigate);
    (useParams as jest.Mock).mockReturnValue({applicationId: 'IPR', domainPublicId: 'domain-2', page: 'timerecord'});
    Object.assign(ApolloClient.prototype, {
        query: jest.fn().mockResolvedValue({
            data: {
                currentUser: {
                    login: 'slag',
                    name: 'Sławek',
                    email: 'slag@example.com',
                    roles: ['ACCOUNTANT', 'IPR'],
                    domain: {publicId: 'domain-1', name: 'Pierwsza domena'},
                    domains: [
                        {publicId: 'domain-1', name: 'Pierwsza domena'},
                        {publicId: 'domain-2', name: 'Druga domena'},
                    ],
                },
            },
        }),
    });
    const switchDomain = jest.fn().mockResolvedValue({
        data: {
            switchDomain: {
                user: {
                    login: 'slag',
                    name: 'Sławek',
                    email: 'slag@example.com',
                    roles: ['ACCOUNTANT', 'IPR'],
                    domainPublicId: 'domain-2',
                    domains: [
                        {publicId: 'domain-1', name: 'Pierwsza domena'},
                        {publicId: 'domain-2', name: 'Druga domena'},
                    ],
                },
            },
        },
    });
    (useMutation as unknown as jest.Mock).mockReturnValue([switchDomain]);

    render(
        <Authenticated>
            <div>Chroniona treść</div>
        </Authenticated>
    );

    expect(await screen.findByText('Chroniona treść')).toBeInTheDocument();
    expect(switchDomain).toHaveBeenCalledWith({variables: {domainPublicId: 'domain-2'}});
    expect(navigate).not.toHaveBeenCalled();
    expect(JSON.parse(localStorage.getItem(CURRENT_USER_KEY)!).user.domainPublicId).toBe('domain-2');
});

test('nagłówek Apollo używa domeny z bieżącej trasy', async () => {
    const originalPath = window.location.pathname;
    (getKeycloakAccessToken as jest.Mock).mockResolvedValue('test-token');
    const {getAuthCallback} = jest.requireMock('@apollo/client/link/context');

    try {
        window.history.replaceState({}, '', '/IPR/domain-2/timerecord');
        const request = await getAuthCallback()({headers: {'x-custom': 'value'}});
        expect(request.headers).toEqual(
            expect.objectContaining({
                authorization: 'Bearer test-token',
                domainId: 'domain-2',
                'x-custom': 'value',
            })
        );

        window.history.replaceState({}, '', '/ACCOUNTANT/');
        const withoutDomain = await getAuthCallback()({});
        expect(withoutDomain.headers).not.toHaveProperty('domainId');
    } finally {
        window.history.replaceState({}, '', originalPath);
    }
});
