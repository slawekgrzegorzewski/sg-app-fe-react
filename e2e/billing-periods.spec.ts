/* eslint-disable testing-library/prefer-screen-queries, jest/valid-expect, jest/no-conditional-expect -- Playwright assertions inside controlled E2E branches are intentional. */
import {expect, type Locator, type Page, type Request, test, type TestInfo} from '@playwright/test';
import {
    chooseFirstOption,
    chooseMatchingOption,
    escapeRegExp,
    login,
    openAccountantPage,
    performGraphQlOperation,
    recordConditionalStep,
    RUN_ID,
    waitForGraphQlData,
} from './support/data-interactions';

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
    publicId: string;
    name: string;
    balance: number;
    currency: string;
};

type FinanceManagementData = {
    financeManagement: {
        accounts: Array<{
            publicId: string;
            name: string;
            visible: boolean;
            currentBalance: {amount: number; currency: {code: string}};
        }>;
        piggyBanks: Array<{
            publicId: string;
            name: string;
            balance: {amount: number; currency: {code: string}};
        }>;
    };
};

type BillingElementData = {
    description: string;
    amount: number;
    currency: string;
    date: string;
    category: {name: string};
};

type BillingPeriodData = {
    billingPeriod: {
        billingPeriod?: {
            period: string;
            incomes: BillingElementData[];
            expenses: BillingElementData[];
            monthSummary?: unknown | null;
        } | null;
        creationBlockers: {
            alreadyExists: boolean;
            notForCurrentMonth: boolean;
            unfinishedBillingPeriods: boolean;
        };
    };
};

async function openAccountsPage(page: Page, domainPublicId: string): Promise<FinanceManagementData> {
    const financeManagementPromise = waitForGraphQlData<FinanceManagementData>(page, 'GetFinanceManagement');
    await page.goto(`/ACCOUNTANT/${domainPublicId}/accounts`);
    await expect(page.getByRole('heading', {name: 'Konta', exact: true})).toBeVisible();
    return financeManagementPromise;
}

async function visibleAccounts(
    page: Page,
    financeManagement: FinanceManagementData
): Promise<VisibleAccountSnapshot[]> {
    const accountButtons = page.locator('button[aria-haspopup="dialog"]');
    await expect(accountButtons.first()).toBeVisible();

    return Promise.all(
        Array.from({length: await accountButtons.count()}, async (_, index) => {
            const textParts = (await accountButtons.nth(index).locator('p').allInnerTexts()).map(text => text.trim());
            expect(textParts, 'Przycisk konta powinien zawierać nazwę i saldo').toHaveLength(2);
            const account = financeManagement.financeManagement.accounts.find(
                candidate => candidate.name === textParts[0]
            );
            expect(account, `Nie znaleziono danych widocznego konta ${textParts[0]}`).toBeDefined();
            return {
                publicId: account!.publicId,
                name: account!.name,
                balance: account!.currentBalance.amount,
                currency: account!.currentBalance.currency.code,
            };
        })
    );
}

function piggyBankRow(page: Page, piggyBankName: string): Locator {
    return page
        .getByText(piggyBankName, {exact: true})
        .locator('xpath=ancestor::div[descendant::button[contains(@aria-label, "skarbonki")]][1]');
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

type BillingElementOptions = {
    categoryName?: string;
    piggyBankName?: string;
};

function amountsByCurrency(elements: BillingElementData[]): Map<string, number> {
    return elements.reduce((amounts, element) => {
        amounts.set(element.currency, (amounts.get(element.currency) ?? 0) + Number(element.amount));
        return amounts;
    }, new Map<string, number>());
}

function addExpectedAmount(amounts: Map<string, number>, currency: string, amount: string): void {
    amounts.set(currency, (amounts.get(currency) ?? 0) + Number(amount));
}

function billingSummary(section: Locator): Locator {
    return section.getByText('Łącznie', {exact: true}).locator('xpath=parent::*');
}

function billingElementRow(dialog: Locator, description: string): Locator {
    return dialog
        .getByText(description, {exact: true})
        .locator('xpath=ancestor::*[contains(@class, "MuiPaper-root")][1]');
}

async function chooseFirstDayOfDisplayedMonth(page: Page, dialog: Locator): Promise<string> {
    const expectedDate = await page.evaluate(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    });
    await dialog.getByRole('button', {name: /^Wybierz datę/}).click();
    const calendar = page.locator('[role="grid"]').last();
    await expect(calendar).toBeVisible();
    await calendar.getByRole('gridcell', {name: '1', exact: true}).click();
    return expectedDate;
}

