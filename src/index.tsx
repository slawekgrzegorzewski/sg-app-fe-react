import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import reportWebVitals from './reportWebVitals';
import {createBrowserRouter, RouterProvider} from "react-router-dom";
import {QueryClient, QueryClientProvider} from "react-query";
import {Authenticated} from "./security/Authenticated";
import {Home} from "./Home";
import {Login} from "./security/login/Login";
import {ApolloClient, ApolloProvider, HttpLink, InMemoryCache} from "@apollo/client";

const queryClient = new QueryClient();


const httpLink = new HttpLink({uri: process.env.REACT_APP_BACKEND_URL + '/graphql'});

const apolloClient = new ApolloClient({
    cache: new InMemoryCache(),
    link: httpLink
});

const router = createBrowserRouter([
    {
        path: "/login",
        element: <ApolloProvider client={apolloClient}>
            <Login afterLogin={'/home'}/>
        </ApolloProvider>
    },
    {
        path: "/home",
        element:
            <QueryClientProvider client={queryClient}>
                <Authenticated>
                    <Home/>
                </Authenticated>
            </QueryClientProvider>
    },
]);

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(
    <React.StrictMode>
        <RouterProvider router={router}/>
    </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals(console.log);
