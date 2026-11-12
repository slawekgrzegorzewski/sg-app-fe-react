import Keycloak from 'keycloak-js';
import {logError} from '../utils/logger';

const realm = process.env.REACT_APP_KEYCLOAK_REALM;
if (realm !== 'sg' && realm !== 'sg-test') {
    throw new Error('REACT_APP_KEYCLOAK_REALM must be sg or sg-test.');
}

const keycloak = new Keycloak({
    url: 'https://auth.grzegorzewski.pl',
    realm,
    clientId: 'sg-frontend',
});

let initialization: Promise<boolean> | undefined;
let refresh: Promise<boolean> | undefined;
let keepAliveTimer: number | undefined;

function updateToken(): Promise<boolean> {
    if (!refresh) {
        refresh = keycloak.updateToken(60).finally(() => {
            refresh = undefined;
        });
    }
    return refresh;
}

function keepSessionAlive(): void {
    if (!keycloak.authenticated) {
        stopSessionKeepAlive();
        return;
    }
    void updateToken().catch(error => {
        // A temporary network failure must not end the session. The next timer
        // tick, online event or protected request can retry the refresh.
        logError('Nie udało się odnowić sesji Keycloak.', error);
    });
}

function onVisibilityChange(): void {
    if (document.visibilityState === 'visible') {
        keepSessionAlive();
    }
}

function stopSessionKeepAlive(): void {
    window.clearInterval(keepAliveTimer);
    keepAliveTimer = undefined;
    document.removeEventListener('visibilitychange', onVisibilityChange);
    window.removeEventListener('focus', keepSessionAlive);
    window.removeEventListener('online', keepSessionAlive);
}

function startSessionKeepAlive(): void {
    if (keepAliveTimer !== undefined) {
        return;
    }
    // Keep running in hidden tabs too; browsers may throttle or suspend timers.
    keepAliveTimer = window.setInterval(keepSessionAlive, 30_000);
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('focus', keepSessionAlive);
    window.addEventListener('online', keepSessionAlive);
}

keycloak.onAuthLogout = stopSessionKeepAlive;

export function initializeKeycloak(): Promise<boolean> {
    if (initialization) {
        return initialization;
    }
    initialization = keycloak
        .init({
            onLoad: 'login-required',
            pkceMethod: 'S256',
        })
        .then(authenticated => {
            if (authenticated) {
                startSessionKeepAlive();
            }
            return authenticated;
        })
        .catch((error: unknown) => {
            initialization = undefined;
            throw error;
        });
    return initialization;
}

export async function getKeycloakAccessToken(): Promise<string> {
    const authenticated = await initializeKeycloak();
    if (!authenticated) {
        throw new Error('Uwierzytelnienie w Keycloak nie powiodło się.');
    }
    await updateToken();
    if (!keycloak.token) {
        throw new Error('Keycloak nie udostępnił tokena dostępu.');
    }
    return keycloak.token;
}

export async function logoutKeycloak(redirectUri: string): Promise<void> {
    stopSessionKeepAlive();
    if (!keycloak.authenticated) {
        window.location.assign(redirectUri);
        return;
    }
    await keycloak.logout({redirectUri});
}
