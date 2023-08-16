import React, {useState} from "react";
import {Navigate} from "react-router-dom";
import {useLazyQuery} from "@apollo/client";
import {Login as GraphqlLogin, LoginQuery} from "../../types";
import {CURRENT_DOMAIN_ID, JWT_TOKEN, LOGGED_IN_USER} from "../../common/local-storage-keys";
import {getDomainId} from "../../common/domain-utils";

export function Login({afterLogin}: { afterLogin: string }) {

    const [login, setLogin] = useState('');
    const [password, setPassword] = useState('');
    const [otp, setOtp] = useState('');

    const [jwt, setJWT] = useState(localStorage.getItem(JWT_TOKEN));

    const [loginGraphqlQuery, {called}] = useLazyQuery<LoginQuery>(GraphqlLogin, {
        variables: {
            login: login,
            password: password,
            otp: otp
        }
    });

    function performLogin() {


        loginGraphqlQuery().then(value => {
            const {jwt, user} = value.data?.login!;
            localStorage.setItem(JWT_TOKEN, jwt);
            localStorage.setItem(LOGGED_IN_USER, JSON.stringify(user));
            localStorage.setItem(CURRENT_DOMAIN_ID, String(getDomainId(user.domains, user.defaultDomainId)));
            setJWT(jwt);
        })
    }

    if (jwt) {
        return <Navigate to={{
            pathname: afterLogin
        }}></Navigate>
    } else if (called) {
        return <></>
    } else {
        return <>
            <input type="text" id="user" name="user" placeholder="Nazwa użytkownika" title="Wprowadź nazwę użytkownika"
                   onChange={event => setLogin(event.target.value)} required/>
            <input type="password" id="pass" name="pass" placeholder="Hasło" title="Wprowadź hasło"
                   onChange={event => setPassword(event.target.value)} required/>
            <input type="text" id="otp" name="otp" placeholder="Hasło jednorazowe" title="Wprowadćź hasło jednorazowe"
                   onChange={event => setOtp(event.target.value)} required/>
            <button onClick={performLogin}>Zaloguj się</button>
            <p>Nie masz jeszcze konta?<a>Zarejestruj się tutaj</a></p>
        </>
    }
}
