import {
    ApolloClient,
    ApolloLink,
    ApolloProvider,
    defaultDataIdFromObject,
    InMemoryCache,
    useMutation
} from "@apollo/client";
import {onError} from "@apollo/client/link/error";
import React from "react";
import {Navigate, useParams} from "react-router-dom";
import {CURRENT_USER_KEY, useCurrentUser} from "../utils/users/use-current-user";
import createUploadLink from "apollo-upload-client/createUploadLink.mjs";
import type {ServerParseError} from "@apollo/client/link/http";
import type {ServerError} from "@apollo/client/link/utils";
import {Institution, SwitchDomain, SwitchDomainMutation} from "../types";
import getUserApplications, {Application} from "../utils/applications/applications-access";

function AssureCorrectDomainJWT({children}: { children: React.JSX.Element }) {
    const [switchDomainMutation] = useMutation<SwitchDomainMutation>(SwitchDomain);
    const {user, setCurrentUser} = useCurrentUser();
    const {domainPublicId} = useParams();
    const switchDomain = async (domainPublicId: string) => {
        await switchDomainMutation({
            variables: {
                domainPublicId: domainPublicId!
            }
        }).then(value => {
            const {jwt, user} = value.data!.switchDomain!;
            const applications: Application[] = getUserApplications(user);
            setCurrentUser({
                jwtToken: jwt,
                user: user,
                applications: applications
            });
        });
    };

    if (domainPublicId !== user!.user.domainPublicId) {
        switchDomain(domainPublicId!);
        return <></>;
    }
    return <>{children}</>;
}

export function Authenticated({children}: { children: React.JSX.Element }) {
    const {user, deleteCurrentUser} = useCurrentUser();
    const {applicationId, domainPublicId} = useParams();

    if (!user) {
        return <Navigate to={"/login"}/>;
    }

    if (!domainPublicId) {
        return <Navigate to={`/${applicationId}/${user!.user.domainPublicId}`}></Navigate>
    }

    const httpLink = createUploadLink({uri: process.env.REACT_APP_BACKEND_URL + '/graphql'})
    const authMiddleware = new ApolloLink((operation, forward) => {
        operation.setContext(({headers = {}}) => ({
            headers: {
                ...headers,
                authorization: 'Bearer ' + JSON.parse(localStorage.getItem(CURRENT_USER_KEY)!).jwtToken,
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
                    case 'Institution':
                        const institution = object as Institution;
                        return `Institution:${institution.id}:${institution.bic}`;
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
        <AssureCorrectDomainJWT children={children}/>
    </ApolloProvider>;
}