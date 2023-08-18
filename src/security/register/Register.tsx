import React, {useState} from "react";
import {Navigate, useNavigate} from "react-router-dom";
import {useMutation} from "@apollo/client";
import {
    Register as GraphqlRegister,
    RegisterMutation,
    SetupMfa as GraphqlSetupMfa,
    SetupMfaMutation
} from "../../types";
import {Button, Link, Paper, Stack, TextField} from "@mui/material";

export function Register({afterRegistration}: { afterRegistration: string }) {

    const navigate = useNavigate();

    const [login, setLogin] = useState('');
    const [email, setEmail] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [password, setPassword] = useState('');
    const [repeatedPassword, setRepeatedPassword] = useState('');
    const [qrLink, setQrLink] = useState('');
    const [mfaSecret, setMfaSecret] = useState('');
    const [otp, setOtp] = useState('');

    const [registerGraphqlMutation, registerResult] = useMutation<RegisterMutation>(GraphqlRegister, {
        variables: {
            firstName: firstName,
            lastName: lastName,
            login: login,
            email: email,
            password: password,
            repeatedPassword: repeatedPassword,
        }
    });

    const [setupMFArGraphqlMutation, setupMFAResult] = useMutation<SetupMfaMutation>(GraphqlSetupMfa, {
        variables: {
            login: login,
            password: password,
            otp: otp,
        }
    });

    function stringNotEmpty(value: string) {
        return value !== null && value.length > 0;
    }

    function validateRegistrationForm() {
        return stringNotEmpty(firstName)
            && stringNotEmpty(lastName)
            && stringNotEmpty(login)
            && stringNotEmpty(email)
            && stringNotEmpty(password)
            && stringNotEmpty(repeatedPassword)
            && password === repeatedPassword;
    }

    function validateMFASetupForm() {
        return stringNotEmpty(login)
            && stringNotEmpty(password)
            && stringNotEmpty(otp);
    }

    function performRegistration() {
        registerGraphqlMutation().then(value => {
            setMfaSecret(value.data?.register?.mfaCode!);
            setQrLink(value.data?.register?.qrLink!);
        })
    }

    function setupMFA() {
        setupMFArGraphqlMutation().then(value => {
            if (value.data?.setupMFA!) {
                navigate("/login");
            }
        })
    }

    if (setupMFAResult.called) {
        return <Navigate to={{
            pathname: '/name'
        }}></Navigate>;
    } else if (qrLink) {
        return <Stack alignItems={"center"} justifyContent={{xs: 'flex-start', lg: 'center'}} height={{lg: '100vh'}}>
            <Paper elevation={6} sx={{width: 400, padding: 5}}>
                <Stack direction={"column"} spacing={4} alignItems={"center"}>
                    <p style={{fontWeight: 700}}>Konfigurowanie MFA</p>
                    <img src={qrLink} alt={''}></img>
                    <TextField label="Kod"
                               variant="standard"
                               value={mfaSecret}
                               sx={{width: '100%'}}
                               disabled={true}/>
                    <TextField label="Przepisz kod z aplikacji"
                               variant="standard"
                               onChange={event => setOtp(event.target.value)}
                               sx={{width: '100%'}}
                               required/>
                    <Button variant="outlined" onClick={setupMFA} disabled={!validateMFASetupForm()}>
                        Zapisz
                    </Button>
                </Stack>
            </Paper>
        </Stack>
    } else if (registerResult.called) {
        return <></>
    } else {
        return <Stack alignItems={"center"} justifyContent={{xs: 'flex-start', lg: 'center'}} height={{lg: '100vh'}}>
            <Paper elevation={6} sx={{width: 400, padding: 5}}>
                <Stack direction={"column"} spacing={4} alignItems={"center"}>
                    <p style={{fontWeight: 700}}>REJESTRACJA</p>
                    <TextField label="Imię"
                               variant="standard"
                               onChange={event => setFirstName(event.target.value)}
                               sx={{width: '100%'}}
                               required/>
                    <TextField label="Nazwisko"
                               variant="standard"
                               onChange={event => setLastName(event.target.value)}
                               sx={{width: '100%'}}
                               required/>
                    <TextField label="e-mail"
                               variant="standard"
                               onChange={event => setEmail(event.target.value)}
                               sx={{width: '100%'}}
                               required/>
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
                    <TextField label="Powtórz hasło"
                               variant="standard"
                               type="password"
                               onChange={event => setRepeatedPassword(event.target.value)}
                               sx={{width: '100%'}}
                               required/>
                    <Button variant="outlined" onClick={performRegistration} disabled={!validateRegistrationForm()}>
                        Zarejestruj się
                    </Button>
                    <p>Masz już konto? <Link href="/login">Zaloguj się tutaj</Link></p>
                </Stack>
            </Paper>
        </Stack>
    }
}
