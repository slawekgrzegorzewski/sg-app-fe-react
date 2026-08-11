import {expect, test, type Locator, type Page, type Request, type Response, type TestInfo} from '@playwright/test';

const RUN_ID = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
const LOGIN = process.env.E2E_LOGIN ?? 'slag';
const PASSWORD = process.env.E2E_PASSWORD ?? 'e2e';
const OTP = process.env.E2E_OTP ?? 'e2e';

type GraphQlResponse<TData = unknown> = {
    data?: TData;
    errors?: Array<{message?: string}>;
};

type CubeResultsData = {
    cubeResults: {
        numberOfSolves: number;
        todayAverageInMillis: number;
    };
};

type CubeDayStats = {
    day: string;
    min?: number | null;
    max?: number | null;
    minAo5?: number | null;
    minAo30?: number | null;
    numberOfTries: number;
};

type CubeStatsData = {
    cubeResults: {
        topTenAllTime: Array<{timeInMillis: number; date: string}>;
        stats: CubeDayStats[];
    };
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

async function performGraphQlOperation(
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

function waitForGraphQlData<TData>(page: Page, operationName: string): Promise<TData> {
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

function formatCubeTime(timeInMillis?: number | null): string {
    if (timeInMillis === null || timeInMillis === undefined) {
        return '—';
    }

    const minutes = Math.floor(timeInMillis / 60_000);
    const seconds = Math.floor(timeInMillis / 1_000) % 60;
    const milliseconds = timeInMillis % 1_000;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds
        .toString()
        .padStart(3, '0')}`;
}

function summarizeCubeStats(stats: CubeDayStats[]) {
    const availableMinimum = (values: Array<number | null | undefined>): number | null => {
        const availableValues = values.filter((value): value is number => value !== null && value !== undefined);
        return availableValues.length > 0 ? Math.min(...availableValues) : null;
    };

    return {
        numberOfTries: stats.reduce((total, day) => total + day.numberOfTries, 0),
        activeDays: stats.filter(day => day.numberOfTries > 0).length,
        bestTime: availableMinimum(stats.map(day => day.min)),
        bestAo5: availableMinimum(stats.map(day => day.minAo5)),
    };
}

async function recordCubeSolve(
    page: Page,
    timeInMillis: number,
    expectedNumberOfSolves: number
): Promise<CubeResultsData> {
    await page.keyboard.down('Space');
    await expect(page.getByText('INSPECTION_EARLY', {exact: true})).toBeVisible();
    await page.keyboard.up('Space');
    await expect(page.getByText('SOLVING', {exact: true})).toBeVisible();
    await page.clock.fastForward(timeInMillis);
    await page.keyboard.down('Space');
    await expect(page.getByText('IDLE', {exact: true})).toBeVisible();
    await page.keyboard.up('Space');
    await expect(page.getByRole('timer', {name: formatCubeTime(timeInMillis)})).toBeVisible();

    const updatedResultsPromise = waitForGraphQlData<CubeResultsData>(page, 'GetCubeResults');
    await performGraphQlOperation(page, 'StoreCubeResult', () => page.keyboard.press('Enter'));
    const updatedResults = await updatedResultsPromise;
    await expect(page.getByRole('group', {name: 'Liczba ułożeń'}).getByRole('heading')).toHaveText(
        String(expectedNumberOfSolves)
    );
    return updatedResults;
}

function recordConditionalStep(testInfo: TestInfo, message: string): void {
    testInfo.annotations.push({type: 'warunek środowiska', description: message});
    console.log(`[E2E] ${message}`);
}

async function login(page: Page): Promise<string> {
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

async function openAccountantPage(page: Page, domainPublicId: string, suffix = ''): Promise<void> {
    await page.goto(`/ACCOUNTANT/${domainPublicId}${suffix}`);
    await expect(
        page.getByRole('heading', {name: suffix === '/settings' ? 'Ustawienia' : 'Okresy rozliczeniowe'})
    ).toBeVisible();
}

async function chooseFirstOption(page: Page, combobox: Locator): Promise<string> {
    await combobox.click();
    const option = page.getByRole('listbox').getByRole('option').first();
    await expect(option).toBeVisible();
    const optionName = await option.innerText();
    await option.click();
    return optionName;
}

async function chooseMatchingOption(page: Page, combobox: Locator, optionName: RegExp): Promise<string> {
    await combobox.click();
    const option = page.getByRole('listbox').getByRole('option', {name: optionName}).first();
    await expect(option).toBeVisible();
    const selectedOptionName = await option.innerText();
    await option.click();
    return selectedOptionName;
}

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function billingElementsSection(page: Page, title: 'Dochody' | 'Wydatki'): Locator {
    return page
        .getByRole('heading', {name: title, exact: true})
        .locator('xpath=ancestor::*[contains(@class, "MuiPaper-root")][1]');
}

async function billingElementsCount(section: Locator): Promise<number> {
    const countText = await section.getByText(/^Liczba pozycji: \d+$/).innerText();
    return Number(countText.replace(/\D/g, ''));
}

type VisibleAccountSnapshot = {
    name: string;
    formattedBalance: string;
};

async function openAccountsPage(page: Page, domainPublicId: string): Promise<void> {
    await page.goto(`/ACCOUNTANT/${domainPublicId}/accounts`);
    await expect(page.getByRole('heading', {name: 'Konta', exact: true})).toBeVisible();
}

async function firstVisibleAccounts(page: Page, numberOfAccounts: number): Promise<VisibleAccountSnapshot[]> {
    const accountButtons = page.locator('button[aria-haspopup="dialog"]');
    await expect(accountButtons.first()).toBeVisible();
    expect(
        await accountButtons.count(),
        `Do testu jest wymagane co najmniej ${numberOfAccounts} widocznych kont`
    ).toBeGreaterThanOrEqual(numberOfAccounts);

    return Promise.all(
        Array.from({length: numberOfAccounts}, async (_, index) => {
            const textParts = (await accountButtons.nth(index).locator('p').allInnerTexts()).map(text => text.trim());
            expect(textParts, 'Przycisk konta powinien zawierać nazwę i saldo').toHaveLength(2);
            return {name: textParts[0], formattedBalance: textParts[1]};
        })
    );
}

async function parseFormattedAmount(page: Page, formattedAmount: string, currency: string): Promise<number> {
    return page.evaluate(
        ({formattedAmount, currency}) => {
            const formatParts = new Intl.NumberFormat(navigator.language, {style: 'currency', currency}).formatToParts(
                1234567.89
            );
            const groupSeparator = formatParts.find(part => part.type === 'group')?.value;
            const decimalSeparator = formatParts.find(part => part.type === 'decimal')?.value;
            const minusSign = formatParts.find(part => part.type === 'minusSign')?.value ?? '-';
            const isNegative = formattedAmount.includes('(') || formattedAmount.includes(minusSign);
            let normalizedAmount = formattedAmount;

            if (groupSeparator) {
                normalizedAmount = normalizedAmount.split(groupSeparator).join('');
            }
            if (decimalSeparator) {
                normalizedAmount = normalizedAmount.replace(decimalSeparator, '.');
            }

            const amount = Number(normalizedAmount.replace(/[^\d.]/g, ''));
            if (!Number.isFinite(amount)) {
                throw new Error(`Nie udało się odczytać kwoty: ${formattedAmount}`);
            }
            return isNegative ? -amount : amount;
        },
        {formattedAmount, currency}
    );
}

async function formatAccountBalance(page: Page, amount: number, currency: string): Promise<string> {
    return page.evaluate(
        ({amount, currency}) => {
            const formattedAmount = new Intl.NumberFormat(navigator.language, {style: 'currency', currency}).format(
                Math.abs(amount)
            );
            return amount < 0 ? `(${formattedAmount})` : formattedAmount;
        },
        {amount, currency}
    );
}

type BillingElementKind = 'income' | 'expense';

async function createBillingElement(
    page: Page,
    kind: BillingElementKind,
    accountName: string,
    amount: string,
    description: string,
    categoryName?: string
): Promise<{categoryName: string; currency: string}> {
    const isIncome = kind === 'income';
    await page.getByRole('button', {name: isIncome ? 'Dodaj dochód' : 'Dodaj wydatek', exact: true}).click();
    const dialog = page.getByRole('dialog', {name: isIncome ? 'Stwórz dochód' : 'Stwórz wydatek'});
    const accountOptionName = await chooseMatchingOption(
        page,
        dialog.getByRole('combobox', {name: isIncome ? 'Na konto' : 'Z konta'}),
        new RegExp(`^${escapeRegExp(accountName)} \\(([^()]*)\\)$`)
    );
    const accountOptionMatch = accountOptionName.match(/ \(([^()]*)\)$/);
    expect(accountOptionMatch, `Nie udało się ustalić waluty konta ${accountName}`).not.toBeNull();

    await dialog.getByRole('spinbutton', {name: 'Kwota'}).fill(amount);
    const categoryCombobox = dialog.getByRole('combobox', {name: 'Kategoria'});
    const selectedCategoryName = categoryName
        ? await chooseMatchingOption(page, categoryCombobox, new RegExp(`^${escapeRegExp(categoryName)}$`))
        : await chooseFirstOption(page, categoryCombobox);
    await dialog.getByRole('textbox', {name: 'Opis'}).fill(description);
    await performGraphQlOperation(page, isIncome ? 'CreateIncome' : 'CreateExpense', () =>
        dialog.getByRole('button', {name: 'Zapisz'}).click()
    );
    await expect(dialog).toBeHidden();

    return {categoryName: selectedCategoryName, currency: accountOptionMatch![1]};
}

function entityRow(page: Page, entityName: string): Locator {
    return page
        .getByText(entityName, {exact: true})
        .locator('xpath=ancestor::div[descendant::button[contains(@aria-label, "Edytuj element")]][1]');
}

async function disconnectBankAccount(
    page: Page,
    accountName: string,
    onMutationCompleted: () => void = () => {}
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
    onMutationCompleted: () => void = () => {}
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
    await openAccountantPage(page, domainPublicId, '/settings');
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

async function ensureActiveBillingPeriod(page: Page, domainPublicId: string, testInfo: TestInfo): Promise<boolean> {
    await openAccountantPage(page, domainPublicId);

    const activeStatus = page.getByText('Okres aktywny', {exact: true});
    const createButton = page.getByRole('button', {name: 'Utwórz okres'});
    const finishedStatus = page.getByText('Okres zakończony', {exact: true});
    const errorAlert = page.getByRole('alert');

    await expect(activeStatus.or(createButton).or(finishedStatus).or(errorAlert)).toBeVisible();

    if (await activeStatus.isVisible()) {
        return true;
    }

    if (await createButton.isVisible()) {
        await performGraphQlOperation(page, 'CreateBillingPeriod', () => createButton.click());
        await expect(activeStatus).toBeVisible();
        return true;
    }

    if (await finishedStatus.isVisible()) {
        recordConditionalStep(testInfo, 'Bieżący okres jest już zakończony.');
        return false;
    }

    if (await errorAlert.isVisible()) {
        const errorMessage = await errorAlert.innerText();
        throw new Error(`Nie udało się ustalić stanu okresu rozliczeniowego: ${errorMessage}`);
    }

    throw new Error('Widok nie pokazuje aktywnego, zakończonego ani możliwego do utworzenia okresu rozliczeniowego.');
}

test.describe.serial('pełna integracja interakcji z danymi', () => {
    test('zapisuje, modyfikuje i usuwa konto', async ({page}) => {
        const domainPublicId = await login(page);
        const createdName = `E2E konto ${RUN_ID}`;
        const updatedName = `${createdName} zmienione`;
        let accountToClean = createdName;
        let bankAccountToRestore: {accountName: string; iban: string} | undefined;
        let bankAccountAssignment: 'original' | 'unassigned' | 'test-account' = 'original';

        await openAccountantPage(page, domainPublicId, '/settings');

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
                    await openAccountantPage(page, domainPublicId, '/settings');
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

    test('zapisuje dochód i importuje transakcję, jeżeli jest dostępna', async ({page}, testInfo) => {
        const domainPublicId = await login(page);
        if (!(await ensureActiveBillingPeriod(page, domainPublicId, testInfo))) {
            return;
        }

        const incomeDescriptions = [`E2E dochód A ${RUN_ID}`, `E2E dochód B ${RUN_ID}`];
        const expenseDescriptions = [`E2E wydatek A ${RUN_ID}`, `E2E wydatek B ${RUN_ID}`];
        const incomeAmounts = ['1.11', '2.22'];
        const expenseAmounts = ['1.23', '2.34'];
        const incomeSection = billingElementsSection(page, 'Dochody');
        const expenseSection = billingElementsSection(page, 'Wydatki');
        const initialIncomeCount = await billingElementsCount(incomeSection);
        const initialExpenseCount = await billingElementsCount(expenseSection);
        const initialIncomeSummary = await incomeSection.innerText();
        const initialExpenseSummary = await expenseSection.innerText();

        await openAccountsPage(page, domainPublicId);
        const [incomeAccount, expenseAccount] = await firstVisibleAccounts(page, 2);
        await openAccountantPage(page, domainPublicId);

        const firstIncome = await createBillingElement(
            page,
            'income',
            incomeAccount.name,
            incomeAmounts[0],
            incomeDescriptions[0]
        );
        const secondIncome = await createBillingElement(
            page,
            'income',
            incomeAccount.name,
            incomeAmounts[1],
            incomeDescriptions[1],
            firstIncome.categoryName
        );
        expect(secondIncome.currency).toBe(firstIncome.currency);

        const firstExpense = await createBillingElement(
            page,
            'expense',
            expenseAccount.name,
            expenseAmounts[0],
            expenseDescriptions[0]
        );
        const secondExpense = await createBillingElement(
            page,
            'expense',
            expenseAccount.name,
            expenseAmounts[1],
            expenseDescriptions[1],
            firstExpense.categoryName
        );
        expect(secondExpense.currency).toBe(firstExpense.currency);

        await expect(incomeSection.getByText(`Liczba pozycji: ${initialIncomeCount + 2}`, {exact: true})).toBeVisible();
        await expect(
            expenseSection.getByText(`Liczba pozycji: ${initialExpenseCount + 2}`, {exact: true})
        ).toBeVisible();
        expect(await incomeSection.innerText()).not.toBe(initialIncomeSummary);
        expect(await expenseSection.innerText()).not.toBe(initialExpenseSummary);

        await incomeSection
            .getByRole('button', {name: new RegExp(`^${escapeRegExp(firstIncome.categoryName)}(?:\\s|$)`)})
            .click();
        const incomeCategoryDialog = page.getByRole('dialog', {
            name: `Dochody w kategorii: ${firstIncome.categoryName}`,
        });
        await expect(incomeCategoryDialog.getByText(incomeDescriptions[0], {exact: true})).toBeVisible();
        await expect(incomeCategoryDialog.getByText(incomeDescriptions[1], {exact: true})).toBeVisible();
        await incomeCategoryDialog.getByRole('button', {name: 'Zamknij'}).click();
        await expect(incomeCategoryDialog).toBeHidden();

        await expenseSection
            .getByRole('button', {name: new RegExp(`^${escapeRegExp(firstExpense.categoryName)}(?:\\s|$)`)})
            .click();
        const expenseCategoryDialog = page.getByRole('dialog', {
            name: `Wydatki w kategorii: ${firstExpense.categoryName}`,
        });
        await expect(expenseCategoryDialog.getByText(expenseDescriptions[0], {exact: true})).toBeVisible();
        await expect(expenseCategoryDialog.getByText(expenseDescriptions[1], {exact: true})).toBeVisible();
        await expenseCategoryDialog.getByRole('button', {name: 'Zamknij'}).click();
        await expect(expenseCategoryDialog).toBeHidden();

        const initialIncomeAccountBalance = await parseFormattedAmount(
            page,
            incomeAccount.formattedBalance,
            firstIncome.currency
        );
        const initialExpenseAccountBalance = await parseFormattedAmount(
            page,
            expenseAccount.formattedBalance,
            firstExpense.currency
        );
        const expectedIncomeAccountBalance =
            initialIncomeAccountBalance + incomeAmounts.reduce((sum, amount) => sum + Number(amount), 0);
        const expectedExpenseAccountBalance =
            initialExpenseAccountBalance - expenseAmounts.reduce((sum, amount) => sum + Number(amount), 0);
        const expectedFormattedIncomeBalance = await formatAccountBalance(
            page,
            expectedIncomeAccountBalance,
            firstIncome.currency
        );
        const expectedFormattedExpenseBalance = await formatAccountBalance(
            page,
            expectedExpenseAccountBalance,
            firstExpense.currency
        );

        await openAccountsPage(page, domainPublicId);
        const accountButtons = page.locator('button[aria-haspopup="dialog"]');
        await expect(accountButtons.filter({has: page.getByText(incomeAccount.name, {exact: true})})).toContainText(
            expectedFormattedIncomeBalance
        );
        await expect(accountButtons.filter({has: page.getByText(expenseAccount.name, {exact: true})})).toContainText(
            expectedFormattedExpenseBalance
        );

        await openAccountantPage(page, domainPublicId);

        const importButton = page.getByRole('button', {
            name: /^\d+ transakcj(?:a|e|i) do zaimportowania$/,
        });
        if ((await importButton.count()) === 0) {
            recordConditionalStep(testInfo, 'Brak transakcji bankowych do zaimportowania.');
            return;
        }

        await importButton.click();
        const pickerDialog = page.getByRole('dialog', {name: /Import transakcji/});
        await pickerDialog
            .getByRole('button', {name: /^Transakcja /})
            .first()
            .click();

        const expenseAction = pickerDialog.getByRole('button', {name: 'Utwórz wydatek'});
        const incomeAction = pickerDialog.getByRole('button', {name: 'Utwórz dochód'});
        const operationName = (await expenseAction.count()) > 0 ? 'CreateExpense' : 'CreateIncome';
        const action = operationName === 'CreateExpense' ? expenseAction : incomeAction;
        await expect(action, 'Wybrana transakcja nie udostępnia prostego sposobu importu').toBeVisible();
        await action.click();

        const importFormDialog = page.getByRole('dialog', {
            name: operationName === 'CreateExpense' ? 'Wydatek' : 'Dochód',
        });
        await chooseFirstOption(page, importFormDialog.getByRole('combobox', {name: 'Kategoria'}));
        await importFormDialog.getByRole('textbox', {name: 'Opis'}).fill(`E2E import ${RUN_ID} (${operationName})`);
        await performGraphQlOperation(page, operationName, () =>
            importFormDialog.getByRole('button', {name: 'Zapisz'}).click()
        );
        await expect(importFormDialog).toBeHidden();
    });

    test('uruchamia i zatrzymuje stoper kostki oraz zapisuje wynik', async ({page}) => {
        const domainPublicId = await login(page);
        await page.clock.install({time: new Date()});

        const initialResultsPromise = waitForGraphQlData<CubeResultsData>(page, 'GetCubeResults');
        await page.goto(`/CUBES/${domainPublicId}`);
        await expect(page.getByRole('heading', {name: 'Układanie kostek'})).toBeVisible();
        const initialResults = await initialResultsPromise;
        const solvesGroup = page.getByRole('group', {name: 'Liczba ułożeń'});
        const averageGroup = page.getByRole('group', {name: 'Dzisiejsza średnia'});
        await expect(solvesGroup.getByRole('heading')).toHaveText(String(initialResults.cubeResults.numberOfSolves));
        await expect(averageGroup.getByRole('heading')).toHaveText(
            `${initialResults.cubeResults.todayAverageInMillis / 1000} s`
        );

        const initialStatsPromise = waitForGraphQlData<CubeStatsData>(page, 'GetCubeStats');
        await page.goto(`/CUBES/${domainPublicId}/stats`);
        await expect(page.getByRole('heading', {name: 'Statystyki kostek'})).toBeVisible();
        const initialStats = await initialStatsPromise;
        const solveDay = await page.evaluate(() => {
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        });
        const initialTodayStats = initialStats.cubeResults.stats.find(day => day.day === solveDay);
        const initialMonthlySummary = summarizeCubeStats(initialStats.cubeResults.stats);
        const initialBestTime =
            initialStats.cubeResults.topTenAllTime.length > 0
                ? Math.min(...initialStats.cubeResults.topTenAllTime.map(result => result.timeInMillis))
                : null;
        expect(initialBestTime, 'Nie można pobić rekordu równego 1 ms').not.toBe(1);

        const recordTime = initialBestTime === null ? 100 : initialBestTime - 1;
        const slowerTimeBase = Math.max(initialBestTime ?? 1_000, 1_000);
        const solveTimes = [
            slowerTimeBase + 400,
            slowerTimeBase + 300,
            slowerTimeBase + 200,
            slowerTimeBase + 100,
            recordTime,
        ];

        const resultsBeforeSolvesPromise = waitForGraphQlData<CubeResultsData>(page, 'GetCubeResults');
        await page.goto(`/CUBES/${domainPublicId}`);
        await expect(page.getByRole('heading', {name: 'Układanie kostek'})).toBeVisible();
        await resultsBeforeSolvesPromise;
        await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 1_000);

        let finalResults = initialResults;
        for (const [index, solveTime] of solveTimes.entries()) {
            finalResults = await recordCubeSolve(
                page,
                solveTime,
                initialResults.cubeResults.numberOfSolves + index + 1
            );
            expect(finalResults.cubeResults.numberOfSolves).toBe(initialResults.cubeResults.numberOfSolves + index + 1);
        }

        const initialTodayNumberOfSolves = initialTodayStats?.numberOfTries ?? 0;
        const expectedTodayAverage =
            (initialResults.cubeResults.todayAverageInMillis * initialTodayNumberOfSolves +
                solveTimes.reduce((sum, time) => sum + time, 0)) /
            (initialTodayNumberOfSolves + solveTimes.length);
        expect(
            Math.abs(finalResults.cubeResults.todayAverageInMillis - expectedTodayAverage),
            'Dzisiejsza średnia powinna uwzględniać pięć nowych wyników'
        ).toBeLessThanOrEqual(1);
        await expect(averageGroup.getByRole('heading')).toHaveText(
            `${finalResults.cubeResults.todayAverageInMillis / 1000} s`
        );

        const finalStatsPromise = waitForGraphQlData<CubeStatsData>(page, 'GetCubeStats');
        await page.goto(`/CUBES/${domainPublicId}/stats`);
        await expect(page.getByRole('heading', {name: 'Statystyki kostek'})).toBeVisible();
        const finalStats = await finalStatsPromise;
        const finalMonthlySummary = summarizeCubeStats(finalStats.cubeResults.stats);
        const finalTodayStats = finalStats.cubeResults.stats.find(day => day.day === solveDay);
        expect(finalTodayStats, 'Brak dzisiejszego wiersza statystyk').toBeDefined();
        expect(finalMonthlySummary.numberOfTries).toBe(initialMonthlySummary.numberOfTries + solveTimes.length);
        expect(finalMonthlySummary.activeDays).toBe(
            initialMonthlySummary.activeDays + ((initialTodayStats?.numberOfTries ?? 0) > 0 ? 0 : 1)
        );
        expect(finalMonthlySummary.bestTime).toBe(recordTime);
        expect(finalTodayStats!.numberOfTries).toBe(initialTodayNumberOfSolves + solveTimes.length);
        expect(finalTodayStats!.min).toBe(recordTime);
        expect(finalTodayStats!.max).toBe(Math.max(initialTodayStats?.max ?? 0, ...solveTimes));
        expect(finalTodayStats!.minAo5, 'Pięć nowych wyników powinno wyznaczyć Ao5').not.toBeNull();
        expect(Math.min(...finalStats.cubeResults.topTenAllTime.map(result => result.timeInMillis))).toBe(recordTime);

        await expect(page.getByRole('group', {name: 'Liczba prób'}).getByRole('heading')).toHaveText(
            String(finalMonthlySummary.numberOfTries)
        );
        await expect(page.getByRole('group', {name: 'Aktywne dni'}).getByRole('heading')).toHaveText(
            String(finalMonthlySummary.activeDays)
        );
        await expect(page.getByRole('group', {name: 'Najlepszy czas'}).getByRole('heading')).toHaveText(
            formatCubeTime(finalMonthlySummary.bestTime)
        );
        await expect(page.getByRole('group', {name: 'Najlepsze Ao5'}).getByRole('heading')).toHaveText(
            formatCubeTime(finalMonthlySummary.bestAo5)
        );

        const todayLabel = await page.evaluate(day => {
            return new Intl.DateTimeFormat('pl-PL', {day: 'numeric', month: 'long'}).format(
                new Date(`${day}T12:00:00`)
            );
        }, solveDay);
        const dailyStatsTable = page.getByRole('table', {name: 'Dzienne statystyki kostki'});
        const todayRow = dailyStatsTable.getByRole('row').filter({hasText: todayLabel});
        await expect(todayRow).toBeVisible();
        expect((await todayRow.locator('th, td').allInnerTexts()).map(text => text.trim())).toEqual([
            todayLabel,
            String(finalTodayStats!.numberOfTries),
            formatCubeTime(finalTodayStats!.min),
            formatCubeTime(finalTodayStats!.max),
            formatCubeTime(finalTodayStats!.minAo5),
            formatCubeTime(finalTodayStats!.minAo30),
        ]);

        const topTenRows = page.getByRole('table', {name: 'Top 10 wyników wszech czasów'}).getByRole('row');
        await expect(topTenRows.nth(1).getByText(formatCubeTime(recordTime), {exact: true})).toBeVisible();
    });

    test('kończy bieżący okres rozliczeniowy', async ({page}, testInfo) => {
        const domainPublicId = await login(page);
        if (!(await ensureActiveBillingPeriod(page, domainPublicId, testInfo))) {
            return;
        }

        const finishButton = page.getByRole('button', {name: 'Zakończ okres', exact: true});
        if ((await finishButton.count()) === 0) {
            recordConditionalStep(testInfo, 'Nie ma aktywnego okresu możliwego do zakończenia.');
            return;
        }

        await finishButton.click();
        const confirmation = page.getByRole('dialog', {name: 'Zakończ okres rozliczeniowy?'});
        await performGraphQlOperation(page, 'FinishBillingPeriod', () =>
            confirmation.getByRole('button', {name: 'Zakończ okres'}).click()
        );
        await expect(page.getByText('Okres zakończony', {exact: true})).toBeVisible();
    });
});
