import {useNavigate, useParams} from "react-router-dom";

export function useApplicationNavigation() {
    const navigate = useNavigate();
    const {applicationId, domainPublicId, page} = useParams();

    const toParamsString = (params: string[]) => {
        return `${params.length > 0 ? '/' : ''}${params.join('/')}`;
    }

    return {
        changePage: (page: string, params: string[] = []) => navigate('/' + applicationId + '/' + domainPublicId +'/' + page + toParamsString(params)),
        changePageParams: (params: string[]) => navigate('/' + applicationId + '/' + domainPublicId +'/' + page + toParamsString(params)),
    }

}