import {useParams} from "react-router-dom";

export function Dispatcher() {
    const {applicationId, domainId} = useParams();
    return (
        <div>
            {applicationId} home {domainId}
        </div>
    );
}