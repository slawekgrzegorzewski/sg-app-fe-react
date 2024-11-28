import {ApolloClient, ApolloLink, ApolloProvider, defaultDataIdFromObject, InMemoryCache} from "@apollo/client";
import {onError} from "@apollo/client/link/error";
import React, {useState} from "react";
import {Navigate} from "react-router-dom";
import {useCurrentUser} from "../utils/users/use-current-user";
import {useDomain} from "../utils/domains/use-domain";
import createUploadLink from "apollo-upload-client/createUploadLink.mjs";

export function Authenticated({children}: { children: React.JSX.Element }) {
    const {currentDomainId} = useDomain();
    const {user, deleteCurrentUser} = useCurrentUser();
    const [loggedId, setLoggedIn] = useState(user !== null);
    const httpLink = createUploadLink({uri: process.env.REACT_APP_BACKEND_URL + '/graphql'})
    const authMiddleware = new ApolloLink((operation, forward) => {
        operation.setContext(({headers = {}}) => ({
            headers: {
                ...headers,
                domainId: currentDomainId,
                authorization: 'Bearer ' + (user?.jwtToken || ''),
                locale: navigator.language,
                'Apollo-Require-Preflight': 'true'
            }
        }));
        return forward(operation);
    })

    function logout() {
        deleteCurrentUser();
        setLoggedIn(false);
    }

    const logoutLink = onError((response) => {
        if (response.graphQLErrors
            && response.graphQLErrors.length > 0
            && response.graphQLErrors[0].extensions?.errorType === 'UNAUTHENTICATED') {
            logout();
        }
    })

    const apolloClient = new ApolloClient({
        cache: new InMemoryCache({
            dataIdFromObject: object => {
                switch (object.__typename) {
                    case 'Task':
                        const timeRecords = object.timeRecords as any[];
                        const timeRecordsLength = (timeRecords && timeRecords.length) || 0;
                        if (timeRecordsLength > 0) {
                            const datesPart = timeRecords
                                .map(tr => tr.__ref)
                                .sort()
                                .join(":");
                            return `Task:${object.id}:${timeRecordsLength}:${datesPart}`;
                        }
                        return `Task:${object.id}:${timeRecordsLength}`;
                    default:
                        return defaultDataIdFromObject(object);
                }
            }
        }),
        link: ApolloLink.from([
            logoutLink,
            authMiddleware,
            httpLink
        ])
    });

    if (loggedId) {
        return <ApolloProvider client={apolloClient}>
            <div style={{display: 'flex'}}>
                {children}
            </div>
        </ApolloProvider>;
    } else {
        return <Navigate to={"/login"}/>;
    }
}