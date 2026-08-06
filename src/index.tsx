import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import {createBrowserRouter, Navigate, RouterProvider, useRouteError} from "react-router-dom";
import {Authenticated} from "./security/Authenticated";
import {Login} from "./security/login/Login";
import {ApolloClient, HttpLink, InMemoryCache} from "@apollo/client";
import {ApolloProvider} from "@apollo/client/react";
import '@fontsource/inter/300.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import {Register} from "./security/register/Register";
import DrawerAppBar from "./utils/DrawerAppBar";
import {GlobalBackdropProvider} from "./utils/GlobalBackdropContext";
import {Dispatcher} from "./application/components/dispatchers/Dispatcher";
import {Alert, AlertTitle, Button, Stack} from "@mui/material";
import CssBaseline from "@mui/material/CssBaseline";
import {AppThemeProvider} from "./utils/ThemeContext";
import {LocalizationProvider} from "@mui/x-date-pickers";
import {AdapterDayjs} from "@mui/x-date-pickers/AdapterDayjs";
import {logError} from "./utils/logger";
import 'dayjs/locale/pl'

const httpLink = new HttpLink({uri: process.env.REACT_APP_BACKEND_URL + '/auth/graphql'});

const apolloClient = new ApolloClient({
    cache: new InMemoryCache(),
    link: httpLink
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
            <AppThemeProvider>
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <CssBaseline/>
                    <GlobalBackdropProvider>
                        <Authenticated>
                            <DrawerAppBar>
                                <Dispatcher/>
                            </DrawerAppBar>
                        </Authenticated>
                    </GlobalBackdropProvider>
                </LocalizationProvider>
            </AppThemeProvider>,
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