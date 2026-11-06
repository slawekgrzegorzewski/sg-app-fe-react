import {getKeycloakAccessToken} from './keycloak';

jest.mock('keycloak-js', () => {
    const adapter = {
        authenticated: true,
        token: 'old-token',
        configuration: undefined as {realm: string} | undefined,
        init: jest.fn(),
        updateToken: jest.fn(),
        logout: jest.fn(),
    };
    return {
        __esModule: true,
        default: function KeycloakMock(configuration: {realm: string}) {
            adapter.configuration = configuration;
            return adapter;
        },
        adapter,
    };
});

test('odświeża token przed wysłaniem żądania i inicjalizuje Keycloak tylko raz', async () => {
    const adapter = jest.requireMock('keycloak-js').adapter;
    adapter.init.mockResolvedValue(true);
    adapter.updateToken.mockImplementation(async () => {
        adapter.token = 'refreshed-token';
        return true;
    });

    expect(await getKeycloakAccessToken()).toBe('refreshed-token');
    expect(await getKeycloakAccessToken()).toBe('refreshed-token');
    expect(adapter.configuration?.realm).toBe(process.env.REACT_APP_KEYCLOAK_REALM);
    expect(adapter.init).toHaveBeenCalledTimes(1);
    expect(adapter.init).toHaveBeenCalledWith({onLoad: 'login-required', pkceMethod: 'S256'});
    expect(adapter.updateToken).toHaveBeenCalledTimes(2);
    expect(adapter.updateToken).toHaveBeenCalledWith(30);
});
