import {User} from "../../types";
import {Application} from "../applications/applications-access";
import {useState} from "react";
import {useNavigate} from "react-router-dom";

export type CurrentUser = {
    jwtToken: String,
    user: User,
    applications: Application[]
}

export function useCurrentUser() {

    const navigate = useNavigate();
    const getCurrentUser = (): CurrentUser | null => {
        const currentUserInLS = localStorage.getItem("currentUser");
        return currentUserInLS ? JSON.parse(currentUserInLS!) : null;
    };

    const [currentUser, setCurrentUser] = useState(getCurrentUser());

    const storeCurrentUser = (currentUser: CurrentUser) => {
        localStorage.setItem("currentUser", JSON.stringify(currentUser));
        setCurrentUser(currentUser);
        navigate('/' + currentUser!.applications[0].id + '/' + currentUser!.user.defaultDomainId);
    }

    const deleteCurrentUser = () => {
        localStorage.removeItem("currentUser");
        setCurrentUser(null);
        navigate('/login');
    }

    return {user: currentUser, setCurrentUser: storeCurrentUser, deleteCurrentUser: deleteCurrentUser};
}