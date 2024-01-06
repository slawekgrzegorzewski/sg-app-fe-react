import {User} from "../../types";

export type Application = {
    id: string,
    name: string
}

export const ApplicationIds: string[] = ["ACCOUNTANT", "CUBES", "CHECKER", "SYR", "IPR"] as string[];
export type ApplicationId = typeof ApplicationIds[number];

function isOfApplicationId(keyInput: string): keyInput is ApplicationId {
    return ApplicationIds.includes(keyInput);
}

export const applications = new Map<ApplicationId, Application>([
    ["ACCOUNTANT", {id: "ACCOUNTANT", name: "Księgowość"} as Application],
    ["CUBES", {id: "CUBES", name: "Kostka rubika"} as Application],
    ["CHECKER", {id: "CHECKER", name: "Sprawdzanie stron"} as Application],
    ["SYR", {id: "SYR", name: "Raporty roczne ŚJ"} as Application],
    ["IPR", {id: "IPR", name: "Raporty własności intelektualnej"} as Application],
]);
export default function getUserApplications(user: User): Application[] {
    return [...(new Set<string>(user.roles.map(role => role.split("_")[0])))]
        .filter(applicationId => isOfApplicationId(applicationId))
        .map(applicationId => applicationId as ApplicationId)
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