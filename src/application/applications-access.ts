import {User} from "../types";


type Application = {
    id: string,
    name: string
}

const applications = new Map<string, Application>([
    ["ACCOUNTANT", {id: "ACCOUNTANT", name: "Księgowość"} as Application],
    ["CUBES", {id: "CUBES", name: "Kostka rubika"} as Application],
    ["CHECKER", {id: "CHECKER", name: "Sprawdzanie stron"} as Application],
    ["SYR", {id: "SYR", name: "Raporty roczne ŚJ"} as Application],
    ["IPR", {id: "IPR", name: "Raporty własności intelektualnej"} as Application],
]);
export default function getUserApplications(user: User): Application[] {
    const userApps = user.roles.map(role => role.split("_")[0]).map(applications.get);
    return [...new Set<string>(userApps)];
    // return [];
}