import {useParams} from "react-router-dom";
import {useCurrentUser} from "../../../utils/users/use-current-user";
import Typography from "@mui/material/Typography";
import {IntellectualPropertiesMainPage} from "../../../intellectual-property-report/IntellectualPropertiesMainPage";
import {applications} from "../../../utils/applications/applications-access";
import React from "react";
import {TimeRecordsMainPage} from "../../../intellectual-property-report/TimeRecordsMainPage";
import {
    IntellectualPropertyReportMainPage
} from "../../../intellectual-property-report/IntellectualPropertyReportMainPage";
import {
    IntellectualPropertySettingsMainPage
} from "../../../intellectual-property-report/IntellectualPropertySettingsMainPage";
import {useApplicationAndDomain} from "../../../utils/use-application-and-domain";
import {AccountantDispatcher} from "./AccountantDispatcher";


export function Dispatcher() {

    let {page} = useParams();
    const {user} = useCurrentUser();
    const {currentApplicationId, currentDomainPublicId} = useApplicationAndDomain();
    const application = applications.get(currentApplicationId!)!;

    function isRequestForPage(pageId: string) {
        return (application?.pages.get(pageId)?.links || []).includes(page!);
    }

    if (application.id === 'ACCOUNTANT') {
        return <AccountantDispatcher/>
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
    } else if (application.id === 'HOME') {
        return <></>;
    }
    return (
        <Typography>
            {application.id} home {user!.user.domains.find(domain => domain.publicId === currentDomainPublicId)?.name || ""}
        </Typography>
    );
}
