import {User} from "../../types";
import getUserApplications, {applications, getApplicationPages} from "./applications-access";

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

describe(
        'accountant pages',
        () => {
            it(
                    'shows company pages and shared settings in company mode',
                    () => {
                        const pages = getApplicationPages('ACCOUNTANT', true);
                        expect(
                                pages.map(
                                        page => page.id)).toEqual(['COMPANY_ACCOUNTING', 'SETTINGS']);
                    });

            it(
                    'preserves the existing accountant pages in private mode',
                    () => {
                        const pages = getApplicationPages('ACCOUNTANT', false);
                        expect(
                                pages.map(
                                        page => page.id)).toEqual(['BILLING_PERIODS', 'ACCOUNTS', 'LOANS', 'SETTINGS']);
                    });

            it(
                    'does not assume a mode before settings have loaded',
                    () => {
                        const pages = getApplicationPages('ACCOUNTANT');
                        expect(
                                pages.map(
                                        page => page.id)).toEqual(['SETTINGS']);
                    });

            it(
                    'does not change other applications or introduce a company application',
                    () => {
                        expect(
                                getApplicationPages('CUBES', true)).toEqual(
                                getApplicationPages('CUBES', false));
                        const user = userWithRoles(['ACCOUNTANT_USER']);
                        expect(
                                getUserApplications(user).map(
                                        app => app.id)).toEqual(['ACCOUNTANT']);
                        expect(
                                applications.has('COMPANY_ACCOUNTING')).toBe(false);
                    });
        });
