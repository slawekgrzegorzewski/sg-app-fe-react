import React, {useState} from "react";
import {Navigate} from "react-router-dom";
import {useMutation} from "@apollo/client";
import {Login as GraphqlLogin, LoginMutation} from "../../types";
import {CURRENT_DOMAIN_ID, JWT_TOKEN, LOGGED_IN_USER} from "../../common/local-storage-keys";
import {getDomainId} from "../../common/domain-utils";
import {Button, Link, Paper, Stack, TextField} from "@mui/material";
import getUserApplications from "../../application/applications-access";

export function Login({afterLogin}: { afterLogin: string }) {

    const [login, setLogin] = useState('');
    const [password, setPassword] = useState('');
    const [otp, setOtp] = useState('');

    const [jwt, setJWT] = useState(localStorage.getItem(JWT_TOKEN));

    const [loginGraphqlMutation, {called}] = useMutation<LoginMutation>(GraphqlLogin, {
        variables: {
            login: login,
            password: password,
            otp: otp
        }
    });

    function performLogin() {
        loginGraphqlMutation().then(value => {
            const {jwt, user} = value.data?.login!;
            localStorage.setItem(JWT_TOKEN, jwt);
            localStorage.setItem(LOGGED_IN_USER, JSON.stringify(user));
            localStorage.setItem(CURRENT_DOMAIN_ID, String(getDomainId(user.domains, user.defaultDomainId)));
            const userApplications = getUserApplications(user);
            setJWT(jwt);
        })
    }

    function validateLoginForm() {
        function stringNotEmpty(value: string) {
            return value !== null && value.length > 0;
        }

        return stringNotEmpty(login)
            && stringNotEmpty(password)
            && stringNotEmpty(otp);
    }

    if (jwt) {
        return <Navigate to={{
            pathname: afterLogin
        }}></Navigate>
    } else if (called) {
        return <></>
    } else {
        return <Stack alignItems={"center"} justifyContent={"center"} height={'100vh'}>
            <Paper elevation={6} sx={{width: 400, padding: 5}}>
                <Stack direction={"column"} spacing={4} alignItems={"center"}>
                    <p style={{fontWeight: 700}}>LOGOWANIE</p>
                    <TextField label="Login"
                               variant="standard"
                               onChange={event => setLogin(event.target.value)}
                               sx={{width: '100%'}}
                               required/>
                    <TextField label="Hasło"
                               variant="standard"
                               type="password"
                               onChange={event => setPassword(event.target.value)}
                               sx={{width: '100%'}}
                               required/>
                    <TextField label="OTP"
                               variant="standard"
                               onChange={event => setOtp(event.target.value)}
                               sx={{width: '100%'}}
                               required/>
                    {(
                        <Button
                            variant="outlined"
                            onClick={performLogin}
                            disabled={!validateLoginForm()}>
                            Zaloguj się
                        </Button>
                    )}
                    <p>Nie masz jeszcze konta? <Link href="/register">Zarejestruj się tutaj</Link></p>
                </Stack>
            </Paper>
        </Stack>
    }
}
