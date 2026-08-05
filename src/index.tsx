import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
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
import {Alert, AlertTitle, Button, createTheme, Stack, ThemeProvider} from "@mui/material";
import {LocalizationProvider} from "@mui/x-date-pickers";
import {AdapterDayjs} from "@mui/x-date-pickers/AdapterDayjs";
import {logError} from "./utils/logger";
import 'dayjs/locale/pl'

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
        path: "/login/:googleToken?",
        element: <ApolloProvider client={apolloClient}>
            <Login/>
        </ApolloProvider>,
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
            <ThemeProvider theme={theme}>
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <CssBaseline/>
                    <Authenticated>
                        <DrawerAppBar>
                            <Dispatcher/>
                        </DrawerAppBar>
                    </Authenticated>
                </LocalizationProvider>
            </ThemeProvider>,
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

function ErrorBoundary() {
    const error = useRouteError();
    logError('Unhandled routing error', error);

    return <Stack alignItems={'center'} justifyContent={'center'} height={'100vh'} spacing={2}>
        <Alert severity={'error'}>
            <AlertTitle>Coś poszło nie tak</AlertTitle>
            {error instanceof Error ? error.message : 'Nieznany błąd.'}
        </Alert>
        <Button variant={'outlined'} onClick={() => window.location.reload()}>Odśwież stronę</Button>
    </Stack>;
}