async function verifyBillingElementValidationAndCancellation(page: Page, kind: BillingElementKind): Promise<void> {
    const isIncome = kind === 'income';
    const operationName = isIncome ? 'CreateIncome' : 'CreateExpense';
    const observedMutations: string[] = [];
    const observeMutation = (request: Request) => {
        if (!request.url().endsWith('/graphql') || request.method() !== 'POST') {
            return;
        }
        try {
            const observedOperationName = (request.postDataJSON() as {operationName?: string}).operationName;
            if (observedOperationName === operationName) {
                observedMutations.push(observedOperationName);
            }
        } catch {
            // Niepoprawne ciało żądania nie jest badaną mutacją GraphQL.
        }
    };
    page.on('request', observeMutation);

    try {
        await page.getByRole('button', {name: isIncome ? 'Dodaj dochód' : 'Dodaj wydatek', exact: true}).click();
        const dialog = page.getByRole('dialog', {name: isIncome ? 'Stwórz dochód' : 'Stwórz wydatek'});
        await chooseFirstOption(page, dialog.getByRole('combobox', {name: 'Kategoria'}));
        await dialog.getByRole('textbox', {name: 'Opis'}).fill(`E2E walidacja ${kind} ${RUN_ID}`);
        await dialog.getByRole('button', {name: 'Zapisz', exact: true}).click();
        await expect(dialog.getByText('Wymagana', {exact: true})).toHaveCount(1);
        await chooseFirstOption(page, dialog.getByRole('combobox', {name: isIncome ? 'Na konto' : 'Z konta'}));
        await dialog.getByRole('textbox', {name: 'Opis'}).clear();
        await dialog.getByRole('button', {name: 'Zapisz', exact: true}).click();
        await expect(dialog.getByText('Wymagana', {exact: true})).toHaveCount(1);
        await dialog.getByRole('button', {name: 'Anuluj', exact: true}).click();
        await expect(dialog).toBeHidden();
        expect(observedMutations, 'Walidacja i anulowanie nie powinny wysyłać mutacji').toHaveLength(0);
    } finally {
        page.off('request', observeMutation);
    }
}

