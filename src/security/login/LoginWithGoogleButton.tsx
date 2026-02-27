import React, {useEffect} from "react";
import {useParams} from "react-router-dom";
import './loginWithGoogle'
import {ConfirmLoginWithGoogle} from "./ConfirmLoginWithGoogle";

export function LoginWithGoogleButton() {

    const {googleToken} = useParams();

    useEffect(() => {
        window.handleCredentialResponse = (response: { credential: string; }) => {
            document.location = document.location + "/" + response.credential;
        };
    }, []);

    if (googleToken) {
        return <ConfirmLoginWithGoogle googleToken={googleToken}></ConfirmLoginWithGoogle>;
    } else {
        return <>
            <script src="https://accounts.google.com/gsi/client" async></script>

            <div
                id="g_id_onload"
                data-auto_prompt="false"
                data-callback="handleCredentialResponse"
                data-client_id="880691357570-s64ussnotpojatf4ppk85e7k6s8lk3cf.apps.googleusercontent.com"
            >
            </div>
            <div className="g_id_signin">

            </div>
        </>
    }
}
