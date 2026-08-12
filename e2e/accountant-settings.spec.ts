import {expect, type Locator, type Page, type Request, type Route, test} from '@playwright/test';
import {
    login,
    openAccountantPage,
    performGraphQlOperation,
    RUN_ID,
    waitForGraphQlData,
} from './support/data-interactions';

const ADMIN_LOGIN = process.env.E2E_LOGIN ?? 'e2e.playwright';
const ADMIN_PASSWORD = process.env.E2E_PASSWORD ?? 'e2e';
const ADMIN_OTP = process.env.E2E_OTP ?? 'e2e';
const ADMIN_NAME = 'E2E PLAYWRIGHT';

type DomainsData = {
    domainInvitations: Array<{ publicId: string; name: string }>;
    settings: {
        domains: Array<{
            publicId: string;
            name: string;
            users: Array<{ login: string; domainAccessLevel: 'ADMIN' | 'MEMBER' }>;
        }>;
    };
};

type BankPermissionsData = {
    bankPermissions: {
        granted: Array<{
            publicId: string;
            bankAccounts: Array<{ publicId: string; iban: string }>;
        }>;
        toProcess: Array<{ publicId: string }>;
        toRecreate: Array<{ id: string; name: string }>;
    };
};

type AvailableInstitutionsData = {
    bankPermissions: {
        availableInstitutions: Array<{ id: string; name: string; bic: string }>;
    };
};

type FinanceManagementData = {
    financeManagement: {
        billingCategories: Array<{ publicId: string; name: string; description: string }>;
        piggyBanks: Array<{
            publicId: string;
            name: string;
            description: string;
            balance: { amount: number; currency: { code: string } };
            monthlyTopUp: { amount: number; currency: { code: string } };
            savings: boolean;
        }>;
    };
};

function graphQlOperationName(request: Request): string | undefined {
    if (!request.url().endsWith('/graphql') || request.method() !== 'POST') {
        return undefined;
    }
    try {
        return (request.postDataJSON() as { operationName?: string }).operationName;
    } catch {
        return undefined;
    }
}

async function expectNoGraphQlOperation(
    page: Page,
    operationNames: string[],
    action: () => Promise<unknown>
): Promise<void> {
    const observedOperations: string[] = [];
    const observer = (request: Request) => {
        const operationName = graphQlOperationName(request);
        if (operationName && operationNames.includes(operationName)) {
            observedOperations.push(operationName);
        }
    };
    page.on('request', observer);
    try {
        await action();
        expect(observedOperations, `Nie oczekiwano operacji: ${operationNames.join(', ')}`).toHaveLength(0);
    } finally {
        page.off('request', observer);
    }
}

async function performGraphQlOperationWithRefetch<TMutationData, TQueryData>(
    page: Page,
    mutationName: string,
    queryName: string,
    action: () => Promise<unknown>
) {
    const queryPromise = waitForGraphQlData<TQueryData>(page, queryName);
    const [mutation, refetch] = await Promise.all([
        performGraphQlOperation<TMutationData>(page, mutationName, action),
        queryPromise,
    ]);
    expect(mutation.responseBody.data, `Mutacja ${mutationName} nie zwróciła danych`).toBeDefined();
    return {mutation, refetch};
}

async function performGraphQlOperationBeforeNavigation<TData>(
    page: Page,
    operationName: string,
    action: () => Promise<unknown>
): Promise<{
    responseBody: { data?: TData; errors?: Array<{ message?: string }> };
    variables: Record<string, unknown>
}> {
    type Observation = {
        responseBody: { data?: TData; errors?: Array<{ message?: string }> };
        variables: Record<string, unknown>;
        ok: boolean;
        status: number;
    };
    let resolveObservation!: (value: Observation) => void;
    let rejectObservation!: (reason: unknown) => void;
    const observation = new Promise<Observation>((resolve, reject) => {
        resolveObservation = resolve;
        rejectObservation = reject;
    });
    const handler = async (route: Route) => {
        const request = route.request();
        if (graphQlOperationName(request) !== operationName) {
            await route.continue();
            return;
        }

        try {
            const response = await route.fetch();
            const body = await response.text();
            const responseBody = JSON.parse(body) as Observation['responseBody'];
            await route.fulfill({response, body});
            const result = {
                responseBody,
                variables: (request.postDataJSON() as { variables?: Record<string, unknown> }).variables ?? {},
                ok: response.ok(),
                status: response.status(),
            };
            setTimeout(() => resolveObservation(result), 0);
        } catch (error) {
            rejectObservation(error);
            await route.abort();
        }
    };
    await page.route('**/graphql', handler);

    await action();
    const result = await observation;
    expect(result.ok, `Operacja ${operationName} zwróciła HTTP ${result.status}`).toBeTruthy();
    expect(result.responseBody.errors, `Operacja ${operationName} zwróciła błędy GraphQL`).toBeUndefined();
    await page.waitForURL(url => url.pathname === '/login');
    await page.unroute('**/graphql', handler);
    return result;
}

function entityRow(page: Page, entityName: string): Locator {
    return page
        .getByText(entityName, {exact: true})
        .locator('xpath=ancestor::div[descendant::button[contains(@aria-label, "Edytuj element")]][1]');
}

async function openAccountsSettingsPage(page: Page, domainPublicId: string): Promise<void> {
    await openSettingsTab(page, domainPublicId, 'Konta');
}

