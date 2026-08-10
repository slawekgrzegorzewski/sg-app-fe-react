import {renderHook} from "@testing-library/react";
import {getApplicationTitle, useApplicationTitle} from "./use-application-title";

describe("getApplicationTitle", () => {
    it.each([
        ["HOME", "Strona domowa"],
        ["ACCOUNTANT", "Księgowość"],
        ["CUBES", "Kostka rubika"],
        ["CHECKER", "Sprawdzanie stron"],
        ["SYR", "Raporty roczne ŚJ"],
        ["IPR", "Raporty własności intelektualnej"],
    ])("maps %s to its browser tab title", (applicationId, title) => {
        expect(getApplicationTitle(applicationId)).toBe(title);
    });

    it("uses the home title for an unknown application", () => {
        expect(getApplicationTitle("UNKNOWN")).toBe("Strona domowa");
    });
});

describe("useApplicationTitle", () => {
    it("updates the title when the selected application changes", () => {
        const {rerender, unmount} = renderHook(
            ({applicationId}) => useApplicationTitle(applicationId),
            {initialProps: {applicationId: "ACCOUNTANT"}}
        );

        expect(document.title).toBe("Księgowość");

        rerender({applicationId: "CUBES"});
        expect(document.title).toBe("Kostka rubika");

        unmount();
        expect(document.title).toBe("Strona domowa");
    });
});
