import React from "react";
import {Navigate} from "react-router-dom";

export function Login({navigateTo}: { navigateTo: string }) {
    if (localStorage.getItem("tokens")) {
        return <Navigate to={{
            pathname: navigateTo
        }}></Navigate>
    } else {
        const link = 'https://sg-app.auth.eu-central-1.amazoncognito.com/login?' +
            'response_type=code' +
            '&client_id=2bv3i268vv3v1f5kmfo2sqljfa' +
            '&redirect_uri=http://localhost:3000/authenticate';
        return <a href={link}>Login</a>
    }
}
