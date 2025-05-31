import {useParams} from "react-router-dom";
import {Accounts} from "../../../accountant/Accounts";
import {applications} from "../../../utils/applications/applications-access";
import {Loans} from "../../../loans/Loans";
import React from "react";
import {Loan} from "../../../loans/Loan";
import {AccountantSettings} from "../../../accountant/settings/AccountantSettings";
import {useApplicationAndDomain} from "../../../utils/use-application-and-domain";
import {useQuery} from "@apollo/client";
import {GetAccountantSettings, GetAccountantSettingsQuery} from "../../../types";

type AccountantSettingsContextType = {
    accountantSettings: { isCompany: boolean },
    refreshSettings: () => void
}

export const AccountantSettingsContext = React.createContext<AccountantSettingsContextType>({
    accountantSettings: {isCompany: false},
    refreshSettings: () => {
    }
});

export function AccountantDispatcher() {

    let {page, param1} = useParams();
    const {currentApplicationId} = useApplicationAndDomain();
    const application = applications.get(currentApplicationId!)!;

    function isRequestForPage(pageId: string) {
        return (application?.pages.get(pageId)?.links || []).includes(page!);
    }

    const {
        loading: accountantSettingsLoading,
        error: accountantSettingsError,
        data: accountantSettingsData,
        refetch: accountantSettingsRefetch
    } = useQuery<GetAccountantSettingsQuery>(GetAccountantSettings);

    if (accountantSettingsLoading) {
        return <>Loading...</>
    } else if (accountantSettingsError) {
        return <>Error...</>
    } else if (accountantSettingsData) {
        return <AccountantSettingsContext.Provider
            value={{...accountantSettingsData.settings, refreshSettings: accountantSettingsRefetch}}>
            {(!page || isRequestForPage('ACCOUNTANT')) && <Accounts/>}
            {isRequestForPage('LOANS') && param1 && <Loan/>}
            {isRequestForPage('LOANS') && !param1 && <Loans/>}
            {isRequestForPage('SETTINGS') && <AccountantSettings/>}
        </AccountantSettingsContext.Provider>
    } else return <></>;
}
