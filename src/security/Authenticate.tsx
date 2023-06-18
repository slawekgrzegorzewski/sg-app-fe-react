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
            formEntry('client_id', process.env.COGNITO_CLIENT_ID!),
            formEntry('code', searchParams.get('code')!),
            formEntry('redirect_uri', process.env.COGNITO_REDIRECT_URI!)
        ]

        return (await fetch(process.env.COGNITO_TOKEN_URI!, {
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
