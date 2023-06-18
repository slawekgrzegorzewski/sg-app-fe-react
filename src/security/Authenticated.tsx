import {ApolloClient, ApolloLink, ApolloProvider, concat, HttpLink, InMemoryCache} from "@apollo/client";
import {Token} from "./Authenticate";
import {onError} from "@apollo/client/link/error";
import React, {useState} from "react";
import {Navigate} from "react-router-dom";

export function Authenticated({children}: { children: React.JSX.Element }) {

    const [loggedId, setLoggedIn] = useState(localStorage.getItem("tokens") !== null);

    const httpLink = new HttpLink({uri: process.env.REACT_APP_BACKEND_URL + '/graphql'})

    const authMiddleware = new ApolloLink((operation, forward) => {
        const emptyToken = '{ "id_token": "", "access_token": "", "refresh_token": "", "expires_in": 0, "token_type": ""}';
        const tokensString = localStorage.getItem("tokens") || emptyToken;
        const tokens: Token = JSON.parse(tokensString);
        operation.setContext(({headers = {}}) => ({
            headers: {
                ...headers,
                domainId: '2',
                authorization: 'Bearer ' + tokens.access_token,
            }
        }));

        return forward(operation);
    })

    function logout() {
        localStorage.removeItem('tokens');
        localStorage.removeItem('user');
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