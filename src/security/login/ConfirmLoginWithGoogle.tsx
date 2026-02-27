import './loginWithGoogle'
import {useMutation} from "@apollo/client/react";
import {LoginWithGoogle, LoginWithGoogleMutation} from "../../types";
import React, {useContext} from "react";
import {ShowBackdropContext} from "../../utils/DrawerAppBar";
import {useCurrentUser} from "../../utils/users/use-current-user";
import getUserApplications, {Application} from "../../utils/applications/applications-access";
import {Navigate} from "react-router-dom";

export function ConfirmLoginWithGoogle({googleToken}: { googleToken: string }) {
    const [loginWithGoogleGraphqlMutation, loginWithGoogleGraphqlMutationResult] = useMutation<LoginWithGoogleMutation>(LoginWithGoogle);
    const {setShowBackdrop} = useContext(ShowBackdropContext);
    const {user, setCurrentUser} = useCurrentUser();


    if (loginWithGoogleGraphqlMutationResult.called || loginWithGoogleGraphqlMutationResult.loading) {
        return <></>;
    } else if (user) {
        return <Navigate to={'/'}></Navigate>;
    } else {
        loginWithGoogleGraphqlMutation({variables: {token: googleToken}})
            .catch((error) =>
                console.log(error)
            )
            .then(value => {
                if (!value || !value.data) return;
                const {jwt, user} = value!.data!.loginWithGoogleToken!
                const applications: Application[] = getUserApplications(user);
                setCurrentUser({
                    jwtToken: jwt,
                    user: user,
                    applications: applications
                });

            })
            .finally(() => {
                setShowBackdrop(false);
            });

        return <></>;
    }
}
