import {User} from "../../types";
import getUserApplications, {applications} from "./applications-access";

function userWithRoles(roles: string[]): User {
    return {
        domainPublicId: "domain-id",
        domains: [],
        email: "user@example.com",
        login: "user",
        name: "User",
        roles,
    };
}

describe("getUserApplications", () => {
    it("udostępnia aplikację Trening siłowy użytkownikowi z rolą STRENGTH_TRAINING", () => {
        expect(getUserApplications(userWithRoles(["STRENGTH_TRAINING"]))).toEqual([
            applications.get("STRENGTH_TRAINING"),
        ]);
        expect(applications.get("STRENGTH_TRAINING")?.pages.get("EXERCISE_CATALOG")?.label).toBe("Katalog ćwiczeń");
    });

    it("zachowuje aplikację domową, gdy użytkownik nie ma znanej roli aplikacyjnej", () => {
        expect(getUserApplications(userWithRoles(["PJM"]))).toEqual([applications.get("HOME")]);
    });
});
