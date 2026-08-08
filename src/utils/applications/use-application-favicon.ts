import {useEffect} from "react";
import {ApplicationId} from "./applications-access";

const faviconNames: Record<string, string> = {
    HOME: "home",
    ACCOUNTANT: "accountant",
    CUBES: "cubes",
    CHECKER: "checker",
    SYR: "syr",
    IPR: "ipr",
};

export function getApplicationFaviconName(applicationId?: ApplicationId): string {
    return faviconNames[applicationId ?? "HOME"] ?? faviconNames.HOME;
}

export function useApplicationFavicon(applicationId?: ApplicationId): void {
    useEffect(() => {
        const faviconName = getApplicationFaviconName(applicationId);
        const publicUrl = process.env.PUBLIC_URL ?? "";

        document
            .querySelectorAll<HTMLLinkElement>('link[data-app-favicon]')
            .forEach(link => {
                const size = link.sizes.value === "16x16" ? 16 : 32;
                link.href = `${publicUrl}/favicons/${faviconName}-${size}.png`;
            });
    }, [applicationId]);
}
