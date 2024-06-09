import {useParams} from "react-router-dom";
import {useCurrentUser} from "../../utils/users/use-current-user";
import Typography from "@mui/material/Typography";
import {Accounts} from "../../accountant/Accounts";
import {IntellectualPropertyReports} from "../../intellectual-property-report/IntellectualPropertyReports";
import {applications} from "../../utils/applications/applications-access";
import {Loans} from "../../loans/Loans";
import React from "react";
import {Loan} from "../../loans/Loan";
import {AccountantSettings} from "../../accountant/AccountantSettings";


export function Dispatcher() {

    const {applicationId, domainId, page, param1} = useParams();
    const {user} = useCurrentUser();
    const application = applications.get(applicationId!);

    function isRequestForPage(pageId: string) {
        return (application?.pages.get(pageId)?.links || []).includes(page!);
    }

    if (applicationId === 'ACCOUNTANT') {
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
    } else if (applicationId === 'IPR') {
        if (!page || isRequestForPage('IPR')) {
            return (<IntellectualPropertyReports/>);
        }
        if (isRequestForPage('TIME_RECORD')) {
            return (<>a</>);
        }
    }
    return (
        <Typography>
            {applicationId} home {user!.user.domains.find(domain => domain.id === Number(domainId))?.name || ""}
        </Typography>
    );
}
