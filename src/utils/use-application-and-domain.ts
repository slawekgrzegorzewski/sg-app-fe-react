import {useNavigate, useParams} from "react-router-dom";
import {Application, ApplicationId} from "./applications/applications-access";
import {DomainSimple} from "../types";
import {useCurrentUser} from "./users/use-current-user";

export function useApplicationAndDomain() {
    const navigate = useNavigate();
    const {user} = useCurrentUser();
    const {applicationId, domainId} = useParams();

    return {
        currentApplicationId: (applicationId as ApplicationId),
        currentDomainId: Number(domainId),
        changeCurrentSettings: (newApplicationId: ApplicationId, newDomainId: number) => {
            if (applicationId! === newApplicationId && Number(domainId!) === newDomainId) {
                return;
            }
            if (!user!.applications.find((app: Application) => app.id === newApplicationId))
                throw Error("Application not assigned to the user");
            if (!user!.user.domains.find((domain: DomainSimple) => domain.id === newDomainId))
                throw Error("Domain not assigned to the user");
            navigate('/' + newApplicationId + '/' + newDomainId!);
        }
    };

}