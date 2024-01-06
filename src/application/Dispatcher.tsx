import {useParams} from "react-router-dom";
import {useCurrentUser} from "../utils/users/use-current-user";
import Typography from "@mui/material/Typography";
import {Accounts} from "../accountant/Accounts";

export function Dispatcher() {
    const {applicationId, domainId, page} = useParams();
    const {user} = useCurrentUser();
    if (applicationId === 'ACCOUNTANT') {
        if (!page || ['', '/', 'home'].includes(page)) {
            return (<Accounts/>);
        }
    }
    return (
        <Typography>
            {applicationId} home {user!.user.domains.find(domain => domain.id === Number(domainId))?.name || ""}
        </Typography>
    );
}