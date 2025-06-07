import {User} from "../../types";
import {Application} from "../applications/applications-access";
import {useState} from "react";
import {useNavigate} from "react-router-dom";

export type CurrentUser = {
    jwtToken: String,
    user: User,
    applications: Application[]
}

export const CURRENT_USER_KEY = "newApp_currentUser";

export function useCurrentUser() {

    const navigate = useNavigate();
    const getCurrentUser = (): CurrentUser | null => {
        const currentUserInLS = localStorage.getItem(CURRENT_USER_KEY);
        const currentUser = currentUserInLS ? JSON.parse(currentUserInLS!) : null;
        if(currentUser) {
            if(currentUser.user.hasOwnProperty("defaultDomainId")) {
                localStorage.removeItem(CURRENT_USER_KEY);
                navigate('/login');
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

    const deleteCurrentUser = () => {
        localStorage.removeItem(CURRENT_USER_KEY);
        setCurrentUser(null);
        navigate('/login');
    }

    return {user: currentUser, setCurrentUser: storeCurrentUser, deleteCurrentUser: deleteCurrentUser};
}