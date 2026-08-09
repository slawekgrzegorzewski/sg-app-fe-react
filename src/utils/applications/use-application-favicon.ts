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

const faviconVersion = "v3";
const faviconSizes = [32, 16];

export function getApplicationFaviconName(applicationId?: ApplicationId): string {
    return faviconNames[applicationId ?? "HOME"] ?? faviconNames.HOME;
}

export function useApplicationFavicon(applicationId?: ApplicationId): void {
    useEffect(() => {
        const faviconName = getApplicationFaviconName(applicationId);
        const publicUrl = process.env.PUBLIC_URL ?? "";

        document.querySelectorAll<HTMLLinkElement>('link[rel~="icon"]').forEach(link => link.remove());

        faviconSizes.forEach(size => {
            const link = document.createElement("link");
            link.dataset.appFavicon = "";
            link.rel = "icon";
            link.type = "image/png";
            link.setAttribute("sizes", `${size}x${size}`);
            link.href = `${publicUrl}/favicons/${faviconName}-${faviconVersion}-${size}.png`;
            document.head.appendChild(link);
        });
    }, [applicationId]);
}
