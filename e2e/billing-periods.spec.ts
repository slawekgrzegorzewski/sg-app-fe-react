import {expect, type Locator, type Page, test, type TestInfo} from '@playwright/test';
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
    const refetchPromise = Promise.all([
        waitForGraphQlData(page, 'BillingPeriodQuery'),
        waitForGraphQlData(page, 'GetFinanceManagement'),
    ]);
    await Promise.all([
        performGraphQlOperation(page, isIncome ? 'CreateIncome' : 'CreateExpense', () =>
            dialog.getByRole('button', {name: 'Zapisz'}).click()
        ),
        refetchPromise,
    ]);
    await expect(dialog).toBeHidden();

    return {categoryName: selectedCategoryName, currency: accountOptionMatch![1]};
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

test.describe.serial('okresy rozliczeniowe', () => {
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
