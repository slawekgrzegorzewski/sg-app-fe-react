import {useNavigate, useParams} from "react-router-dom";
import {useCurrentUser} from "../users/use-current-user";

export function useDomain() {
    const navigate = useNavigate();
    const {user} = useCurrentUser();
    const {applicationId, domainId} = useParams();

    return {
        currentDomainId: Number(domainId),
        changeCurrentDomainId: (newDomainId: number) => {
            if (newDomainId === Number(domainId))
                return;
            if (!user!.user.domains.find(domain => domain.id === newDomainId))
                throw Error("Domain not assigned to the user");
            navigate('/' + applicationId + '/' + newDomainId);
        }
    };
}