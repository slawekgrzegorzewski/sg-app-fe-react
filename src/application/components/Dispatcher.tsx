import {useParams} from "react-router-dom";
import {useCurrentUser} from "../../utils/users/use-current-user";
import Typography from "@mui/material/Typography";
import {Accounts} from "../../accountant/Accounts";
import {IntellectualPropertiesMainPage} from "../../intellectual-property-report/IntellectualPropertiesMainPage";
import {applications} from "../../utils/applications/applications-access";
import {Loans} from "../../loans/Loans";
import React from "react";
import {Loan} from "../../loans/Loan";
import {AccountantSettings} from "../../accountant/AccountantSettings";
import {TimeRecordsMainPage} from "../../intellectual-property-report/TimeRecordsMainPage";
import {
    IntellectualPropertyReportMainPage
} from "../../intellectual-property-report/IntellectualPropertyReportMainPage";
import {
    IntellectualPropertySettingsMainPage
} from "../../intellectual-property-report/IntellectualPropertySettingsMainPage";
import {useApplicationAndDomain} from "../../utils/use-application-and-domain";


export function Dispatcher() {

    let {page, param1} = useParams();
    const {user} = useCurrentUser();
    const {currentApplicationId, currentDomainId} = useApplicationAndDomain();
    const application = applications.get(currentApplicationId!)!;

    function isRequestForPage(pageId: string) {
        return (application?.pages.get(pageId)?.links || []).includes(page!);
    }

    if (application.id === 'ACCOUNTANT') {
        if (!page || isRequestForPage('ACCOUNTANT')) {
            return (<Accounts/>);
        }
        if (isRequestForPage('LOANS')) {
            if (param1)
                return <Loan/>;
            return <Loans/>;
        }
        if (isRequestForPage('SETTINGS')) {
            return <AccountantSettings/>;
        }
    } else if (application.id === 'IPR') {
        if (!page || isRequestForPage('IPR')) {
            return (<IntellectualPropertiesMainPage/>);
        }
        if (isRequestForPage('TIME_RECORD')) {
            return (<TimeRecordsMainPage/>);
        }
        if (isRequestForPage('IP_REPORTS')) {
            return (<IntellectualPropertyReportMainPage/>);
        }
        if (isRequestForPage('IP_SETTING')) {
            return (<IntellectualPropertySettingsMainPage/>);
        }
    }
    return (
        <Typography>
            {application.id} home {user!.user.domains.find(domain => domain.id === currentDomainId)?.name || ""}
        </Typography>
    );
}