async function openSettingsTab(page: Page, domainPublicId: string, tabName: string): Promise<void> {
    await openAccountantPage(page, domainPublicId, '/settings');
    await page.getByRole('tab', {name: tabName, exact: true}).click();
    await expect(page.getByRole('tabpanel', {name: tabName})).toBeVisible();
}

function sectionByHeading(page: Page, heading: string): Locator {
    return page.getByRole('heading', {name: heading, exact: true}).locator('xpath=ancestor::section[1]');
}

function entityRowIn(section: Locator, entityName: string): Locator {
    return section
        .getByText(entityName, {exact: true})
        .locator('xpath=ancestor::div[descendant::button[contains(@aria-label, "Edytuj element")]][1]');
}

async function logout(page: Page, displayedUserName: string): Promise<void> {
    await page.getByRole('banner').getByRole('button', {name: displayedUserName, exact: true}).first().click();
    await page.getByRole('menuitem', {name: 'Wyloguj', exact: true}).click();
    await expect(page.getByRole('textbox', {name: 'Login'})).toBeVisible();
}

async function loginAs(
    page: Page,
    credentials: { login: string; password: string; otp: string }
): Promise<{ domainPublicId: string; name: string }> {
    await page.goto('/login');
    await page.getByRole('textbox', {name: 'Login'}).fill(credentials.login);
    await page.getByLabel('Hasło').fill(credentials.password);
    await page.getByRole('textbox', {name: 'OTP'}).fill(credentials.otp);
    const result = await performGraphQlOperation<{
        login: { user: { login: string; name: string; domainPublicId: string } };
    }>(page, 'PerformLogin', () => page.getByRole('button', {name: /^Zaloguj się$/i}).click());
    const authenticatedUser = result.responseBody.data!.login.user;
    expect(authenticatedUser.login).toBe(credentials.login);
    await page.waitForURL(url => /^\/[A-Z_]+\/[^/]+/.test(url.pathname));
    return {domainPublicId: authenticatedUser.domainPublicId, name: authenticatedUser.name};
}

async function registerUser(
    page: Page,
    user: { firstName: string; lastName: string; login: string; email: string; password: string; otp: string }
): Promise<void> {
    await page.goto('/register');
    await page.getByRole('textbox', {name: 'Imię', exact: true}).fill(user.firstName);
    await page.getByRole('textbox', {name: 'Nazwisko', exact: true}).fill(user.lastName);
    await page.getByRole('textbox', {name: 'e-mail', exact: true}).fill(user.email);
    await page.getByRole('textbox', {name: 'Login', exact: true}).fill(user.login);
    const passwordFields = page.locator('input[type="password"]');
    await passwordFields.nth(0).fill(user.password);
    await passwordFields.nth(1).fill(user.password);
    const registration = await performGraphQlOperation<{ register: { mfaCode: string; qrLink: string } }>(
        page,
        'PerformRegistration',
        () => page.getByRole('button', {name: 'Zarejestruj się', exact: true}).click()
    );
    expect(registration.variables).toEqual({
        firstName: user.firstName,
        lastName: user.lastName,
        login: user.login,
        email: user.email,
        password: user.password,
        repeatedPassword: user.password,
    });
    expect(registration.responseBody.data!.register.mfaCode).toBeTruthy();
    expect(registration.responseBody.data!.register.qrLink).toBeTruthy();
    await expect(page.getByText('Konfigurowanie MFA', {exact: true})).toBeVisible();
    await page.getByRole('textbox', {name: 'Przepisz kod z aplikacji', exact: true}).fill(user.otp);
    const setupMfa = await performGraphQlOperation<{ setupMFA: boolean }>(page, 'SetupMFA', () =>
        page.getByRole('button', {name: 'Zapisz', exact: true}).click()
    );
    expect(setupMfa.variables).toEqual({login: user.login, password: user.password, otp: user.otp});
    expect(setupMfa.responseBody.data!.setupMFA).toBeTruthy();
    await expect(page.getByRole('textbox', {name: 'Login'})).toBeVisible();
}

type NamedCrudConfig = {
    sectionName: string;
    addLabel: string;
    createDialogName: string;
    editDialogName: string;
    deleteDialogName: string;
    createOperation: string;
    updateOperation: string;
    deleteOperation: string;
    refetchOperation: string;
    createResultField: string;
    updateResultField: string;
    deleteResultField: string;
    name: string;
    updatedName: string;
};

