import {getApplicationFaviconName} from "./use-application-favicon";

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
});
