import {useQuery} from "@apollo/client";
import {AllIpRs, AllIpRsQuery} from "../types";

export function IntellectualPropertyReports() {

    const {loading, error, data} = useQuery<AllIpRsQuery>(AllIpRs);

    if (loading) {
        return <>Loading...</>
    } else if (error) {
        return <>Error...</>
    } else if (data) {
        return <ul>{(
            data.allIPRs.map(ipr =>
                (
                    <li key={ipr.id}>
                        {ipr.description}
                    </li>
                ))
        )}</ul>;
    } else {
        return <></>;
    }
}