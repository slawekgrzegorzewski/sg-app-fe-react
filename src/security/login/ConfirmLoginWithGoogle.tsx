import './loginWithGoogle';
import {useMutation} from '@apollo/client/react';
import {LoginWithGoogle, LoginWithGoogleMutation} from '../../types';
import React, {useEffect, useRef} from 'react';
import {useCurrentUser} from '../../utils/users/use-current-user';
import getUserApplications from '../../utils/applications/applications-access';
import {Navigate} from 'react-router-dom';
import {logError} from '../../utils/logger';

export function ConfirmLoginWithGoogle({googleToken}: {googleToken: string}) {
    const [loginWithGoogleGraphqlMutation] = useMutation<LoginWithGoogleMutation>(LoginWithGoogle);
    const {user, setCurrentUser} = useCurrentUser();

    const exchangedToken = useRef<string | null>(null);

    useEffect(() => {
        if (!googleToken || exchangedToken.current === googleToken) {
            return;
        }
        exchangedToken.current = googleToken;

        let cancelled = false;
        loginWithGoogleGraphqlMutation({variables: {token: googleToken}})
            .then(value => {
                const loggedIn = value.data?.loginWithGoogleToken;
                if (cancelled || !loggedIn) {
                    return;
                }
                setCurrentUser({
                    jwtToken: loggedIn.jwt,
                    user: loggedIn.user,
                    applications: getUserApplications(loggedIn.user),
                });
            })
            .catch(error => {
                exchangedToken.current = null;
                logError('Google login failed', error);
            });

        return () => {
            cancelled = true;
        };
    }, [googleToken, loginWithGoogleGraphqlMutation, setCurrentUser]);

    if (user) {
        return <Navigate to={'/'} />;
    }
    return <></>;
}
