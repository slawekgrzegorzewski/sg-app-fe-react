import {renderHook} from "@testing-library/react";
import {getApplicationFaviconName, useApplicationFavicon} from "./use-application-favicon";

describe("getApplicationFaviconName", () => {
    it.each([
        ["HOME", "home"],
        ["ACCOUNTANT", "accountant"],
        ["CUBES", "cubes"],
        ["CHECKER", "checker"],
        ["SYR", "syr"],
        ["IPR", "ipr"],
    ])("maps %s to its favicon", (applicationId, faviconName) => {
        expect(getApplicationFaviconName(applicationId)).toBe(faviconName);
    });

    it("uses the home favicon for an unknown application", () => {
        expect(getApplicationFaviconName("UNKNOWN")).toBe("home");
    });

    it("replaces existing favicon links with versioned file names", () => {
        document.head.innerHTML = `
            <link rel="icon" href="/favicon.ico" />
            <link data-app-favicon rel="icon" sizes="32x32" href="/favicons/home-v2-32.png" />
        `;

        renderHook(() => useApplicationFavicon("ACCOUNTANT"));

        const faviconLinks = Array.from(
            document.querySelectorAll<HTMLLinkElement>("link[data-app-favicon]")
        );
        expect(faviconLinks.map(link => link.getAttribute("href"))).toEqual([
            "/favicons/accountant-v3-32.png",
            "/favicons/accountant-v3-16.png",
        ]);
        expect(document.querySelectorAll('link[rel~="icon"]')).toHaveLength(2);
    });
});
