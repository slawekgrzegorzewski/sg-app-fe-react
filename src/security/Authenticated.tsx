import {ApolloClient, ApolloLink, ApolloProvider, defaultDataIdFromObject, InMemoryCache} from "@apollo/client";
import {onError} from "@apollo/client/link/error";
import React from "react";
import {Navigate, useParams} from "react-router-dom";
import {useCurrentUser} from "../utils/users/use-current-user";
import createUploadLink from "apollo-upload-client/createUploadLink.mjs";
import type {ServerParseError} from "@apollo/client/link/http";
import type {ServerError} from "@apollo/client/link/utils";

export function Authenticated({children}: { children: React.JSX.Element }) {
    const {user, deleteCurrentUser} = useCurrentUser();
    const {applicationId, domainPublicId} = useParams();

    if (!user) {
        return <Navigate to={"/login"}/>;
    }

    if (!domainPublicId) {
        return <Navigate to={`/${applicationId}/${user!.user.defaultDomainPublicId}`}></Navigate>
    }

    const httpLink = createUploadLink({uri: process.env.REACT_APP_BACKEND_URL + '/graphql'})
    const authMiddleware = new ApolloLink((operation, forward) => {
        operation.setContext(({headers = {}}) => ({
            headers: {
                ...headers,
                domainId: domainPublicId,
                authorization: 'Bearer ' + (user?.jwtToken || ''),
                locale: navigator.language,
                'Apollo-Require-Preflight': 'true'
            }
        }));
        return forward(operation);
    })

    const errorHandlerLink = onError((response) => {
        if (response.graphQLErrors
            && response.graphQLErrors.length > 0
            && response.graphQLErrors[0].extensions?.errorType === 'UNAUTHENTICATED') {
            deleteCurrentUser();
        }
        if (response.networkError) {
            const statusCode = (response.networkError as ServerParseError).statusCode || (response.networkError as ServerError).statusCode
            if (statusCode && statusCode === 401) {
                deleteCurrentUser();
            }
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
            errorHandlerLink,
            authMiddleware,
            httpLink
        ])
    });

    return <ApolloProvider client={apolloClient}>
        <div style={{display: 'flex'}}>
            {children}
        </div>
    </ApolloProvider>;
}