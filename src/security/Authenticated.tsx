import {
    ApolloClient,
    ApolloLink,
    defaultDataIdFromObject,
    ErrorLike,
    InMemoryCache,
    Observable,
    ServerError,
    ServerParseError,
} from '@apollo/client';
import {ApolloProvider, useMutation} from '@apollo/client/react';
import {ErrorLink} from '@apollo/client/link/error';
import {CombinedGraphQLErrors} from '@apollo/client/errors';
import {SetContextLink} from '@apollo/client/link/context';
import React, {useEffect, useRef, useState} from 'react';
import {Navigate, useParams} from 'react-router-dom';
import {logOut, useCurrentUser} from '../utils/users/use-current-user';
import UploadHttpLink from 'apollo-upload-client/UploadHttpLink.mjs';
import {GetCurrentUser, GetCurrentUserQuery, Institution, SwitchDomain, SwitchDomainMutation, User} from '../types';
import getUserApplications, {ApplicationId, applications} from '../utils/applications/applications-access';
import {logError} from '../utils/logger';
import {backdropHandle} from '../utils/GlobalBackdropContext';
import {getBackendUrl} from '../utils/backend-url';
import {getKeycloakAccessToken, initializeKeycloak} from './keycloak';
import {ErrorDisplay, LoadingIndicator} from '../application/components/QueryState';

const httpLink = new UploadHttpLink({uri: getBackendUrl() + '/graphql'});

function currentDomainPublicId(): string | undefined {
    const basename = (process.env.REACT_APP_BROWSER_HISTORY_BASENAME || '').replace(/\/$/, '');
    const pathname = window.location.pathname;
    if (basename && !pathname.startsWith(`${basename}/`)) {
        return undefined;
    }
    const [, applicationId, domainPublicId] = pathname.slice(basename.length).split('/');
    return applications.has(applicationId as ApplicationId) ? domainPublicId || undefined : undefined;
}

const authMiddleware = new SetContextLink(async ({headers = {}}) => {
    const token = await getKeycloakAccessToken();
    const domainPublicId = currentDomainPublicId();
    return {
        headers: {
            ...headers,
            authorization: `Bearer ${token}`,
            ...(domainPublicId ? {domainId: domainPublicId} : {}),
            locale: navigator.language,
            'Apollo-Require-Preflight': 'true',
        },
    };
});

const backdropLink = new ApolloLink((operation, forward) => {
    const label = operation.operationName;
    return new Observable(observer => {
        let finished = false;
        let backdropShown = false;
        queueMicrotask(() => {
            if (!finished) {
                backdropShown = true;
                backdropHandle.show(label);
            }
        });

        const hide = () => {
            if (finished) {
                return;
            }
            finished = true;
            if (backdropShown) {
                queueMicrotask(() => backdropHandle.hide(label));
            }
        };
        const subscription = forward(operation).subscribe({
            next: result => {
                observer.next(result);
            },
            error: err => {
                hide();
                observer.error(err);
            },
            complete: () => {
                hide();
                observer.complete();
            },
        });
        return () => {
            subscription.unsubscribe();
            hide();
        };
    });
});

function isUnauthenticated(error: ErrorLike): boolean {
    if (ServerError.is(error) || ServerParseError.is(error)) {
        return error.statusCode === 401;
    }
    if (CombinedGraphQLErrors.is(error)) {
        return error.errors.some(graphQLError => {
            const code = graphQLError.extensions?.code;
            return code === 'UNAUTHENTICATED' || code === 'UNAUTHORIZED' || code === 401;
        });
    }
    return false;
}

const errorHandlerLink = new ErrorLink(({error, operation}) => {
    if (isUnauthenticated(error)) {
        logOut();
        return;
    }
    logError(`GraphQL operation "${operation.operationName}" failed`, error);
});

const cache = new InMemoryCache({
    dataIdFromObject: object => {
        switch (object.__typename) {
            case 'Task': {
                const timeRecords = (object.timeRecords ?? []) as {__ref?: string}[];
                if (timeRecords.length > 0) {
                    const datesPart = timeRecords
                        .map(timeRecord => timeRecord.__ref)
                        .sort()
                        .join(':');
                    return `Task:${object.id}:${timeRecords.length}:${datesPart}`;
                }
                return `Task:${object.id}:0`;
            }
            case 'Institution': {
                const institution = object as Institution;
                return `Institution:${institution.id}:${institution.bic}`;
            }
            default:
                return defaultDataIdFromObject(object);
        }
    },
});

