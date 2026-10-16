import {User} from '../../types';
import {Application} from '../applications/applications-access';
import {useCallback, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {logoutKeycloak} from '../../security/keycloak';

export type CurrentUser = {
    user: User;
    applications: Application[];
};

export const CURRENT_USER_KEY = 'newApp_currentUser';

export function readCurrentUser(): CurrentUser | null {
    const stored = localStorage.getItem(CURRENT_USER_KEY);
    if (!stored) {
        return null;
    }
    let parsed: CurrentUser | null = null;
    try {
        parsed = JSON.parse(stored) as CurrentUser;
    } catch {
        // Fall through to the cleanup below.
    }
    // Sessions written before the move from defaultDomainId to domainPublicId
    // cannot be used against the current backend.
    if (!parsed || !parsed.user || Object.prototype.hasOwnProperty.call(parsed.user, 'defaultDomainId')) {
        localStorage.removeItem(CURRENT_USER_KEY);
        return null;
    }
    if (Object.prototype.hasOwnProperty.call(parsed, 'jwtToken')) {
        Reflect.deleteProperty(parsed, 'jwtToken');
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(parsed));
    }
    return parsed;
}

export function logOut(): void {
    localStorage.removeItem(CURRENT_USER_KEY);
    const basename = process.env.REACT_APP_BROWSER_HISTORY_BASENAME || '';
    const landingPath = process.env.REACT_APP_BROWSER_DEFAULT_REDIRECT || '/ACCOUNTANT/';
    const redirectUri = `${window.location.origin}${basename}${landingPath}`;
    void logoutKeycloak(redirectUri).catch(() => window.location.assign(redirectUri));
}

export function useCurrentUser() {
    const navigate = useNavigate();
    const [currentUser, setCurrentUser] = useState<CurrentUser | null>(readCurrentUser);

    const saveCurrentUser = useCallback((user: CurrentUser) => {
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
        setCurrentUser(user);
    }, []);

    const storeCurrentUser = useCallback(
        (user: CurrentUser) => {
            saveCurrentUser(user);
            navigate('/' + user.applications[0].id + '/' + user.user.domainPublicId);
        },
        [navigate, saveCurrentUser]
    );

    const deleteCurrentUser = useCallback(() => {
        setCurrentUser(null);
        logOut();
    }, []);

    return {user: currentUser, setCurrentUser: storeCurrentUser, saveCurrentUser, deleteCurrentUser};
}
