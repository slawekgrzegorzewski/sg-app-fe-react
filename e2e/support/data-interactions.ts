import {expect, type Locator, type Page, type Request, type TestInfo} from '@playwright/test';

export const RUN_ID = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const LOGIN = process.env.E2E_LOGIN ?? 'slag';
const PASSWORD = process.env.E2E_PASSWORD ?? 'e2e';
const OTP = process.env.E2E_OTP ?? 'e2e';

type GraphQlResponse<TData = unknown> = {
    data?: TData;
    errors?: Array<{message?: string}>;
};

function graphQlOperationName(request: Request): string | undefined {
    if (!request.url().endsWith('/graphql') || request.method() !== 'POST') {
        return undefined;
    }

    try {
        return (request.postDataJSON() as {operationName?: string}).operationName;
    } catch {
        return undefined;
    }
}

export async function performGraphQlOperation(
    page: Page,
    operationName: string,
    action: () => Promise<unknown>
): Promise<GraphQlResponse> {
    const responsePromise = page
        .waitForResponse(response => graphQlOperationName(response.request()) === operationName, {timeout: 20_000})
        .then(response => ({response}));
    const failurePromise = page
        .waitForEvent('requestfailed', {
            predicate: request => graphQlOperationName(request) === operationName,
            timeout: 20_000,
        })
        .then(request => ({request}));

    await action();
    const result = await Promise.race([responsePromise, failurePromise]);
    if ('request' in result) {
        throw new Error(
            `Nie udało się połączyć z API podczas operacji ${operationName}: ${result.request.failure()?.errorText ?? 'nieznany błąd sieci'}`
        );
    }

    const {response} = result;
    const responseBody = (await response.json()) as GraphQlResponse;

    expect(response.ok(), `Operacja ${operationName} zwróciła HTTP ${response.status()}`).toBeTruthy();
    expect(responseBody.errors, `Operacja ${operationName} zwróciła błędy GraphQL`).toBeUndefined();
    return responseBody;
}

export function waitForGraphQlData<TData>(page: Page, operationName: string): Promise<TData> {
    return page
        .waitForResponse(response => graphQlOperationName(response.request()) === operationName, {timeout: 20_000})
        .then(async response => {
            const responseBody = (await response.json()) as GraphQlResponse<TData>;
            expect(response.ok(), `Operacja ${operationName} zwróciła HTTP ${response.status()}`).toBeTruthy();
            expect(responseBody.errors, `Operacja ${operationName} zwróciła błędy GraphQL`).toBeUndefined();
            expect(responseBody.data, `Operacja ${operationName} nie zwróciła danych`).toBeDefined();
            return responseBody.data!;
        });
}

export function recordConditionalStep(testInfo: TestInfo, message: string): void {
    testInfo.annotations.push({type: 'warunek środowiska', description: message});
    console.log(`[E2E] ${message}`);
}

export async function login(page: Page): Promise<string> {
    await page.goto('/login');

    if (await page.getByRole('textbox', {name: 'Login'}).isVisible()) {
        await page.getByRole('textbox', {name: 'Login'}).fill(LOGIN);
        await page.getByLabel('Hasło').fill(PASSWORD);
        await page.getByRole('textbox', {name: 'OTP'}).fill(OTP);
        await performGraphQlOperation(page, 'PerformLogin', () =>
            page.getByRole('button', {name: /^Zaloguj się$/i}).click()
        );
    }

    await page.waitForURL(url => /^\/[A-Z_]+\/[^/]+/.test(url.pathname));
    const domainPublicId = process.env.E2E_DOMAIN_PUBLIC_ID ?? new URL(page.url()).pathname.split('/')[2];
    expect(domainPublicId, 'Nie udało się ustalić publicznego identyfikatora domeny').toBeTruthy();
    return domainPublicId;
}

export async function openAccountantPage(page: Page, domainPublicId: string, suffix = ''): Promise<void> {
    await page.goto(`/ACCOUNTANT/${domainPublicId}${suffix}`);
    await expect(
        page.getByRole('heading', {name: suffix === '/settings' ? 'Ustawienia' : 'Okresy rozliczeniowe'})
    ).toBeVisible();
}

export async function chooseFirstOption(page: Page, combobox: Locator): Promise<string> {
    await combobox.click();
    const option = page.getByRole('listbox').getByRole('option').first();
    await expect(option).toBeVisible();
    const optionName = await option.innerText();
    await option.click();
    return optionName;
}

export async function chooseMatchingOption(page: Page, combobox: Locator, optionName: RegExp): Promise<string> {
    await combobox.click();
    const option = page.getByRole('listbox').getByRole('option', {name: optionName}).first();
    await expect(option).toBeVisible();
    const selectedOptionName = await option.innerText();
    await option.click();
    return selectedOptionName;
}

export function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
