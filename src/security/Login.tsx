import React from "react";
import {Navigate} from "react-router-dom";

export function Login({navigateTo}: { navigateTo: string }) {
    if (localStorage.getItem("tokens")) {
        return <Navigate to={{
            pathname: navigateTo
        }}></Navigate>
    } else {
        console.log(JSON.stringify(process.env))
        const link = process.env.REACT_APP_COGNITO_LOGIN_URI! +
            '?response_type=code' +
            '&client_id=' + process.env.REACT_APP_COGNITO_CLIENT_ID! +
            '&redirect_uri=' + process.env.REACT_APP_COGNITO_REDIRECT_URI!;
        return <a href={link}>Login</a>
    }
}
