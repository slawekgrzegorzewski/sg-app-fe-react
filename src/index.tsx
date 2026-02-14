import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import reportWebVitals from './reportWebVitals';
import {createBrowserRouter, Navigate, RouterProvider, useRouteError} from "react-router-dom";
import {Authenticated} from "./security/Authenticated";
import {Login} from "./security/login/Login";
import {ApolloClient, HttpLink, InMemoryCache} from "@apollo/client";
import {ApolloProvider} from "@apollo/client/react";
import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';
import {Register} from "./security/register/Register";
import DrawerAppBar from "./utils/DrawerAppBar";
import {Dispatcher} from "./application/components/dispatchers/Dispatcher";
import CssBaseline from "@mui/material/CssBaseline";
import {createTheme, ThemeProvider} from "@mui/material";
import {LocalizationProvider} from "@mui/x-date-pickers";
import {AdapterDayjs} from "@mui/x-date-pickers/AdapterDayjs";
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import 'dayjs/locale/pl'

const queryClient = new QueryClient();

const httpLink = new HttpLink({uri: process.env.REACT_APP_BACKEND_URL + '/graphql'});

const apolloClient = new ApolloClient({
    cache: new InMemoryCache(),
    link: httpLink
});

const theme = createTheme({
    // palette: {
    //     mode: 'dark',
    // },
    palette: {
        primary: {
            main: "#2a9461"
        },
        secondary: {
            main: "#494c7d"
        }
    },
});

const router = createBrowserRouter([
    {
        path: '',
        element: <Navigate to={process.env.REACT_APP_BROWSER_DEFAULT_REDIRECT || '/login'}/>,
    },
    {
        path: "/login",
        element: <ApolloProvider client={apolloClient}>
            <Login/>
        </ApolloProvider>
    },
    {
        path: "/register",
        element: <ApolloProvider client={apolloClient}>
            <Register/>
        </ApolloProvider>
    },
    {
        path: "/:applicationId/:domainPublicId?/:page?/:param1?",
        element:
            <QueryClientProvider client={queryClient}>
                <ThemeProvider theme={theme}>
                    <LocalizationProvider dateAdapter={AdapterDayjs}>
                        <CssBaseline/>
                        <Authenticated>
                            <DrawerAppBar>
                                <Dispatcher/>
                            </DrawerAppBar>
                        </Authenticated>
                    </LocalizationProvider>
                </ThemeProvider>
            </QueryClientProvider>,
        errorElement: <ErrorBoundary/>
    }
], {
    basename: process.env.REACT_APP_BROWSER_HISTORY_BASENAME
});

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

function ErrorBoundary() {
    let error = useRouteError();
    console.error(error);
    // Uncaught ReferenceError: path is not defined
    return <div>Dang!</div>;
}