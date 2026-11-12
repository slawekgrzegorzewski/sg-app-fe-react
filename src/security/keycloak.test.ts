import type * as KeycloakModule from './keycloak';

jest.mock('../utils/logger', () => ({logError: jest.fn()}));
jest.mock('keycloak-js', () => {
    const adapter = {
        authenticated: true,
        token: 'old-token',
        configuration: undefined as {realm: string} | undefined,
        init: jest.fn(),
        updateToken: jest.fn(),
        logout: jest.fn(),
        onAuthLogout: undefined as (() => void) | undefined,
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

let auth: typeof KeycloakModule;
let adapter: ReturnType<typeof getAdapter>;
function getAdapter() {
    return jest.requireMock('keycloak-js').adapter as {
        authenticated: boolean;
        token: string;
        configuration: {realm: string};
        init: jest.Mock;
        updateToken: jest.Mock;
        logout: jest.Mock;
        onAuthLogout: () => void;
    };
}

beforeEach(() => {
    jest.resetModules();
    jest.useFakeTimers();
    auth = require('./keycloak');
    adapter = getAdapter();
    adapter.init.mockResolvedValue(true);
    adapter.updateToken.mockResolvedValue(false);
    adapter.logout.mockResolvedValue(undefined);
});

afterEach(() => {
    adapter.onAuthLogout();
    jest.useRealTimers();
    jest.restoreAllMocks();
});

async function tick() {
    jest.advanceTimersByTime(30_000);
    await Promise.resolve();
    await Promise.resolve();
}

test('odświeża token przed żądaniem i inicjalizuje Keycloak tylko raz', async () => {
    adapter.updateToken.mockImplementation(async () => {
        adapter.token = 'refreshed-token';
        return true;
    });
    expect(await auth.getKeycloakAccessToken()).toBe('refreshed-token');
    expect(await auth.getKeycloakAccessToken()).toBe('refreshed-token');
    expect(adapter.configuration.realm).toBe(process.env.REACT_APP_KEYCLOAK_REALM);
    expect(adapter.init).toHaveBeenCalledTimes(1);
    expect(adapter.init).toHaveBeenCalledWith({onLoad: 'login-required', pkceMethod: 'S256'});
    expect(adapter.updateToken).toHaveBeenCalledTimes(2);
    expect(adapter.updateToken).toHaveBeenCalledWith(60);
});

test('podtrzymuje sesję bez żądań API również w ukrytej karcie, jednym zegarem', async () => {
    jest.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    await auth.initializeKeycloak();
    await auth.initializeKeycloak();
    await tick();
    await tick();
    expect(adapter.updateToken).toHaveBeenCalledTimes(2);
    expect(adapter.updateToken).toHaveBeenCalledWith(60);
});

test('sprawdza sesję po powrocie do karty, odzyskaniu fokusu i sieci', async () => {
    await auth.initializeKeycloak();
    const visibility = jest.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    document.dispatchEvent(new Event('visibilitychange'));
    expect(adapter.updateToken).not.toHaveBeenCalled();
    visibility.mockReturnValue('visible');
    document.dispatchEvent(new Event('visibilitychange'));
    await Promise.resolve();
    await Promise.resolve();
    window.dispatchEvent(new Event('focus'));
    await Promise.resolve();
    await Promise.resolve();
    window.dispatchEvent(new Event('online'));
    expect(adapter.updateToken).toHaveBeenCalledTimes(3);
});

test('współdzieli trwające odświeżenie pomiędzy zegarem, zdarzeniami i żądaniem API', async () => {
    await auth.initializeKeycloak();
    let finish!: (value: boolean) => void;
    adapter.updateToken.mockReturnValue(new Promise<boolean>(resolve => { finish = resolve; }));
    await tick();
    window.dispatchEvent(new Event('focus'));
    const token = auth.getKeycloakAccessToken();
    await Promise.resolve();
    expect(adapter.updateToken).toHaveBeenCalledTimes(1);
    finish(true);
    await expect(token).resolves.toBe('old-token');
});

test('ponawia podtrzymywanie po przejściowym błędzie bez wylogowania', async () => {
    await auth.initializeKeycloak();
    adapter.updateToken.mockRejectedValueOnce(new Error('offline'));
    await tick();
    await tick();
    expect(adapter.updateToken).toHaveBeenCalledTimes(2);
    expect(adapter.logout).not.toHaveBeenCalled();
    expect(jest.requireMock('../utils/logger').logError).toHaveBeenCalledTimes(1);
});

test.each(['logout', 'adapter logout'] as const)('zatrzymuje zegar i nasłuchiwanie zdarzeń: %s', async action => {
    await auth.initializeKeycloak();
    if (action === 'logout') {
        await auth.logoutKeycloak('https://example.test/');
    } else {
        adapter.onAuthLogout();
    }
    expect(adapter.logout.mock.calls).toEqual(action === 'logout' ? [[{redirectUri: 'https://example.test/'}]] : []);
    await tick();
    window.dispatchEvent(new Event('focus'));
    window.dispatchEvent(new Event('online'));
    document.dispatchEvent(new Event('visibilitychange'));
    expect(adapter.updateToken).not.toHaveBeenCalled();
});

test('nie uruchamia podtrzymywania bez uwierzytelnienia', async () => {
    adapter.init.mockResolvedValue(false);
    await auth.initializeKeycloak();
    await tick();
    window.dispatchEvent(new Event('focus'));
    expect(adapter.updateToken).not.toHaveBeenCalled();
});
