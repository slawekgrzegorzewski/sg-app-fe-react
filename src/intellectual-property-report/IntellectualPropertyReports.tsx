import {useQuery} from "@apollo/client";
import {AllIpRs, AllIpRsQuery, IntellectualProperty} from "../types";
import {compareDates, maxDate} from "../utils/dates";

export function IntellectualPropertyReports() {

    const {loading, error, data} = useQuery<AllIpRsQuery>(AllIpRs);

    function extractIPRDate(ipr: IntellectualProperty) {
        return maxDate(
            (ipr.tasks || [])
                .flatMap(task => (task.timeRecords || [])
                    .flatMap(timeRecord => new Date(timeRecord.date))));
    }

    if (loading) {
        return <>Loading...</>
    } else if (error) {
        return <>Error...</>
    } else if (data) {
        return <ul>{(
            [...data.allIPRs]
                .sort((ipr1, ipr2) => compareDates(extractIPRDate(ipr1), extractIPRDate(ipr2)) * -1)
                .map(ipr =>
                    (
                        <li key={ipr.id}>
                            {ipr.description}
                        </li>
                    ))
        )}</ul>;
        return <></>;
    } else {
        return <></>;
    }
}