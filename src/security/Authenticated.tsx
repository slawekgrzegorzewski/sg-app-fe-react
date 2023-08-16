import {ApolloClient, ApolloLink, ApolloProvider, concat, HttpLink, InMemoryCache} from "@apollo/client";
import {onError} from "@apollo/client/link/error";
import React, {useState} from "react";
import {Navigate} from "react-router-dom";
import {JWT_TOKEN, LOGGED_IN_USER} from "../common/local-storage-keys";
import {getDomainId} from "../common/domain-utils";

export function Authenticated({children}: { children: React.JSX.Element }) {

    const [loggedId, setLoggedIn] = useState(localStorage.getItem(JWT_TOKEN) !== null);

    const httpLink = new HttpLink({uri: process.env.REACT_APP_BACKEND_URL + '/graphql'})

    const authMiddleware = new ApolloLink((operation, forward) => {
        const jwt = localStorage.getItem(JWT_TOKEN) || '';
        operation.setContext(({headers = {}}) => ({
            headers: {
                ...headers,
                domainId: getDomainId(),
                authorization: 'Bearer ' + jwt,
            }
        }));
        return forward(operation);
    })

    function logout() {
        localStorage.removeItem(JWT_TOKEN);
        localStorage.removeItem(LOGGED_IN_USER);
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
        link: logoutLink.concat(concat(authMiddleware, httpLink))
    });

    if (loggedId) {
        return <ApolloProvider client={apolloClient}>
            <div style={{display: 'flex'}}>
                <div>
                    <span onClick={logout}>Logout</span>
                </div>
                {children}
            </div>
        </ApolloProvider>;
    } else {
        return <Navigate to={{
            pathname: "/login"
        }}/>
    }
}