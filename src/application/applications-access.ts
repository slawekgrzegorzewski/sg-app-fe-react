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
    return [...(new Set<string>(user.roles.map(role => role.split("_")[0])))]
        .filter(a => applications.get(a) !== undefined)
        .map(applicationKey => getOrThrow(applications, applicationKey, "Application not known: " + applicationKey));
}

function getOrThrow<K, V>(fromMap: Map<K, V>, key: K, errorMessage: string): V {
    const value = fromMap.get(key);
    if (!value) {
        throw new Error(errorMessage);
    }
    return value;
}