async function exerciseNamedCrud(page: Page, config: NamedCrudConfig): Promise<void> {
    const section = sectionByHeading(page, config.sectionName);
    await section.getByRole('button', {name: config.addLabel, exact: true}).click();
    let dialog = page.getByRole('dialog', {name: config.createDialogName, exact: true});
    await expectNoGraphQlOperation(page, [config.createOperation], async () => {
        await dialog.getByRole('button', {name: config.addLabel, exact: true}).click();
        await expect(dialog.getByText('Wymagana', {exact: true})).toBeVisible();
        await dialog.getByRole('button', {name: 'Anuluj', exact: true}).click();
    });

    await section.getByRole('button', {name: config.addLabel, exact: true}).click();
    dialog = page.getByRole('dialog', {name: config.createDialogName, exact: true});
    await dialog.getByRole('textbox', {name: 'Nazwa', exact: true}).fill(config.name);
    const creation = await performGraphQlOperationWithRefetch<
        Record<string, { publicId: string; name: string }>,
        unknown
    >(page, config.createOperation, config.refetchOperation, () =>
        dialog.getByRole('button', {name: config.addLabel, exact: true}).click()
    );
    const created = creation.mutation.responseBody.data![config.createResultField];
    expect(creation.mutation.variables).toEqual({name: config.name});
    expect(created).toMatchObject({name: config.name});

    let row = entityRowIn(section, config.name);
    await row.getByRole('button', {name: new RegExp(`Edytuj element .* w sekcji ${config.sectionName}`)}).click();
    dialog = page.getByRole('dialog', {name: config.editDialogName, exact: true});
    await dialog.getByRole('textbox', {name: 'Nazwa', exact: true}).fill(config.updatedName);
    const update = await performGraphQlOperationWithRefetch<Record<string, {
        publicId: string;
        name: string
    }>, unknown>(
        page,
        config.updateOperation,
        config.refetchOperation,
        () => dialog.getByRole('button', {name: 'Zapisz zmiany', exact: true}).click()
    );
    expect(update.mutation.variables).toEqual({publicId: created.publicId, name: config.updatedName});
    expect(update.mutation.responseBody.data![config.updateResultField]).toMatchObject({
        publicId: created.publicId,
        name: config.updatedName,
    });

    row = entityRowIn(section, config.updatedName);
    await row.getByRole('button', {name: new RegExp(`Usuń element .* z sekcji ${config.sectionName}`)}).click();
    let confirmation = page.getByRole('dialog', {name: config.deleteDialogName, exact: true});
    await expectNoGraphQlOperation(page, [config.deleteOperation], async () => {
        await confirmation.getByRole('button', {name: 'Anuluj', exact: true}).click();
    });
    await row.getByRole('button', {name: new RegExp(`Usuń element .* z sekcji ${config.sectionName}`)}).click();
    confirmation = page.getByRole('dialog', {name: config.deleteDialogName, exact: true});
    const deletion = await performGraphQlOperationWithRefetch<Record<string, string>, unknown>(
        page,
        config.deleteOperation,
        config.refetchOperation,
        () => confirmation.getByRole('button', {name: 'Usuń', exact: true}).click()
    );
    const deleteVariableName = config.sectionName === 'Klienci' ? 'clientPublicId' : 'supplierPublicId';
    expect(deletion.mutation.variables).toEqual({[deleteVariableName]: created.publicId});
    expect(deletion.mutation.responseBody.data![config.deleteResultField]).toBeTruthy();
    await expect(section.getByText(config.updatedName, {exact: true})).toHaveCount(0);
}

async function deleteNamedEntityIfPresent(
    page: Page,
    sectionName: string,
    possibleNames: string[],
    deleteDialogName: string,
    deleteOperation: string
): Promise<void> {
    const section = sectionByHeading(page, sectionName);
    for (const name of possibleNames) {
        if ((await section.getByText(name, {exact: true}).count()) === 0) {
            continue;
        }

        const row = entityRowIn(section, name);
        await row.getByRole('button', {name: new RegExp(`Usuń element .* z sekcji ${sectionName}`)}).click();
        const confirmation = page.getByRole('dialog', {name: deleteDialogName, exact: true});
        await performGraphQlOperation(page, deleteOperation, () =>
            confirmation.getByRole('button', {name: 'Usuń', exact: true}).click()
        );
        await expect(section.getByText(name, {exact: true})).toHaveCount(0);
        return;
    }
}

async function clearSessionAndOpenLogin(page: Page): Promise<void> {
    await page.evaluate(() => localStorage.removeItem('newApp_currentUser'));
    await page.goto('/login');
    await expect(page.getByRole('textbox', {name: 'Login'})).toBeVisible();
}

async function disconnectBankAccount(
    page: Page,
    accountName: string,
    onMutationCompleted: () => void = () => {
    }
): Promise<void> {
    const row = entityRow(page, accountName);
    await row.getByRole('button', {name: `Odłącz konto bankowe od ${accountName}`, exact: true}).click();
    const confirmation = page.getByRole('dialog', {name: 'Odłączyć konto bankowe?'});
    await expect(confirmation).toContainText(accountName);
    await performGraphQlOperation(page, 'DeleteBankAccountAssignment', () =>
        confirmation.getByRole('button', {name: 'Odłącz', exact: true}).click()
    );
    onMutationCompleted();
    await expect(row.getByText(/^Powiązane z kontem bankowym:/)).toHaveCount(0);
}

async function assignBankAccount(
    page: Page,
    accountName: string,
    bankAccountIban: string,
    onMutationCompleted: () => void = () => {
    }
): Promise<void> {
    const row = entityRow(page, accountName);
    await row.getByRole('button', {name: 'Przypisz konto', exact: true}).click();
    const picker = page.getByRole('dialog', {name: 'Wybierz konto bankowe'});
    await performGraphQlOperation(page, 'AssignBankAccountToAccount', () =>
        picker.getByRole('button', {name: bankAccountIban, exact: true}).click()
    );
    onMutationCompleted();
    await expect(picker).toBeHidden();
    await expect(row.getByText(`Powiązane z kontem bankowym: ${bankAccountIban}`, {exact: true})).toBeVisible();
}

async function deleteAccountIfPresent(page: Page, domainPublicId: string, accountName: string): Promise<void> {
    await openAccountsSettingsPage(page, domainPublicId);
    const accountNameElement = page.getByText(accountName, {exact: true});
    if ((await accountNameElement.count()) === 0) {
        return;
    }

    const row = entityRow(page, accountName);
    await row.getByRole('button', {name: /Usuń element .* z sekcji Konta/}).click();
    const confirmation = page.getByRole('dialog', {name: 'Usunąć konto?'});
    await expect(confirmation).toContainText(accountName);
    await performGraphQlOperation(page, 'DeleteAccount', () =>
        confirmation.getByRole('button', {name: 'Usuń', exact: true}).click()
    );
    await expect(page.getByText(accountName, {exact: true})).toHaveCount(0);
}

