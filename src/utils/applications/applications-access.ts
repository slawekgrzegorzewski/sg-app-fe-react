import {User} from "../../types";

export const ApplicationIds: string[] = ["ACCOUNTANT", "CUBES", "CHECKER", "SYR", "IPR"] as string[];
export type ApplicationId = typeof ApplicationIds[number];

function isOfApplicationId(keyInput: string): keyInput is ApplicationId {
    return ApplicationIds.includes(keyInput);
}

export const ApplicationPageIds: string[] = ['IPR', 'TIME_RECORD'] as string[];
export type ApplicationPageId = typeof ApplicationPageIds[number];

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

const defaultApplication = {
    id: "HOME",
    name: "Strona domowa",
    pages: new Map<ApplicationPageId, ApplicationPage>([
        ['HOME', {id: 'HOME', links: ['', '/', 'home'], label: 'Strona domowa'} as ApplicationPage]
    ])
} as Application;

export const applications = new Map<ApplicationId, Application>([
    ["HOME", defaultApplication],
    ["ACCOUNTANT", {
        id: "ACCOUNTANT",
        name: "Księgowość",
        pages: new Map<ApplicationPageId, ApplicationPage>([
            ['BILLING_PERIODS', {
                id: 'BILLING_PERIODS',
                links: ['', '/', 'home'],
                label: 'Okresy rozliczeniowe'
            } as ApplicationPage],
            ['ACCOUNTS', {id: 'ACCOUNTS', links: ['accounts'], label: 'Konta'} as ApplicationPage],
            ['LOANS', {id: 'LOANS', links: ['loans'], label: 'Pożyczki'} as ApplicationPage],
            ['SETTINGS', {id: 'SETTINGS', links: ['settings'], label: 'Ustawienia'} as ApplicationPage]
        ])
    } as Application],
    ["CUBES", {
        id: "CUBES",
        name: "Kostka rubika",
        pages: new Map<ApplicationPageId, ApplicationPage>([
            ['CUBE_MAIN', {
                id: 'CUBE_MAIN',
                links: ['', '/'],
                label: 'Kostki'
            } as ApplicationPage]
        ])
    } as Application],
    ["CHECKER", {id: "CHECKER", name: "Sprawdzanie stron"} as Application],
    ["SYR", {id: "SYR", name: "Raporty roczne ŚJ"} as Application],
    ["IPR", {
        id: "IPR",
        name: "Raporty własności intelektualnej",
        pages: new Map<ApplicationPageId, ApplicationPage>([
            ['IPR', {id: 'IPR', links: ['iprs', '', 'home'], label: 'Raporty IP'} as ApplicationPage],
            ['TIME_RECORD', {id: 'TIME_RECORD', links: ['timerecord'], label: 'Raporty czasu'} as ApplicationPage],
            ['IP_REPORTS', {id: 'IP_REPORTS', links: ['ipreports'], label: 'Raporty roczne'} as ApplicationPage],
            ['IP_SETTING', {id: 'IP_SETTING', links: ['ipsettings'], label: 'Ustawienia'} as ApplicationPage]
        ])
    } as Application],
]);

export default function getUserApplications(user: User): Application[] {
    const userApplicationIds = [...(new Set<string>(user.roles.map(role => role.split("_")[0])))]
        .filter(applicationId => isOfApplicationId(applicationId))
        .map(applicationId => applicationId as ApplicationId)
        .filter(a => applications.get(a) !== undefined);
    return userApplicationIds.length === 0
        ? [defaultApplication]
        : userApplicationIds.map(applicationKey => getOrThrow(applications, applicationKey, "Application not known: " + applicationKey));
}

function getOrThrow<K, V>(fromMap: Map<K, V>, key: K, errorMessage: string): V {
    const value = fromMap.get(key);
    if (!value) {
        throw new Error(errorMessage);
    }
    return value;
}