async function createBillingElement(
    page: Page,
    kind: BillingElementKind,
    accountName: string,
    amount: string,
    description: string,
    options: BillingElementOptions = {}
): Promise<{categoryName: string; currency: string; variables: Record<string, unknown>}> {
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
    const selectedCategoryName = options.categoryName
        ? await chooseMatchingOption(page, categoryCombobox, new RegExp(`^${escapeRegExp(options.categoryName)}$`))
        : await chooseFirstOption(page, categoryCombobox);
    const selectedDate = await chooseFirstDayOfDisplayedMonth(page, dialog);
    if (options.piggyBankName) {
        await chooseMatchingOption(
            page,
            dialog.getByRole('combobox', {
                name: `Skarbonka do ${isIncome ? 'uznania' : 'obciążenia'}`,
            }),
            new RegExp(`^${escapeRegExp(options.piggyBankName)}$`)
        );
    }
    await dialog.getByRole('textbox', {name: 'Opis'}).fill(description);
    const refetchPromise = Promise.all([
        waitForGraphQlData(page, 'BillingPeriodQuery'),
        waitForGraphQlData(page, 'GetFinanceManagement'),
    ]);
    const [mutation] = await Promise.all([
        performGraphQlOperation(page, isIncome ? 'CreateIncome' : 'CreateExpense', () =>
            dialog.getByRole('button', {name: 'Zapisz'}).click()
        ),
        refetchPromise,
    ]);
    await expect(dialog).toBeHidden();

    expect(mutation.variables.date).toBe(selectedDate);
    return {
        categoryName: selectedCategoryName,
        currency: accountOptionMatch![1],
        variables: mutation.variables,
    };
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
        const currentMonth = await page.evaluate(() => {
            const now = new Date();
            return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        });
        const creation = await performGraphQlOperation(page, 'CreateBillingPeriod', () => createButton.click());
        expect(creation.variables.yearMonth).toBe(currentMonth);
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

test.describe.serial('okresy rozliczeniowe', () => {
    test('zapisuje dochody i wydatki oraz importuje transakcję, jeżeli jest dostępna', async ({page}, testInfo) => {
        const domainPublicId = await login(page);
        if (!(await ensureActiveBillingPeriod(page, domainPublicId, testInfo))) {
            return;
        }

        const initialPeriodPromise = waitForGraphQlData<BillingPeriodData>(page, 'BillingPeriodQuery');
        await page.reload();
        const initialPeriodData = await initialPeriodPromise;
        const initialPeriod = initialPeriodData.billingPeriod.billingPeriod;
        expect(initialPeriod, 'Test wymaga aktywnego okresu rozliczeniowego').toBeDefined();

        const incomeDescriptions = [`E2E dochód A ${RUN_ID}`, `E2E dochód B ${RUN_ID}`];
        const expenseDescriptions = [`E2E wydatek A ${RUN_ID}`, `E2E wydatek B ${RUN_ID}`];
        const incomeAmounts = ['2.22', '1.11'];
        const expenseAmounts = ['1.23', '2.34'];
        const incomeSection = billingElementsSection(page, 'Dochody');
        const expenseSection = billingElementsSection(page, 'Wydatki');
        const initialIncomeCount = await billingElementsCount(incomeSection);
        const initialExpenseCount = await billingElementsCount(expenseSection);
        expect(initialIncomeCount).toBe(initialPeriod!.incomes.length);
        expect(initialExpenseCount).toBe(initialPeriod!.expenses.length);

        await verifyBillingElementValidationAndCancellation(page, 'income');
        await verifyBillingElementValidationAndCancellation(page, 'expense');
        await expect(incomeSection.getByText(`Liczba pozycji: ${initialIncomeCount}`, {exact: true})).toBeVisible();
        await expect(expenseSection.getByText(`Liczba pozycji: ${initialExpenseCount}`, {exact: true})).toBeVisible();

        const initialFinanceManagement = await openAccountsPage(page, domainPublicId);
        const accounts = await visibleAccounts(page, initialFinanceManagement);
        const piggyBank = initialFinanceManagement.financeManagement.piggyBanks.find(candidate =>
            accounts.some(account => account.currency === candidate.balance.currency.code)
        );
        expect(piggyBank, 'Test wymaga skarbonki w walucie co najmniej jednego widocznego konta').toBeDefined();
        const accountsInPiggyBankCurrency = accounts.filter(
            account => account.currency === piggyBank!.balance.currency.code
        );
        expect(accountsInPiggyBankCurrency, 'Test wymaga widocznego konta w walucie skarbonki').not.toHaveLength(0);
        const incomeAccount = accountsInPiggyBankCurrency[0];
        const expenseAccount = accountsInPiggyBankCurrency[1] ?? incomeAccount;

        await openAccountantPage(page, domainPublicId);

        const firstIncome = await createBillingElement(
            page,
            'income',
            incomeAccount.name,
            incomeAmounts[0],
            incomeDescriptions[0],
            {piggyBankName: piggyBank!.name}
        );
        const secondIncome = await createBillingElement(
            page,
            'income',
            incomeAccount.name,
            incomeAmounts[1],
            incomeDescriptions[1],
            {categoryName: firstIncome.categoryName}
        );
        expect(secondIncome.currency).toBe(firstIncome.currency);

        const firstExpense = await createBillingElement(
            page,
            'expense',
            expenseAccount.name,
            expenseAmounts[0],
            expenseDescriptions[0],
            {piggyBankName: piggyBank!.name}
        );
        const secondExpense = await createBillingElement(
            page,
            'expense',
            expenseAccount.name,
            expenseAmounts[1],
            expenseDescriptions[1],
            {categoryName: firstExpense.categoryName}
        );
        expect(secondExpense.currency).toBe(firstExpense.currency);

        expect(firstIncome.variables).toMatchObject({
            accountPublicId: incomeAccount.publicId,
            piggyBankPublicId: piggyBank!.publicId,
            bankTransactionPublicIds: [],
        });
        expect(secondIncome.variables).toMatchObject({
            accountPublicId: incomeAccount.publicId,
            piggyBankPublicId: null,
            bankTransactionPublicIds: [],
        });
        expect(firstExpense.variables).toMatchObject({
            accountPublicId: expenseAccount.publicId,
            piggyBankPublicId: piggyBank!.publicId,
            bankTransactionPublicIds: [],
        });
        expect(secondExpense.variables).toMatchObject({
            accountPublicId: expenseAccount.publicId,
            piggyBankPublicId: null,
            bankTransactionPublicIds: [],
        });
        expect(Number(firstIncome.variables.amount)).toBeCloseTo(Number(incomeAmounts[0]), 8);
        expect(Number(secondIncome.variables.amount)).toBeCloseTo(Number(incomeAmounts[1]), 8);
        expect(Number(firstExpense.variables.amount)).toBeCloseTo(Number(expenseAmounts[0]), 8);
        expect(Number(secondExpense.variables.amount)).toBeCloseTo(Number(expenseAmounts[1]), 8);

        await expect(incomeSection.getByText(`Liczba pozycji: ${initialIncomeCount + 2}`, {exact: true})).toBeVisible();
        await expect(
            expenseSection.getByText(`Liczba pozycji: ${initialExpenseCount + 2}`, {exact: true})
        ).toBeVisible();

        const expectedIncomeSummary = amountsByCurrency(initialPeriod!.incomes);
        addExpectedAmount(expectedIncomeSummary, firstIncome.currency, incomeAmounts[0]);
        addExpectedAmount(expectedIncomeSummary, secondIncome.currency, incomeAmounts[1]);
        for (const [currency, amount] of expectedIncomeSummary) {
            await expect(billingSummary(incomeSection)).toContainText(
                await formatAccountBalance(page, amount, currency)
            );
        }

        const expectedExpenseSummary = amountsByCurrency(initialPeriod!.expenses);
        addExpectedAmount(expectedExpenseSummary, firstExpense.currency, expenseAmounts[0]);
        addExpectedAmount(expectedExpenseSummary, secondExpense.currency, expenseAmounts[1]);
        for (const [currency, amount] of expectedExpenseSummary) {
            await expect(billingSummary(expenseSection)).toContainText(
                await formatAccountBalance(page, amount, currency)
            );
        }

        const billingDate = String(firstIncome.variables.date);
        expect(secondIncome.variables.date).toBe(billingDate);
        expect(firstExpense.variables.date).toBe(billingDate);
        expect(secondExpense.variables.date).toBe(billingDate);
        const formattedBillingDate = await page.evaluate(date => {
            return new Intl.DateTimeFormat('pl-PL', {day: 'numeric', month: 'short', year: 'numeric'}).format(
                new Date(`${date}T12:00:00`)
            );
        }, billingDate);

        await incomeSection
            .getByRole('button', {name: new RegExp(`^${escapeRegExp(firstIncome.categoryName)}(?:\\s|$)`)})
            .click();
        const incomeCategoryDialog = page.getByRole('dialog', {
            name: `Dochody w kategorii: ${firstIncome.categoryName}`,
        });
        for (const [description, amount] of incomeDescriptions.map((description, index) => [
            description,
            incomeAmounts[index],
        ])) {
            const row = billingElementRow(incomeCategoryDialog, description);
            await expect(row).toContainText(await formatAccountBalance(page, Number(amount), firstIncome.currency));
            await expect(row).toContainText(formattedBillingDate);
        }
        const expectedIncomeCategorySummary = amountsByCurrency(
            initialPeriod!.incomes.filter(element => element.category.name === firstIncome.categoryName)
        );
        addExpectedAmount(expectedIncomeCategorySummary, firstIncome.currency, incomeAmounts[0]);
        addExpectedAmount(expectedIncomeCategorySummary, secondIncome.currency, incomeAmounts[1]);
        for (const [currency, amount] of expectedIncomeCategorySummary) {
            await expect(billingSummary(incomeCategoryDialog)).toContainText(
                await formatAccountBalance(page, amount, currency)
            );
        }
        await incomeCategoryDialog.getByRole('button', {name: 'Zamknij'}).click();
        await expect(incomeCategoryDialog).toBeHidden();

        await expenseSection
            .getByRole('button', {name: new RegExp(`^${escapeRegExp(firstExpense.categoryName)}(?:\\s|$)`)})
            .click();
        const expenseCategoryDialog = page.getByRole('dialog', {
            name: `Wydatki w kategorii: ${firstExpense.categoryName}`,
        });
        for (const [description, amount] of expenseDescriptions.map((description, index) => [
            description,
            expenseAmounts[index],
        ])) {
            const row = billingElementRow(expenseCategoryDialog, description);
            await expect(row).toContainText(await formatAccountBalance(page, Number(amount), firstExpense.currency));
            await expect(row).toContainText(formattedBillingDate);
        }
        const expectedExpenseCategorySummary = amountsByCurrency(
            initialPeriod!.expenses.filter(element => element.category.name === firstExpense.categoryName)
        );
        addExpectedAmount(expectedExpenseCategorySummary, firstExpense.currency, expenseAmounts[0]);
        addExpectedAmount(expectedExpenseCategorySummary, secondExpense.currency, expenseAmounts[1]);
        for (const [currency, amount] of expectedExpenseCategorySummary) {
            await expect(billingSummary(expenseCategoryDialog)).toContainText(
                await formatAccountBalance(page, amount, currency)
            );
        }
        await expenseCategoryDialog.getByRole('button', {name: 'Zamknij'}).click();
        await expect(expenseCategoryDialog).toBeHidden();

        const expectedAccountBalances = new Map<string, number>(
            accounts.map(account => [account.publicId, account.balance])
        );
        expectedAccountBalances.set(
            incomeAccount.publicId,
            expectedAccountBalances.get(incomeAccount.publicId)! +
                incomeAmounts.reduce((sum, amount) => sum + Number(amount), 0)
        );
        expectedAccountBalances.set(
            expenseAccount.publicId,
            expectedAccountBalances.get(expenseAccount.publicId)! -
                expenseAmounts.reduce((sum, amount) => sum + Number(amount), 0)
        );
        const expectedPiggyBankBalance =
            piggyBank!.balance.amount + Number(incomeAmounts[0]) - Number(expenseAmounts[0]);

        const finalFinanceManagement = await openAccountsPage(page, domainPublicId);
        const accountButtons = page.locator('button[aria-haspopup="dialog"]');
        for (const account of new Map([
            [incomeAccount.publicId, incomeAccount],
            [expenseAccount.publicId, expenseAccount],
        ]).values()) {
            const expectedBalance = expectedAccountBalances.get(account.publicId)!;
            expect(
                finalFinanceManagement.financeManagement.accounts.find(
                    candidate => candidate.publicId === account.publicId
                )!.currentBalance.amount
            ).toBeCloseTo(expectedBalance, 8);
            await expect(accountButtons.filter({has: page.getByText(account.name, {exact: true})})).toContainText(
                await formatAccountBalance(page, expectedBalance, account.currency)
            );
        }
        expect(
            finalFinanceManagement.financeManagement.piggyBanks.find(
                candidate => candidate.publicId === piggyBank!.publicId
            )!.balance.amount
        ).toBeCloseTo(expectedPiggyBankBalance, 8);
        await expect(piggyBankRow(page, piggyBank!.name)).toContainText(
            await formatAccountBalance(page, expectedPiggyBankBalance, piggyBank!.balance.currency.code)
        );

        await openAccountantPage(page, domainPublicId);

        const importButton = page.getByRole('button', {
            name: /^\d+ transakcj[aei] do zaimportowania$/,
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

    test('anuluje zakończenie bieżącego okresu rozliczeniowego', async ({page}, testInfo) => {
        const domainPublicId = await login(page);
        if (!(await ensureActiveBillingPeriod(page, domainPublicId, testInfo))) {
            return;
        }

        const finishButton = page.getByRole('button', {name: 'Zakończ okres', exact: true});
        await finishButton.click();
        const confirmation = page.getByRole('dialog', {name: 'Zakończ okres rozliczeniowy?'});
        await confirmation.getByRole('button', {name: 'Anuluj', exact: true}).click();

        await expect(confirmation).toBeHidden();
        await expect(page.getByText('Okres aktywny', {exact: true})).toBeVisible();
        await expect(finishButton).toBeVisible();
        await expect(page.getByRole('button', {name: 'Dodaj dochód', exact: true})).toBeVisible();
        await expect(page.getByRole('button', {name: 'Dodaj wydatek', exact: true})).toBeVisible();
    });

    test('kończy bieżący okres i próbuje utworzyć okres dla następnego miesiąca', async ({page}, testInfo) => {
        const domainPublicId = await login(page);
        const activePeriod = await ensureActiveBillingPeriod(page, domainPublicId, testInfo);
        if (activePeriod) {
            const finishButton = page.getByRole('button', {name: 'Zakończ okres', exact: true});
            await finishButton.click();
            const confirmation = page.getByRole('dialog', {name: 'Zakończ okres rozliczeniowy?'});
            await performGraphQlOperation(page, 'FinishBillingPeriod', () =>
                confirmation.getByRole('button', {name: 'Zakończ okres'}).click()
            );
        }

        await expect(page.getByText('Okres zakończony', {exact: true})).toBeVisible();
        await expect(page.getByRole('heading', {name: 'Dochody', exact: true})).toBeVisible();
        await expect(page.getByRole('heading', {name: 'Wydatki', exact: true})).toBeVisible();
        await expect(page.getByRole('button', {name: 'Dodaj dochód', exact: true})).toHaveCount(0);
        await expect(page.getByRole('button', {name: 'Dodaj wydatek', exact: true})).toHaveCount(0);
        await expect(page.getByRole('button', {name: 'Zakończ okres', exact: true})).toHaveCount(0);
        await expect(page.getByRole('button', {name: /^\d+ transakcj[aei] do zaimportowania$/})).toHaveCount(0);

        const nextMonth = await page.evaluate(() => {
            const date = new Date();
            date.setDate(1);
            date.setMonth(date.getMonth() + 1);
            return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        });
        const nextMonthDataPromise = waitForGraphQlData<BillingPeriodData>(page, 'BillingPeriodQuery');
        await page.getByRole('button', {name: 'Następny miesiąc', exact: true}).click();
        const nextMonthData = await nextMonthDataPromise;

        const createButton = page.getByRole('button', {name: 'Utwórz okres', exact: true});
        const blockerAlert = page.getByRole('alert');
        const existingPeriodStatus = page
            .getByText('Okres aktywny', {exact: true})
            .or(page.getByText('Okres zakończony', {exact: true}));
        await expect(createButton.or(blockerAlert).or(existingPeriodStatus)).toBeVisible();

        if (await createButton.isVisible()) {
            const creation = await performGraphQlOperation(page, 'CreateBillingPeriod', () => createButton.click());
            expect(creation.variables.yearMonth).toBe(nextMonth);
            await expect(page.getByText('Okres aktywny', {exact: true})).toBeVisible();
            await expect(page.getByRole('button', {name: 'Dodaj dochód', exact: true})).toBeVisible();
            await expect(page.getByRole('button', {name: 'Dodaj wydatek', exact: true})).toBeVisible();
        } else if (nextMonthData.billingPeriod.billingPeriod) {
            await expect(existingPeriodStatus).toBeVisible();
            recordConditionalStep(testInfo, `Okres ${nextMonth} już istnieje, więc nie można utworzyć go ponownie.`);
        } else {
            expect(nextMonthData.billingPeriod.billingPeriod).toBeNull();
            const blockers = nextMonthData.billingPeriod.creationBlockers;
            expect(
                blockers.alreadyExists || blockers.notForCurrentMonth || blockers.unfinishedBillingPeriods,
                'Backend powinien podać przyczynę braku możliwości utworzenia następnego okresu'
            ).toBeTruthy();
            if (blockers.alreadyExists) {
                await expect(blockerAlert).toContainText('Okres rozliczeniowy dla tego miesiąca już istnieje.');
            }
            if (blockers.notForCurrentMonth) {
                await expect(blockerAlert).toContainText('Okres można utworzyć wyłącznie dla bieżącego miesiąca.');
            }
            if (blockers.unfinishedBillingPeriods) {
                await expect(blockerAlert).toContainText('Poprzedni okres rozliczeniowy nie został zakończony.');
            }
            recordConditionalStep(
                testInfo,
                `Nie można utworzyć okresu ${nextMonth}; interfejs poprawnie wyświetlił przyczynę blokady.`
            );
        }
    });
});