test.describe('ustawienia księgowości', () => {
    test('zapisuje, modyfikuje i usuwa konto', async ({page}) => {
        const domainPublicId = await login(page);
        const createdName = `E2E konto ${RUN_ID}`;
        const updatedName = `${createdName} zmienione`;
        let accountToClean = createdName;
        let bankAccountToRestore: { accountName: string; iban: string } | undefined;
        let bankAccountAssignment: 'original' | 'unassigned' | 'test-account' = 'original';

        await openAccountsSettingsPage(page, domainPublicId);

        try {
            await page.getByRole('button', {name: 'Dodaj konto'}).click();
            const createDialog = page.getByRole('dialog', {name: 'Dodaj konto'});
            await createDialog.getByRole('textbox', {name: 'Nazwa'}).fill(createdName);
            await createDialog.getByRole('checkbox', {name: 'Widoczne'}).check();
            await createDialog.getByRole('combobox', {name: 'Waluta'}).click();
            await page.getByRole('option', {name: 'PLN', exact: true}).click();
            await createDialog.getByRole('spinbutton', {name: 'Limit kredytowy'}).fill('0');
            await performGraphQlOperation(page, 'CreateAccount', () =>
                createDialog.getByRole('button', {name: 'Dodaj konto'}).click()
            );
            await expect(page.getByText(createdName, {exact: true})).toBeVisible();

            const otherAccountDisconnectButton = page.getByRole('button', {name: /^Odłącz konto bankowe od /}).first();
            await expect(
                otherAccountDisconnectButton,
                'Do testu jest wymagane inne konto powiązane z kontem bankowym'
            ).toBeVisible();
            const disconnectButtonLabel = await otherAccountDisconnectButton.getAttribute('aria-label');
            const disconnectButtonLabelPrefix = 'Odłącz konto bankowe od ';
            expect(disconnectButtonLabel).toMatch(new RegExp(`^${disconnectButtonLabelPrefix}.+`));
            const originalAccountName = disconnectButtonLabel!.slice(disconnectButtonLabelPrefix.length);
            const bankAccountRelation = await entityRow(page, originalAccountName)
                .getByText(/^Powiązane z kontem bankowym: /)
                .innerText();
            const bankAccountIban = bankAccountRelation.replace('Powiązane z kontem bankowym: ', '');
            expect(bankAccountIban).not.toBe('');
            bankAccountToRestore = {accountName: originalAccountName, iban: bankAccountIban};

            await disconnectBankAccount(page, originalAccountName, () => {
                bankAccountAssignment = 'unassigned';
            });
            await assignBankAccount(page, createdName, bankAccountIban, () => {
                bankAccountAssignment = 'test-account';
            });

            await entityRow(page, createdName)
                .getByRole('button', {name: /Edytuj element .* w sekcji Konta/})
                .click();
            const editDialog = page.getByRole('dialog', {name: 'Edytuj konto'});
            await editDialog.getByRole('textbox', {name: 'Nazwa'}).fill(updatedName);
            await performGraphQlOperation(page, 'UpdateAccount', () =>
                editDialog.getByRole('button', {name: 'Zapisz zmiany'}).click()
            );
            accountToClean = updatedName;
            await expect(page.getByText(updatedName, {exact: true})).toBeVisible();

            await disconnectBankAccount(page, updatedName, () => {
                bankAccountAssignment = 'unassigned';
            });
            await assignBankAccount(page, originalAccountName, bankAccountIban, () => {
                bankAccountAssignment = 'original';
            });

            await deleteAccountIfPresent(page, domainPublicId, updatedName);
            accountToClean = '';
        } finally {
            try {
                if (bankAccountToRestore && bankAccountAssignment !== 'original') {
                    await openAccountsSettingsPage(page, domainPublicId);
                    if (bankAccountAssignment === 'test-account' && accountToClean) {
                        await disconnectBankAccount(page, accountToClean, () => {
                            bankAccountAssignment = 'unassigned';
                        });
                    }
                    if (bankAccountAssignment === 'unassigned') {
                        await assignBankAccount(
                            page,
                            bankAccountToRestore.accountName,
                            bankAccountToRestore.iban,
                            () => {
                                bankAccountAssignment = 'original';
                            }
                        );
                    }
                }
            } finally {
                if (accountToClean) {
                    await deleteAccountIfPresent(page, domainPublicId, accountToClean);
                }
            }
        }
    });

    test('obsługuje tryb firmowy, klientów, dostawców i kategorie wydatków', async ({page}) => {
        test.setTimeout(180_000);
        const domainPublicId = await login(page);
        const clientName = `E2E klient ${RUN_ID}`;
        const updatedClientName = `${clientName} zmieniony`;
        const supplierName = `E2E dostawca ${RUN_ID}`;
        const updatedSupplierName = `${supplierName} zmieniony`;
        const categoryName = `E2E kategoria ${RUN_ID}`;
        const updatedCategoryName = `${categoryName} zmieniona`;
        const categoryDescription = 'Kategoria utworzona przez test ustawień';
        const updatedCategoryDescription = `${categoryDescription} — zmieniona`;

        await openSettingsTab(page, domainPublicId, 'Wydatki');
        const companyMode = page.getByRole('checkbox', {name: 'Tryb firmowy', exact: true});
        const initiallyCompany = await companyMode.isChecked();

        const setCompanyMode = async (enabled: boolean) => {
            const update = await performGraphQlOperationWithRefetch<
                { updateAccountantSettings: string },
                { settings: { accountantSettings: { isCompany: boolean } } }
            >(page, 'UpdateAccountantSettings', 'GetAccountantSettings', () => companyMode.click());
            expect(update.mutation.variables).toEqual({isCompany: enabled});
            expect(update.mutation.responseBody.data!.updateAccountantSettings).toBeTruthy();
            expect(update.refetch.settings.accountantSettings.isCompany).toBe(enabled);
            await expect(companyMode).toBeChecked({checked: enabled});
        };

        try {
            if (initiallyCompany) {
                await setCompanyMode(false);
                await expect(page.getByRole('tab', {name: 'Firma', exact: true})).toHaveCount(0);
            }
            await setCompanyMode(true);
            await expect(page.getByRole('tab', {name: 'Firma', exact: true})).toBeVisible();
            await page.getByRole('tab', {name: 'Firma', exact: true}).click();
            await expect(page.getByRole('tabpanel', {name: 'Firma'})).toBeVisible();

            await exerciseNamedCrud(page, {
                sectionName: 'Klienci',
                addLabel: 'Dodaj klienta',
                createDialogName: 'Dodaj klienta',
                editDialogName: 'Edytuj klienta',
                deleteDialogName: 'Usunąć klienta?',
                createOperation: 'CreateClient',
                updateOperation: 'UpdateClient',
                deleteOperation: 'DeleteClient',
                refetchOperation: 'GetAllClients',
                createResultField: 'createClient',
                updateResultField: 'updateClient',
                deleteResultField: 'deleteClient',
                name: clientName,
                updatedName: updatedClientName,
            });
            await exerciseNamedCrud(page, {
                sectionName: 'Dostawcy',
                addLabel: 'Dodaj dostawcę',
                createDialogName: 'Dodaj dostawcę',
                editDialogName: 'Edytuj dostawcę',
                deleteDialogName: 'Usunąć dostawcę?',
                createOperation: 'CreateSupplier',
                updateOperation: 'UpdateSupplier',
                deleteOperation: 'DeleteSupplier',
                refetchOperation: 'GetAllSuppliers',
                createResultField: 'createSupplier',
                updateResultField: 'updateSupplier',
                deleteResultField: 'deleteSupplier',
                name: supplierName,
                updatedName: updatedSupplierName,
            });

            await page.getByRole('tab', {name: 'Wydatki', exact: true}).click();
            const categorySection = sectionByHeading(page, 'Kategorie wydatków');
            await categorySection.getByRole('button', {name: 'Dodaj kategorię', exact: true}).click();
            let dialog = page.getByRole('dialog', {name: 'Dodaj kategorię', exact: true});
            await expectNoGraphQlOperation(page, ['CreateBillingCategory'], async () => {
                await dialog.getByRole('button', {name: 'Dodaj kategorię', exact: true}).click();
                await expect(dialog.getByText('Wymagana', {exact: true})).toHaveCount(2);
                await dialog.getByRole('button', {name: 'Anuluj', exact: true}).click();
            });

            await categorySection.getByRole('button', {name: 'Dodaj kategorię', exact: true}).click();
            dialog = page.getByRole('dialog', {name: 'Dodaj kategorię', exact: true});
            await dialog.getByRole('textbox', {name: 'Nazwa', exact: true}).fill(categoryName);
            await dialog.getByRole('textbox', {name: 'Opis', exact: true}).fill(categoryDescription);
            const creation = await performGraphQlOperationWithRefetch<
                { createBillingCategory: { publicId: string; name: string; description: string } },
                FinanceManagementData
            >(page, 'CreateBillingCategory', 'GetFinanceManagementWithNotAssignedBankAccounts', () =>
                dialog.getByRole('button', {name: 'Dodaj kategorię', exact: true}).click()
            );
            const category = creation.mutation.responseBody.data!.createBillingCategory;
            expect(creation.mutation.variables).toEqual({name: categoryName, description: categoryDescription});
            expect(category).toMatchObject({name: categoryName, description: categoryDescription});
            expect(creation.refetch.financeManagement.billingCategories).toContainEqual(
                expect.objectContaining({publicId: category.publicId, name: categoryName})
            );

            let row = entityRowIn(categorySection, categoryName);
            await row.getByRole('button', {name: /Edytuj element .* w sekcji Kategorie wydatków/}).click();
            dialog = page.getByRole('dialog', {name: 'Edytuj kategorię', exact: true});
            await dialog.getByRole('textbox', {name: 'Nazwa', exact: true}).fill(updatedCategoryName);
            await dialog.getByRole('textbox', {name: 'Opis', exact: true}).fill(updatedCategoryDescription);
            const update = await performGraphQlOperationWithRefetch<
                { updateBillingCategory: { publicId: string; name: string; description: string } },
                FinanceManagementData
            >(page, 'UpdateBillingCategory', 'GetFinanceManagementWithNotAssignedBankAccounts', () =>
                dialog.getByRole('button', {name: 'Zapisz zmiany', exact: true}).click()
            );
            expect(update.mutation.variables).toEqual({
                publicId: category.publicId,
                name: updatedCategoryName,
                description: updatedCategoryDescription,
            });
            expect(update.mutation.responseBody.data!.updateBillingCategory).toMatchObject({
                publicId: category.publicId,
                name: updatedCategoryName,
                description: updatedCategoryDescription,
            });

            row = entityRowIn(categorySection, updatedCategoryName);
            await row.getByRole('button', {name: /Usuń element .* z sekcji Kategorie wydatków/}).click();
            let confirmation = page.getByRole('dialog', {name: 'Usunąć kategorię?', exact: true});
            await expectNoGraphQlOperation(page, ['DeleteBillingCategory'], async () => {
                await confirmation.getByRole('button', {name: 'Anuluj', exact: true}).click();
            });
            await row.getByRole('button', {name: /Usuń element .* z sekcji Kategorie wydatków/}).click();
            confirmation = page.getByRole('dialog', {name: 'Usunąć kategorię?', exact: true});
            const deletion = await performGraphQlOperationWithRefetch<
                { deleteBillingCategory: string },
                FinanceManagementData
            >(page, 'DeleteBillingCategory', 'GetFinanceManagementWithNotAssignedBankAccounts', () =>
                confirmation.getByRole('button', {name: 'Usuń', exact: true}).click()
            );
            expect(deletion.mutation.variables).toEqual({publicId: category.publicId});
            expect(deletion.mutation.responseBody.data!.deleteBillingCategory).toBeTruthy();
            await expect(categorySection.getByText(updatedCategoryName, {exact: true})).toHaveCount(0);
        } finally {
            await openSettingsTab(page, domainPublicId, 'Wydatki');
            const currentlyCompany = await companyMode.isChecked();
            if (currentlyCompany) {
                await openSettingsTab(page, domainPublicId, 'Firma');
                await deleteNamedEntityIfPresent(
                    page,
                    'Klienci',
                    [clientName, updatedClientName],
                    'Usunąć klienta?',
                    'DeleteClient'
                );
                await deleteNamedEntityIfPresent(
                    page,
                    'Dostawcy',
                    [supplierName, updatedSupplierName],
                    'Usunąć dostawcę?',
                    'DeleteSupplier'
                );
            }
            await openSettingsTab(page, domainPublicId, 'Wydatki');
            await deleteNamedEntityIfPresent(
                page,
                'Kategorie wydatków',
                [categoryName, updatedCategoryName],
                'Usunąć kategorię?',
                'DeleteBillingCategory'
            );
            if (currentlyCompany !== initiallyCompany) {
                await setCompanyMode(initiallyCompany);
            }
        }
    });

    test('tworzy domenę oraz obsługuje odrzucenie, akceptację i role domenowe użytkownika', async ({page}) => {
        test.setTimeout(240_000);
        const initialDomainPublicId = await login(page);
        const domainName = `E2E domena ${RUN_ID}`;
        const updatedDomainName = `${domainName} zmieniona`;

        const uniqueLogin = `e2esettings${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
        const invitedUser = {
            firstName: 'E2E',
            lastName: `SETTINGS ${RUN_ID}`,
            login: uniqueLogin,
            email: `${uniqueLogin}@example.test`,
            password: 'E2eSettingsPassword1!',
            otp: '123456',
        };
        const invitedUserCredentials = {
            login: invitedUser.login,
            password: invitedUser.password,
            otp: invitedUser.otp,
        };
        let invitedUserName = '';
        let registered = false;
        let invitationPending = false;
        let accepted = false;

        await openSettingsTab(page, initialDomainPublicId, 'Domeny');
        const domainsSection = sectionByHeading(page, 'Domeny');
        await domainsSection.getByRole('button', {name: 'Dodaj domenę', exact: true}).click();
        let domainDialog = page.getByRole('dialog', {name: 'Dodaj domenę', exact: true});
        await expectNoGraphQlOperation(page, ['CreateDomain'], async () => {
            await domainDialog.getByRole('button', {name: 'Dodaj domenę', exact: true}).click();
            await expect(domainDialog.getByRole('textbox', {name: 'Nazwa', exact: true})).toHaveAttribute(
                'aria-invalid',
                'true'
            );
            await domainDialog.getByRole('button', {name: 'Anuluj', exact: true}).click();
        });

        await domainsSection.getByRole('button', {name: 'Dodaj domenę', exact: true}).click();
        domainDialog = page.getByRole('dialog', {name: 'Dodaj domenę', exact: true});
        await domainDialog.getByRole('textbox', {name: 'Nazwa', exact: true}).fill(domainName);
        const domainCreation = await performGraphQlOperationWithRefetch<
            { createDomain: { publicId: string; name: string } },
            DomainsData
        >(page, 'CreateDomain', 'DomainsData', () =>
            domainDialog.getByRole('button', {name: 'Dodaj domenę', exact: true}).click()
        );
        const domainPublicId = domainCreation.mutation.responseBody.data!.createDomain.publicId;
        expect(domainCreation.mutation.variables).toEqual({name: domainName});
        expect(domainCreation.mutation.responseBody.data!.createDomain).toMatchObject({name: domainName});
        expect(domainCreation.refetch.settings.domains).toContainEqual(
            expect.objectContaining({publicId: domainPublicId, name: domainName})
        );
        await expect(entityRowIn(domainsSection, domainName)).toBeVisible();

        await entityRowIn(domainsSection, domainName)
            .getByRole('button', {name: /Edytuj element .* w sekcji Domeny/})
            .click();
        domainDialog = page.getByRole('dialog', {name: 'Edytuj domenę', exact: true});
        await domainDialog.getByRole('textbox', {name: 'Nazwa', exact: true}).fill(updatedDomainName);
        const domainUpdate = await performGraphQlOperationWithRefetch<
            { updateDomain: { publicId: string; name: string } },
            DomainsData
        >(page, 'UpdateDomain', 'DomainsData', () =>
            domainDialog.getByRole('button', {name: 'Zapisz zmiany', exact: true}).click()
        );
        expect(domainUpdate.mutation.variables).toEqual({
            domainPublicId,
            name: updatedDomainName,
        });
        expect(domainUpdate.mutation.responseBody.data!.updateDomain).toMatchObject({
            publicId: domainPublicId,
            name: updatedDomainName,
        });
        const currentDomainName = updatedDomainName;

        const inviteUser = async () => {
            await openSettingsTab(page, initialDomainPublicId, 'Domeny');
            await page
                .getByRole('button', {name: `Zaproś użytkownika do domeny ${currentDomainName}`, exact: true})
                .click();
            const dialog = page.getByRole('dialog', {
                name: `Zaproś użytkownika do domeny „${currentDomainName}”`,
                exact: true,
            });
            await dialog.getByRole('textbox', {name: 'Login użytkownika', exact: true}).fill(invitedUser.login);
            const invitation = await performGraphQlOperationWithRefetch<{ inviteUserToDomain: string }, DomainsData>(
                page,
                'InviteUserToDomain',
                'DomainsData',
                () => dialog.getByRole('button', {name: 'Wyślij zaproszenie', exact: true}).click()
            );
            expect(invitation.mutation.variables).toEqual({
                domainPublicId,
                invitedUserLogin: invitedUser.login,
            });
            expect(invitation.mutation.responseBody.data!.inviteUserToDomain).toBeTruthy();
            invitationPending = true;
        };

        try {
            await logout(page, ADMIN_NAME);
            await registerUser(page, invitedUser);
            registered = true;
            const firstUserLogin = await loginAs(page, invitedUserCredentials);
            invitedUserName = firstUserLogin.name;
            await logout(page, invitedUserName);

            await loginAs(page, {login: ADMIN_LOGIN, password: ADMIN_PASSWORD, otp: ADMIN_OTP});
            await inviteUser();
            await logout(page, ADMIN_NAME);

            await loginAs(page, invitedUserCredentials);
            const rejectButton = page.getByRole('button', {
                name: `Odrzuć zaproszenie do domeny ${currentDomainName}`,
                exact: true,
            });
            await expect(rejectButton).toBeVisible();
            const rejection = await performGraphQlOperationWithRefetch<{
                rejectInvitationToDomain: string
            }, DomainsData>(
                page,
                'RejectInvitationToDomain',
                'DomainsData',
                () => rejectButton.click()
            );
            expect(rejection.mutation.variables).toEqual({domainPublicId});
            expect(rejection.mutation.responseBody.data!.rejectInvitationToDomain).toBeTruthy();
            invitationPending = false;
            await expect(rejectButton).toHaveCount(0);
            await logout(page, invitedUserName);

            await loginAs(page, {login: ADMIN_LOGIN, password: ADMIN_PASSWORD, otp: ADMIN_OTP});
            await inviteUser();
            await logout(page, ADMIN_NAME);

            await loginAs(page, invitedUserCredentials);
            const acceptButton = page.getByRole('button', {
                name: `Akceptuj zaproszenie do domeny ${currentDomainName}`,
                exact: true,
            });
            const acceptance = await performGraphQlOperationBeforeNavigation<{ acceptInvitationToDomain: string }>(
                page,
                'AcceptInvitationToDomain',
                () => acceptButton.click()
            );
            accepted = true;
            invitationPending = false;
            expect(acceptance.variables).toEqual({domainPublicId});
            expect(acceptance.responseBody.data!.acceptInvitationToDomain).toBeTruthy();
            await expect(page.getByRole('textbox', {name: 'Login'})).toBeVisible();

            await loginAs(page, {login: ADMIN_LOGIN, password: ADMIN_PASSWORD, otp: ADMIN_OTP});
            await openSettingsTab(page, initialDomainPublicId, 'Domeny');
            const promoteButton = page.getByRole('button', {
                name: `Ustaw użytkownika ${invitedUser.login} jako administratora domeny ${currentDomainName}`,
                exact: true,
            });
            await promoteButton.click();
            let confirmation = page.getByRole('dialog', {name: 'Potwierdź zmianę', exact: true});
            await expectNoGraphQlOperation(page, ['SetUserDomainAccessLevel'], async () => {
                await confirmation.getByRole('button', {name: 'Anuluj', exact: true}).click();
            });
            await promoteButton.click();
            confirmation = page.getByRole('dialog', {name: 'Potwierdź zmianę', exact: true});
            const promotion = await performGraphQlOperationWithRefetch<{
                setUserDomainAccessLevel: string
            }, DomainsData>(
                page,
                'SetUserDomainAccessLevel',
                'DomainsData',
                () => confirmation.getByRole('button', {name: 'Zmień uprawnienia', exact: true}).click()
            );
            expect(promotion.mutation.variables).toEqual({
                domainPublicId,
                userLogin: invitedUser.login,
                domainAccessLevel: 'ADMIN',
            });
            expect(promotion.mutation.responseBody.data!.setUserDomainAccessLevel).toBeTruthy();
            expect(
                promotion.refetch.settings.domains
                    .find(domain => domain.publicId === domainPublicId)!
                    .users.find(user => user.login === invitedUser.login)?.domainAccessLevel
            ).toBe('ADMIN');

            const demoteButton = page.getByRole('button', {
                name: `Ustaw użytkownika ${invitedUser.login} jako członka domeny ${currentDomainName}`,
                exact: true,
            });
            await demoteButton.click();
            confirmation = page.getByRole('dialog', {name: 'Potwierdź zmianę', exact: true});
            const demotion = await performGraphQlOperationWithRefetch<{
                setUserDomainAccessLevel: string
            }, DomainsData>(
                page,
                'SetUserDomainAccessLevel',
                'DomainsData',
                () => confirmation.getByRole('button', {name: 'Zmień uprawnienia', exact: true}).click()
            );
            expect(demotion.mutation.variables).toEqual({
                domainPublicId,
                userLogin: invitedUser.login,
                domainAccessLevel: 'MEMBER',
            });
            expect(demotion.mutation.responseBody.data!.setUserDomainAccessLevel).toBeTruthy();
        } finally {
            if (registered && invitationPending) {
                await clearSessionAndOpenLogin(page);
                await loginAs(page, invitedUserCredentials);
                const rejectButton = page.getByRole('button', {
                    name: `Odrzuć zaproszenie do domeny ${currentDomainName}`,
                    exact: true,
                });
                if (await rejectButton.isVisible()) {
                    await performGraphQlOperation(page, 'RejectInvitationToDomain', () => rejectButton.click());
                }
                invitationPending = false;
            }
            if (accepted) {
                await clearSessionAndOpenLogin(page);
                await loginAs(page, {login: ADMIN_LOGIN, password: ADMIN_PASSWORD, otp: ADMIN_OTP});
                await openSettingsTab(page, initialDomainPublicId, 'Domeny');
                const removeButton = page.getByRole('button', {
                    name: `Usuń użytkownika ${invitedUser.login} z domeny ${currentDomainName}`,
                    exact: true,
                });
                if (await removeButton.isVisible()) {
                    await removeButton.click();
                    const confirmation = page.getByRole('dialog', {name: 'Potwierdź zmianę', exact: true});
                    await performGraphQlOperationWithRefetch<{ setUserDomainAccessLevel: string }, DomainsData>(
                        page,
                        'SetUserDomainAccessLevel',
                        'DomainsData',
                        () => confirmation.getByRole('button', {name: 'Usuń użytkownika', exact: true}).click()
                    );
                }
            }
        }
    });

    test('pokazuje dostępy bankowe, anuluje wybór banku i obsługuje błąd odświeżenia rachunku', async ({page}, testInfo) => {
        const domainPublicId = await login(page);
        await openAccountantPage(page, domainPublicId, '/settings');
        const permissionsPromise = waitForGraphQlData<BankPermissionsData>(page, 'GetBankPermissions');
        const institutionsPromise = waitForGraphQlData<AvailableInstitutionsData>(page, 'GetAvailableInstitutions');
        await page.getByRole('tab', {name: 'Banki', exact: true}).click();
        const [permissions, institutions] = await Promise.all([permissionsPromise, institutionsPromise]);
        await expect(page.getByRole('tabpanel', {name: 'Banki'})).toBeVisible();
        await expect(sectionByHeading(page, 'Aktywne dostępy')).toContainText(
            `Liczba: ${permissions.bankPermissions.granted.length}`
        );
        await expect(sectionByHeading(page, 'Oczekujące na autoryzację')).toContainText(
            `Liczba: ${permissions.bankPermissions.toProcess.length}`
        );
        await expect(sectionByHeading(page, 'Wygasłe dostępy')).toContainText(
            `Liczba: ${permissions.bankPermissions.toRecreate.length}`
        );

        await page.getByRole('button', {name: 'Dodaj bank', exact: true}).click();
        const picker = page.getByRole('dialog', {name: 'Wybierz bank do podłączenia', exact: true});
        await expect(picker).toBeVisible();
        expect(
            institutions.bankPermissions.availableInstitutions.length,
            'Środowisko E2E powinno udostępniać co najmniej jedną instytucję bankową'
        ).toBeGreaterThan(0);
        await expect(
            picker.getByText(institutions.bankPermissions.availableInstitutions[0].name, {exact: true})
        ).toBeVisible();
        await expectNoGraphQlOperation(page, ['StartPermissionRequest'], async () => {
            await picker.getByRole('button', {name: 'Zamknij', exact: true}).click();
        });
        await expect(picker).toBeHidden();

        const bankAccounts = permissions.bankPermissions.granted.flatMap(permission => permission.bankAccounts);
        const refreshableBankAccount = bankAccounts[0];
        if (!refreshableBankAccount) {
            testInfo.annotations.push({
                type: 'warunek środowiska',
                description: 'Brak aktywnego rachunku bankowego; pominięto ręczne odświeżenie danych.',
            });
            return;
        }
        const refreshResponsePromise = page.waitForResponse(
            response => graphQlOperationName(response.request()) === 'TriggerFetchBankAccountData'
        );
        await page.getByRole('button', {name: 'Odśwież dane', exact: true}).first().click();
        const refreshResponse = await refreshResponsePromise;
        const refreshBody = (await refreshResponse.json()) as { errors?: Array<{ message?: string }> };

        expect(
            (refreshResponse.request().postDataJSON() as { variables?: Record<string, unknown> }).variables
        ).toEqual({bankAccountPublicId: refreshableBankAccount.publicId});
        expect(refreshResponse.ok()).toBeTruthy();
        expect(refreshBody.errors).toHaveLength(1);
        expect(refreshBody.errors![0].message).toContain('500');
    });
});
