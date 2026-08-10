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
import React, {useEffect, useRef} from 'react';
import {Navigate, useParams} from 'react-router-dom';
import {logOut, readJwtToken, useCurrentUser} from '../utils/users/use-current-user';
import UploadHttpLink from 'apollo-upload-client/UploadHttpLink.mjs';
import {Institution, SwitchDomain, SwitchDomainMutation} from '../types';
import getUserApplications from '../utils/applications/applications-access';
import {logError} from '../utils/logger';
import {backdropHandle} from '../utils/GlobalBackdropContext';
import {getBackendUrl} from '../utils/backend-url';

const httpLink = new UploadHttpLink({uri: getBackendUrl() + '/graphql'});

const authMiddleware = new ApolloLink((operation, forward) => {
    operation.setContext(({headers = {}}) => {
        const jwtToken = readJwtToken();
        return {
            headers: {
                ...headers,
                ...(jwtToken ? {authorization: 'Bearer ' + jwtToken} : {}),
                locale: navigator.language,
                'Apollo-Require-Preflight': 'true',
            },
        };
    });
    return forward(operation);
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

function AssureCorrectDomainJWT({children}: {children: React.JSX.Element}) {
    const [switchDomainMutation] = useMutation<SwitchDomainMutation>(SwitchDomain);
    const {user, setCurrentUser} = useCurrentUser();
    const {domainPublicId} = useParams();

    const domainMatchesToken = !domainPublicId || domainPublicId === user?.user.domainPublicId;
    const switchRequestedFor = useRef<string | null>(null);

    useEffect(() => {
        if (domainMatchesToken || !domainPublicId) {
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
                setCurrentUser({
                    jwtToken: switched.jwt,
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
    }, [domainMatchesToken, domainPublicId, switchDomainMutation, setCurrentUser]);

    if (!domainMatchesToken) {
        return <></>;
    }
    return <>{children}</>;
}

export function Authenticated({children}: {children: React.JSX.Element}) {
    const {user} = useCurrentUser();
    const {applicationId, domainPublicId} = useParams();

    if (!user) {
        return <Navigate to={'/login'} />;
    }

    if (!domainPublicId) {
        return <Navigate to={`/${applicationId}/${user.user.domainPublicId}`} />;
    }

    return (
        <ApolloProvider client={apolloClient}>
            <AssureCorrectDomainJWT>{children}</AssureCorrectDomainJWT>
        </ApolloProvider>
    );
}
