import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import reportWebVitals from './reportWebVitals';
import {createBrowserRouter, RouterProvider} from "react-router-dom";
import {QueryClient, QueryClientProvider} from "react-query";
import {Login} from "./security/Login";
import {Authenticate} from "./security/Authenticate";
import {Authenticated} from "./security/Authenticated";
import {Home} from "./Home";

const queryClient = new QueryClient();

const router = createBrowserRouter([
    {
        path: "/login",
        element:
            <Login navigateTo={'/home'}/>
    },
    {
        path: "/authenticate",
        element:
            <QueryClientProvider client={queryClient}>
                <Authenticate/>
            </QueryClientProvider>
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
