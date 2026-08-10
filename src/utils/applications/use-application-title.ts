import {useEffect} from "react";
import {ApplicationId, applications} from "./applications-access";

const defaultTitle = applications.get("HOME")?.name ?? "Strona domowa";

export function getApplicationTitle(applicationId?: ApplicationId): string {
    return applications.get(applicationId ?? "HOME")?.name ?? defaultTitle;
}

export function useApplicationTitle(applicationId?: ApplicationId): void {
    useEffect(() => {
        document.title = getApplicationTitle(applicationId);

        return () => {
            document.title = defaultTitle;
        };
    }, [applicationId]);
}