const apolloClient = new ApolloClient({
    cache: cache,
    link: ApolloLink.from([backdropLink, errorHandlerLink, authMiddleware, httpLink]),
});

function AssureCorrectDomain({children}: {children: React.JSX.Element}) {
    const [switchDomainMutation] = useMutation<SwitchDomainMutation>(SwitchDomain);
    const {user, saveCurrentUser} = useCurrentUser();
    const {domainPublicId} = useParams();

    const domainMatchesUser = !domainPublicId || domainPublicId === user?.user.domainPublicId;
    const switchRequestedFor = useRef<string | null>(null);

    useEffect(() => {
        if (domainMatchesUser || !domainPublicId) {
            return;
        }
        if (switchRequestedFor.current === domainPublicId) {
            return;
        }
        switchRequestedFor.current = domainPublicId;

        switchDomainMutation({variables: {domainPublicId: domainPublicId}})
            .then(value => {
                const switched = value.data?.switchDomain;
                // Deliberately not gated on an effect-cleanup flag: under StrictMode the
                // first invocation is torn down immediately, and gating on that would
                // discard the only response we asked for.
                if (!switched || switchRequestedFor.current !== domainPublicId) {
                    return;
                }
                saveCurrentUser({
                    user: switched.user,
                    applications: getUserApplications(switched.user),
                });
            })
            .catch(error => {
                if (switchRequestedFor.current === domainPublicId) {
                    switchRequestedFor.current = null;
                }
                logError(`Could not switch to domain ${domainPublicId}`, error);
            });
    }, [domainMatchesUser, domainPublicId, switchDomainMutation, saveCurrentUser]);

    if (!domainMatchesUser) {
        return <></>;
    }
    return <>{children}</>;
}

export function Authenticated({children}: {children: React.JSX.Element}) {
    const {user, saveCurrentUser} = useCurrentUser();
    const {applicationId, domainPublicId} = useParams();
    const [profileReady, setProfileReady] = useState(false);
    const [authError, setAuthError] = useState<Error | null>(null);
    const [authAttempt, setAuthAttempt] = useState(0);

    useEffect(() => {
        let cancelled = false;
        async function loadProfile() {
            try {
                const authenticated = await initializeKeycloak();
                if (!authenticated) {
                    if (!cancelled) {
                        setAuthError(new Error('Uwierzytelnienie w Keycloak nie powiodło się.'));
                    }
                    return;
                }
                if (cancelled) {
                    return;
                }
                const {data} = await apolloClient.query<GetCurrentUserQuery>({
                    query: GetCurrentUser,
                    fetchPolicy: 'network-only',
                });
                const profile = data?.currentUser;
                if (!profile) {
                    if (!cancelled) {
                        setAuthError(new Error('Serwer nie zwrócił danych konta.'));
                    }
                    return;
                }
                const currentUser: User = {
                    login: profile.login,
                    name: profile.name,
                    email: profile.email,
                    roles: profile.roles,
                    domainPublicId: profile.domain.publicId,
                    domains: profile.domains,
                };
                if (!cancelled) {
                    saveCurrentUser({user: currentUser, applications: getUserApplications(currentUser)});
                    setProfileReady(true);
                    setAuthError(null);
                }
            } catch (error) {
                if (!cancelled) {
                    setAuthError(error instanceof Error ? error : new Error(String(error)));
                }
            }
        }
        void loadProfile();
        return () => {
            cancelled = true;
        };
    }, [authAttempt, saveCurrentUser]);

    if (authError) {
        return (
            <ErrorDisplay
                title="Nie udało się uruchomić sesji"
                error={authError}
                onRetry={() => {
                    setAuthError(null);
                    setAuthAttempt(attempt => attempt + 1);
                }}
            />
        );
    }

    if (!profileReady) {
        return <LoadingIndicator label="Trwa ładowanie konta..." />;
    }

    if (!user) {
        return (
            <ErrorDisplay
                title="Brak danych konta"
                error={{message: 'Brak danych konta wymaganych do uruchomienia aplikacji.'}}
            />
        );
    }

    if (!domainPublicId) {
        return <Navigate to={`/${applicationId}/${user.user.domainPublicId}`} />;
    }

    return (
        <ApolloProvider client={apolloClient}>
            <AssureCorrectDomain>{children}</AssureCorrectDomain>
        </ApolloProvider>
    );
}
