import {useNavigate, useParams} from "react-router-dom";

export function useApplicationNavigation() {
    const navigate = useNavigate();
    const {applicationId, domainId, page} = useParams();

    const toParamsString = (params: string[]) => {
        return `${params.length > 0 ? '/' : ''}${params.join('/')}`;
    }

    return {
        changePage: (page: string, params: string[] = []) => navigate('/' + applicationId + '/' + domainId +'/' + page + toParamsString(params)),
        changePageParams: (params: string[]) => navigate('/' + applicationId + '/' + domainId +'/' + page + toParamsString(params)),
    }

}