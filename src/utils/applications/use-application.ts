import {useCurrentUser} from "../users/use-current-user";
import {useNavigate, useParams} from "react-router-dom";

export function useApplication() {
    const navigate = useNavigate();
    const {user} = useCurrentUser();
    const {applicationId, domainId} = useParams();

    return {
        currentApplicationId: applicationId,
        changeCurrentApplicationId: (newApplicationId: string) => {
            if (!user!.applications.find(app => app.id === newApplicationId))
                throw Error("Application not assigned to the user");
            navigate('/' + newApplicationId + '/' + domainId!);
        }
    };

}