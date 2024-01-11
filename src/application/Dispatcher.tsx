import {useParams} from "react-router-dom";
import {useCurrentUser} from "../utils/users/use-current-user";
import Typography from "@mui/material/Typography";
import {Accounts} from "../accountant/Accounts";
import {IntellectualPropertyReports} from "../intellectual-property-report/IntellectualPropertyReports";
import {applications} from "../utils/applications/applications-access";

export function Dispatcher() {
    const {applicationId, domainId, page} = useParams();
    const {user} = useCurrentUser();
    const application = applications.get(applicationId!);
    if (applicationId === 'ACCOUNTANT') {
        if (!page || ['', '/', 'home'].includes(page)) {
            return (<Accounts/>);
        }
    } else if (applicationId === 'IPR') {
        if (!page || (application?.pages.get('IPR')?.links || []).includes(page)) {
            return (<IntellectualPropertyReports/>);
        }
        if ((application?.pages.get('TIME_RECORD')?.links || []).includes(page)) {
            return (<>a</>);
        }
    }
    return (
        <Typography>
            {applicationId} home {user!.user.domains.find(domain => domain.id === Number(domainId))?.name || ""}
        </Typography>
    );
}