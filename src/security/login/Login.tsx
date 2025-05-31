import React, {useState} from "react";
import {useMutation} from "@apollo/client";
import {PerformLogin, PerformLoginMutation} from "../../types";
import {useCurrentUser} from "../../utils/users/use-current-user";
import {Button, Link, Paper, Skeleton, Stack, TextField} from "@mui/material";
import getUserApplications, {Application} from "../../utils/applications/applications-access";
import {Navigate} from "react-router-dom";

export function Login() {

    const {user, setCurrentUser} = useCurrentUser();

    const [loginData, setLoginData] = useState({
        login: '',
        password: '',
        otp: ''
    });

    const [loginGraphqlMutation, {called}] = useMutation<PerformLoginMutation>(PerformLogin, {
        variables: loginData
    });

    function performLogin() {
        loginGraphqlMutation().then(value => {
            const {jwt, user} = value.data!.login!;
            const applications: Application[] = getUserApplications(user);
            setCurrentUser({
                jwtToken: jwt,
                user: user,
                applications: applications
            });
        })
    }

    function validateLoginForm() {
        function stringNotEmpty(value: string) {
            return value !== null && value.length > 0;
        }

        return stringNotEmpty(loginData.login)
            && stringNotEmpty(loginData.password)
            && stringNotEmpty(loginData.otp);
    }

    if (user) {
        return <Navigate to={'/'}></Navigate>;
    }
    if (called) {
        return <Stack alignItems={"center"} justifyContent={"center"} height={'100vh'}>
            <Skeleton variant="rectangular" width={400} height={400}/>
        </Stack>;
    } else {
        return <Stack alignItems={"center"} justifyContent={{xs: 'flex-start', sm: 'center'}} height={{sm: '100vh'}}>
            <Paper elevation={6} sx={{maxWidth: 400, padding: 5}}>
                <Stack direction={"column"} spacing={4} alignItems={"center"}>
                    <p style={{fontWeight: 700}}>LOGOWANIE</p>
                    <TextField label="Login"
                               variant="standard"
                               onChange={event => setLoginData({
                                   ...loginData,
                                   login: event.target.value
                               })}
                               sx={{width: '100%'}}
                               required/>
                    <TextField label="Hasło"
                               variant="standard"
                               type="password"
                               onChange={event => setLoginData({
                                   ...loginData,
                                   password: event.target.value
                               })}
                               sx={{width: '100%'}}
                               required/>
                    <TextField label="OTP"
                               variant="standard"
                               onChange={event => setLoginData({
                                   ...loginData,
                                   otp: event.target.value
                               })}
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
