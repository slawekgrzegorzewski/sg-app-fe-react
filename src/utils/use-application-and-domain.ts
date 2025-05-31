import {useNavigate, useParams} from "react-router-dom";
import {Application, ApplicationId} from "./applications/applications-access";
import {DomainSimple} from "../types";
import {useCurrentUser} from "./users/use-current-user";

export function useApplicationAndDomain() {
    const navigate = useNavigate();
    const {user} = useCurrentUser();
    const {applicationId, domainPublicId} = useParams();

    return {
        currentApplicationId: (applicationId as ApplicationId),
        currentDomainPublicId: domainPublicId,
        changeCurrentSettings: (newApplicationId: ApplicationId, currentDomainPublicId: string) => {
            if (applicationId! === newApplicationId && domainPublicId! === currentDomainPublicId) {
                return;
            }
            if (!user!.applications.find((app: Application) => app.id === newApplicationId))
                throw Error("Application not assigned to the user");
            if (!user!.user.domains.find((domain: DomainSimple) => domain.publicId === currentDomainPublicId))
                throw Error("Domain not assigned to the user");
            navigate('/' + newApplicationId + '/' + currentDomainPublicId!);
        }
    };

}