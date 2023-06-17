import {useQuery} from "react-query";
import {useSearchParams} from "react-router-dom";
import React from "react";
import {Me} from "./Me";
import {Authenticated} from "./Authenticated";

export type Token = {
    id_token: string,
    access_token: string,
    refresh_token: string,
    expires_in: number,
    token_type: string
}

export function Authenticate() {
    let [searchParams] = useSearchParams();

    async function getToken(): Promise<Token> {

        function formEntry(name: string, value: string): string {
            return encodeURIComponent(name) + "=" + encodeURIComponent(value);
        }

        const form = [
            formEntry('grant_type', 'authorization_code'),
            formEntry('client_id', '2bv3i268vv3v1f5kmfo2sqljfa'),
            formEntry('code', searchParams.get('code')!),
            formEntry('redirect_uri', 'http://grzegorzewski.fun/authenticate')
        ]

        return (await fetch('https://sg-app.auth.eu-central-1.amazoncognito.com/oauth2/token', {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            method: 'POST',
            body: form.join("&")
        })).json();
    }

    const {data} = useQuery('token', getToken);

    if (data) {
        localStorage.setItem("tokens", JSON.stringify(data));
        return <Authenticated><Me/></Authenticated>
    }

    return <></>;
}
