import {useCurrentUser} from "../users/use-current-user";
import {useNavigate, useParams} from "react-router-dom";
import {ApplicationId} from "./applications-access";

export function useApplication() {
    const navigate = useNavigate();
    const {user} = useCurrentUser();
    const {applicationId, domainPublicId} = useParams();

    return {
        currentApplicationId: (applicationId as ApplicationId),
        changeCurrentApplicationId: (newApplicationId: ApplicationId) => {
            if (newApplicationId === (applicationId as ApplicationId))
                return;
            if (!user!.applications.find(app => app.id === newApplicationId))
                throw Error("Application not assigned to the user");
            navigate('/' + newApplicationId + '/' + domainPublicId!);
        }
    };

}