import React, {useState} from "react";
import {useNavigate} from "react-router-dom";
import {useMutation} from "@apollo/client";
import {
    Register as GraphqlRegister,
    RegisterMutation,
    SetupMfa as GraphqlSetupMfa,
    SetupMfaMutation
} from "../../types";
import {Button, Link, Paper, Stack, TextField} from "@mui/material";


export function Register() {

    const navigate = useNavigate();

    const [registrationParams, setRegistrationParams] = useState({
        firstName: '',
        lastName: '',
        login: '',
        email: '',
        password: '',
        repeatedPassword: ''
    });

    const [setupMfaParams, setSetupMfaParams] = useState({
        login: '',
        password: '',
        otp: '',
        qrLink: '',
        mfaSecret: ''
    });

    const [registerGraphqlMutation, registerResult] = useMutation<RegisterMutation>(GraphqlRegister, {
        variables: registrationParams
    });

    const [setupMFArGraphqlMutation, setupMFAResult] = useMutation<SetupMfaMutation>(GraphqlSetupMfa, {
        variables: setupMfaParams
    });

    function stringNotEmpty(value: string) {
        return value !== null && value.length > 0;
    }

    function validateRegistrationForm() {
        return stringNotEmpty(registrationParams.firstName)
            && stringNotEmpty(registrationParams.lastName)
            && stringNotEmpty(registrationParams.login)
            && stringNotEmpty(registrationParams.email)
            && stringNotEmpty(registrationParams.password)
            && stringNotEmpty(registrationParams.repeatedPassword)
            && registrationParams.password === registrationParams.repeatedPassword;
    }

    function validateMFASetupForm() {
        return stringNotEmpty(setupMfaParams.login)
            && stringNotEmpty(setupMfaParams.password)
            && stringNotEmpty(setupMfaParams.otp);
    }

    function performRegistration() {
        registerGraphqlMutation().then(value => {
            setSetupMfaParams({
                ...setupMfaParams,
                mfaSecret: value.data?.register?.mfaCode!,
                qrLink: value.data?.register?.qrLink!
            });
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
        return <></>;
    } else if (setupMfaParams.qrLink) {
        return <Stack alignItems={"center"} justifyContent={"center"} height={'100vh'}>
            <Paper elevation={6} sx={{width: 400, padding: 5}}>
                <Stack direction={"column"} spacing={4} alignItems={"center"}>
                    <p style={{fontWeight: 700}}>Konfigurowanie MFA</p>
                    <img src={setupMfaParams.qrLink} alt={''}></img>
                    <TextField label="Kod"
                               variant="standard"
                               value={setupMfaParams.mfaSecret}
                               sx={{width: '100%'}}
                               disabled={true}/>
                    <TextField label="Przepisz kod z aplikacji"
                               variant="standard"
                               onChange={event => setSetupMfaParams({
                                   ...setupMfaParams,
                                   otp: event.target.value
                               })}
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
        return <Stack alignItems={"center"} justifyContent={"center"} height={'100vh'}>
            <Paper elevation={6} sx={{width: 400, padding: 5}}>
                <Stack direction={"column"} spacing={4} alignItems={"center"}>
                    <p style={{fontWeight: 700}}>REJESTRACJA</p>
                    <TextField label="Imię"
                               variant="standard"
                               onChange={event => setRegistrationParams({
                                   ...registrationParams,
                                   firstName: event.target.value
                               })}
                               sx={{width: '100%'}}
                               required/>
                    <TextField label="Nazwisko"
                               variant="standard"
                               onChange={event => setRegistrationParams({
                                   ...registrationParams,
                                   lastName: event.target.value
                               })}
                               sx={{width: '100%'}}
                               required/>
                    <TextField label="e-mail"
                               variant="standard"
                               onChange={event => setRegistrationParams({
                                   ...registrationParams,
                                   email: event.target.value
                               })}
                               sx={{width: '100%'}}
                               required/>
                    <TextField label="Login"
                               variant="standard"
                               onChange={event => {
                                   setRegistrationParams({
                                       ...registrationParams,
                                       login: event.target.value
                                   });
                                   setSetupMfaParams({
                                       ...setupMfaParams,
                                       login: event.target.value
                                   });
                               }}
                               sx={{width: '100%'}}
                               required/>
                    <TextField label="Hasło"
                               variant="standard"
                               type="password"
                               onChange={event => {
                                   setRegistrationParams({
                                       ...registrationParams,
                                       password: event.target.value
                                   });
                                   setSetupMfaParams({
                                       ...setupMfaParams,
                                       password: event.target.value
                                   });
                               }}
                               sx={{width: '100%'}}
                               required/>
                    <TextField label="Powtórz hasło"
                               variant="standard"
                               type="password"
                               onChange={event => setRegistrationParams({
                                   ...registrationParams,
                                   repeatedPassword: event.target.value
                               })}
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
