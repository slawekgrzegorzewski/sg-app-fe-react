import {ApolloClient, ApolloLink, ApolloProvider, HttpLink, InMemoryCache} from "@apollo/client";
import {onError} from "@apollo/client/link/error";
import React, {useState} from "react";
import {Navigate} from "react-router-dom";
import {useCurrentUser} from "../utils/users/use-current-user";
import {useDomain} from "../utils/domains/use-domain";

export function Authenticated({children}: { children: React.JSX.Element }) {
    const {currentDomainId} = useDomain();
    const {user, deleteCurrentUser} = useCurrentUser();
    const [loggedId, setLoggedIn] = useState(user !== null);
    const httpLink = new HttpLink({uri: process.env.REACT_APP_BACKEND_URL + '/graphql'})
    const authMiddleware = new ApolloLink((operation, forward) => {
        operation.setContext(({headers = {}}) => ({
            headers: {
                ...headers,
                domainId: currentDomainId,
                authorization: 'Bearer ' + (user?.jwtToken || ''),
                locale: navigator.language
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
            && response.graphQLErrors[0].extensions.errorType === 'UNAUTHENTICATED') {
            logout();
        }
    })

    const apolloClient = new ApolloClient({
        cache: new InMemoryCache(),
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
        return <Navigate to={"/login"} />;
    }
}