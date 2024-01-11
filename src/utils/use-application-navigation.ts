import {useNavigate, useParams} from "react-router-dom";

export function useApplicationNavigation() {
    const navigate = useNavigate();
    const {applicationId, domainId} = useParams();

    return (page: string) => navigate('/' + applicationId + '/' + domainId + '/' + page);

}