import {User} from "../../types";

export const ApplicationIds: string[] = ["ACCOUNTANT", "CUBES", "CHECKER", "SYR", "IPR"] as string[];
export type ApplicationId = typeof ApplicationIds[number];

function isOfApplicationId(keyInput: string): keyInput is ApplicationId {
    return ApplicationIds.includes(keyInput);
}

export const ApplicationPageIds: string[] = ['IPR', 'TIME_RECORD'] as string[];
export type ApplicationPageId = typeof ApplicationPageIds[number];

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function isOfApplicationPageId(keyInput: string): keyInput is ApplicationPageId {
    return ApplicationPageIds.includes(keyInput);
}

export type Application = {
    id: ApplicationId,
    name: string,
    pages: Map<ApplicationPageId, ApplicationPage>
}

export type ApplicationPage = {
    id: ApplicationPageId,
    links: string[],
    label: string
}

export const applications = new Map<ApplicationId, Application>([
    ["ACCOUNTANT", {
        id: "ACCOUNTANT",
        name: "Księgowość",
        pages: new Map<ApplicationPageId, ApplicationPage>([
            ['ACCOUNTANT', {id: 'ACCOUNTANT', links: ['', '/', 'home'], label: 'Księgowość'} as ApplicationPage],
            ['LOANS', {id: 'LOANS', links: ['loans'], label: 'Pożyczki'} as ApplicationPage]
        ])
    } as Application],
    ["CUBES", {id: "CUBES", name: "Kostka rubika"} as Application],
    ["CHECKER", {id: "CHECKER", name: "Sprawdzanie stron"} as Application],
    ["SYR", {id: "SYR", name: "Raporty roczne ŚJ"} as Application],
    ["IPR", {
        id: "IPR",
        name: "Raporty własności intelektualnej",
        pages: new Map<ApplicationPageId, ApplicationPage>([
            ['IPR', {id: 'IPR', links: ['iprs', '', 'home'], label: 'Raporty IP'} as ApplicationPage],
            ['TIME_RECORD', {id: 'TIME_RECORD', links: ['timerecord'], label: 'Raporty czasu'} as ApplicationPage]
        ])
    } as Application],
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