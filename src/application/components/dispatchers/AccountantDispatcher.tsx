import {ErrorDisplay, LoadingIndicator} from '../QueryState';
import {Navigate, useParams} from 'react-router-dom';
import {getApplicationPages} from '../../../utils/applications/applications-access';
import {Loans} from '../../../loans/Loans';
import React from 'react';
import {Loan} from '../../../loans/Loan';
import {AccountantSettings} from '../../../accountant/settings/AccountantSettings';
import {useApplicationAndDomain} from '../../../utils/use-application-and-domain';
import {useQuery} from '@apollo/client/react';
import {GetAccountantSettings, GetAccountantSettingsQuery} from '../../../types';
import {Accounts} from '../../../accountant/Accounts';
import {CompanyAccounting} from '../../../accountant/CompanyAccounting';
import {BillingPeriods} from '../../../accountant/BillingPeriods';

type AccountantSettingsContextType = {
    accountantSettings: {isCompany: boolean};
    refreshSettings: () => void;
};

export const AccountantSettingsContext = React.createContext<AccountantSettingsContextType>({
    accountantSettings: {isCompany: false},
    refreshSettings: () => {},
});

export function AccountantDispatcher() {
    let {page, param1} = useParams();
    const {currentApplicationId, currentDomainPublicId} = useApplicationAndDomain();

    const {
        loading: accountantSettingsLoading,
        error: accountantSettingsError,
        data: accountantSettingsData,
        refetch: accountantSettingsRefetch,
    } = useQuery<GetAccountantSettingsQuery>(GetAccountantSettings);

    if (accountantSettingsLoading) {
        return <LoadingIndicator label="Ładowanie ustawień księgowości..." />;
    } else if (accountantSettingsError) {
        return <ErrorDisplay error={accountantSettingsError} onRetry={() => accountantSettingsRefetch()} />;
    } else if (accountantSettingsData) {
        const pages = getApplicationPages(
                currentApplicationId,
                accountantSettingsData.settings.accountantSettings.isCompany);
        const requestedPage = pages.find(
                candidate => candidate.links.includes(page || ''));
        if (!requestedPage) {
            return <Navigate to={`/${currentApplicationId}/${currentDomainPublicId}`} replace />;
        }

        function isRequestForPage(pageId: string) {
            return requestedPage?.id === pageId;
        }

        return (
            <AccountantSettingsContext.Provider
                value={{...accountantSettingsData.settings, refreshSettings: accountantSettingsRefetch}}
            >
                {isRequestForPage('BILLING_PERIODS') && <BillingPeriods />}
                {isRequestForPage('COMPANY_ACCOUNTING') && <CompanyAccounting />}
                {isRequestForPage('ACCOUNTS') && <Accounts />}
                {isRequestForPage('LOANS') && !param1 && <Loans />}
                {isRequestForPage('LOANS') && param1 && <Loan />}
                {isRequestForPage('SETTINGS') && <AccountantSettings />}
            </AccountantSettingsContext.Provider>
        );
    } else {
        return <></>;
    }
}
