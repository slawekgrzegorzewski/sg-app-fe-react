import {redirect, useNavigate, useParams} from "react-router-dom";

export function useApplicationNavigation() {
    const navigate = useNavigate();
    const {applicationId, domainPublicId, page, param1} = useParams();

    const toParamsString = (params: string[]) => {
        return `${params.length > 0 ? '/' : ''}${params.join('/')}`;
    }

    function getDefinedParameters() {
        const definedParameters: string[] = [];
        if (applicationId) definedParameters.push(applicationId);
        else return definedParameters;
        if (domainPublicId) definedParameters.push(domainPublicId);
        else return definedParameters;
        if (page) definedParameters.push(page);
        else return definedParameters;
        if (param1) definedParameters.push(param1);
        return definedParameters;
    }

    function getPagePath(params: string[]) {
        return '/' + applicationId + '/' + domainPublicId + '/' + page + toParamsString(params);
    }

    return {
        getPathWithoutSearchParameters: () => toParamsString(getDefinedParameters()),
        removeSearchParameters: () => {
            let url = toParamsString(getDefinedParameters());
            console.log(url);
            redirect(url);
        },
        changePage: (page: string, params: string[] = []) => navigate('/' + applicationId + '/' + domainPublicId + '/' + page + toParamsString(params)),
        getPagePathWithParams: (params: string[]) => getPagePath(params),
        setPageParams: (params: string[]) => {
            navigate(getPagePath(params));
        },
    }

}