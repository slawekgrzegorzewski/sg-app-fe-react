import Keycloak from 'keycloak-js';

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

export function initializeKeycloak(): Promise<boolean> {
    if (initialization) {
        return initialization;
    }
    initialization = keycloak
        .init({
            onLoad: 'login-required',
            pkceMethod: 'S256',
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
    await keycloak.updateToken(30);
    if (!keycloak.token) {
        throw new Error('Keycloak nie udostępnił tokena dostępu.');
    }
    return keycloak.token;
}

export async function logoutKeycloak(redirectUri: string): Promise<void> {
    if (!keycloak.authenticated) {
        window.location.assign(redirectUri);
        return;
    }
    await keycloak.logout({redirectUri});
}
