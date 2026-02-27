import {User} from "../../types";
import {Application} from "../applications/applications-access";
import {useState} from "react";
import {useLocation, useNavigate} from "react-router-dom";

export type CurrentUser = {
    jwtToken: String,
    user: User,
    applications: Application[]
}

export const CURRENT_USER_KEY = "newApp_currentUser";

export function useCurrentUser() {

    const location = useLocation();
    const navigate = useNavigate();
    const getCurrentUser = (): CurrentUser | null => {
        const currentUserInLS = localStorage.getItem(CURRENT_USER_KEY);
        const currentUser = currentUserInLS ? JSON.parse(currentUserInLS!) : null;
        if (currentUser) {
            if (currentUser.user.hasOwnProperty("defaultDomainId")) {
                localStorage.removeItem(CURRENT_USER_KEY);
                navigateToLoginPage();
                return null;
            }
        }
        return currentUser;
    };

    const [currentUser, setCurrentUser] = useState(getCurrentUser());

    const storeCurrentUser = (currentUser: CurrentUser) => {
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(currentUser));
        setCurrentUser(currentUser);
        navigate('/' + currentUser!.applications[0].id + '/' + currentUser!.user.domainPublicId);
    }

    function navigateToLoginPage() {
        document.location = document.location.href.replace(location.pathname, '/login');
    }

    const deleteCurrentUser = () => {
        localStorage.removeItem(CURRENT_USER_KEY);
        setCurrentUser(null);
        navigateToLoginPage();
    }

    return {user: currentUser, setCurrentUser: storeCurrentUser, deleteCurrentUser: deleteCurrentUser};
}