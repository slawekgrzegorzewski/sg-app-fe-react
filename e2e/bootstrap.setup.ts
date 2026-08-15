/* eslint-disable testing-library/prefer-screen-queries, jest/valid-expect -- Playwright Page locators are intentional in E2E tests; expect messages are supported by Playwright. */
import {expect, test, type Locator, type Page} from '@playwright/test';
import path from 'node:path';
import {
    chooseMatchingOption,
    openAccountantPage,
    performGraphQlOperation,
    waitForGraphQlData,
} from './support/data-interactions';

const E2E_AUTH_STATE_PATH = path.resolve('test-results/e2e/.auth/user.json');

const ACCOUNT_NAMES = {
    plnA: 'E2E Konto PLN A',
    plnB: 'E2E Konto PLN B',
    eurC: 'E2E Konto EUR C',
} as const;

const RAW_TRANSACTION_DESCRIPTION_PREFIXES = {
    income: 'E2E własny import — dochód',
    transferPln: 'E2E własny import — transfer PLN',
    transferFx: 'E2E własny import — transfer PLN EUR',
} as const;

const LOGIN = process.env.E2E_LOGIN ?? 'e2e.playwright';
const PASSWORD = process.env.E2E_PASSWORD ?? 'e2e';
const OTP = process.env.E2E_OTP ?? 'e2e';
const DOMAIN_PUBLIC_ID = process.env.E2E_DOMAIN_PUBLIC_ID ?? 'e7c51293-86fe-47bc-94a8-98769790bcdb';

type BankAccount = {
    publicId: string;
    iban: string;
};

type BankTransactionToImport = {
    description: string;
    creditBankAccountPublicId?: string | null;
    debitBankAccountPublicId?: string | null;
};

type BankTransactionsToImportData = {
    bankTransactionsToImport: BankTransactionToImport[];
};

type SettingsData = {
    bankPermissions: {
        bankAccountsNotAssignedToAccount: BankAccount[];
    };
};

type CreatedAccount = {
    publicId: string;
    name: string;
};

async function loginFixtureUser(page: Page): Promise<string> {
    await page.goto('/login');
    await page.getByRole('textbox', {name: 'Login'}).fill(LOGIN);
    await page.getByLabel('Hasło').fill(PASSWORD);
    await page.getByRole('textbox', {name: 'OTP'}).fill(OTP);
    const loginResult = await performGraphQlOperation<{
        login: {jwt: string; user: {login: string; name: string; domainPublicId: string; roles: string[]}};
    }>(page, 'PerformLogin', () => page.getByRole('button', {name: /^Zaloguj się$/i}).click());

    const authenticatedUser = loginResult.responseBody.data?.login;
    expect(authenticatedUser?.jwt).toBeTruthy();
    expect(authenticatedUser?.user.login).toBe(LOGIN);
    expect(authenticatedUser?.user.name).toBe('E2E PLAYWRIGHT');
    expect(authenticatedUser?.user.roles, 'Fixture powinien nadać użytkownikowi pełny zestaw ról').toEqual(
        expect.arrayContaining(['ACCOUNTANT_ADMIN', 'ACCOUNTANT_USER', 'IPR', 'PJM'])
    );
    expect(authenticatedUser?.user.domainPublicId).toBe(DOMAIN_PUBLIC_ID);
    await page.waitForURL(url => /^\/[A-Z_]+\/[^/]+/.test(url.pathname));
    return DOMAIN_PUBLIC_ID;
}

async function createBillingPeriod(page: Page, domainPublicId: string): Promise<void> {
    await openAccountantPage(page, domainPublicId);
    await expect(page.getByRole('button', {name: 'Utwórz okres', exact: true})).toBeVisible();

    const currentMonth = await page.evaluate(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    });
    const creation = await performGraphQlOperation(page, 'CreateBillingPeriod', () =>
        page.getByRole('button', {name: 'Utwórz okres', exact: true}).click()
    );

    expect(creation.variables.yearMonth).toBe(currentMonth);
    await expect(page.getByText('Okres aktywny', {exact: true})).toBeVisible();
}

async function readRawTransactions(page: Page, domainPublicId: string): Promise<BankTransactionToImport[]> {
    const transactionsPromise = waitForGraphQlData<BankTransactionsToImportData>(page, 'BankTransactionsToImport');
    await page.goto(`/ACCOUNTANT/${domainPublicId}`);
    await expect(page.getByText('Okres aktywny', {exact: true})).toBeVisible();

    const importButton = page.getByRole('button', {name: '10 transakcji do zaimportowania', exact: true});
    await expect(importButton).toBeVisible();
    await importButton.click();
    await expect(page.getByRole('dialog', {name: /Import transakcji/})).toBeVisible();

    const transactions = (await transactionsPromise).bankTransactionsToImport;
    expect(transactions, 'Bootstrap wymaga dziesięciu surowych operacji bankowych opisanych w fixture').toHaveLength(
        10
    );
    return transactions;
}

function sourceBankAccountIds(transactions: BankTransactionToImport[]): Record<keyof typeof ACCOUNT_NAMES, string> {
    const creditedBankAccountIdByDescription = (description: string) => {
        // Backend formatuje opis z importu jako "opis: kontrahent". W fixture
        // kontrahent jest pusty, zatem odpowiedź kończy się na ": "; nie jest to
        // część opisu surowej operacji. Transfer może być zwrócony jako osobne
        // pozycje obciążeniowa i uznaniowa, dlatego wybieramy stronę uznaniową.
        const transaction = transactions.find(
            candidate =>
                candidate.description.startsWith(`${description}:`) && Boolean(candidate.creditBankAccountPublicId)
        );
        expect(
            transaction,
            `Brak uznaniowej surowej operacji „${description}”. Odebrane operacje: ${transactions
                .map(candidate => `„${candidate.description}”`)
                .join(', ')}`
        ).toBeDefined();
        return transaction!.creditBankAccountPublicId!;
    };

    const plnA = creditedBankAccountIdByDescription(RAW_TRANSACTION_DESCRIPTION_PREFIXES.income);
    const plnB = creditedBankAccountIdByDescription(RAW_TRANSACTION_DESCRIPTION_PREFIXES.transferPln);
    const eurC = creditedBankAccountIdByDescription(RAW_TRANSACTION_DESCRIPTION_PREFIXES.transferFx);
    expect(new Set([plnA, plnB, eurC]).size, 'Fixture powinien zawierać trzy różne rachunki źródłowe').toBe(3);
    return {plnA, plnB, eurC};
}

function managementRow(page: Page, entityName: string): Locator {
    return page
        .getByText(entityName, {exact: true})
        .locator('xpath=ancestor::div[descendant::button[contains(@aria-label, "Edytuj element")]][1]');
}

async function createAccount(page: Page, name: string, currency: string): Promise<CreatedAccount> {
    await page.getByRole('button', {name: 'Dodaj konto', exact: true}).click();
    const dialog = page.getByRole('dialog', {name: 'Dodaj konto', exact: true});
    await dialog.getByRole('textbox', {name: 'Nazwa'}).fill(name);
    await dialog.getByRole('checkbox', {name: 'Widoczne'}).check();
    await chooseMatchingOption(page, dialog.getByRole('combobox', {name: 'Waluta'}), new RegExp(`^${currency}$`));
    await dialog.getByRole('spinbutton', {name: 'Limit kredytowy'}).fill('10000');

    const creation = await performGraphQlOperation<{createAccount: CreatedAccount}>(page, 'CreateAccount', () =>
        dialog.getByRole('button', {name: 'Dodaj konto', exact: true}).click()
    );
    const account = creation.responseBody.data?.createAccount;
    expect(account).toMatchObject({name});
    await expect(dialog).toBeHidden();
    await expect(page.getByText(name, {exact: true})).toBeVisible();
    return account!;
}

async function assignBankAccount(page: Page, account: CreatedAccount, bankAccount: BankAccount): Promise<void> {
    const row = managementRow(page, account.name);
    await row.getByRole('button', {name: 'Przypisz konto', exact: true}).click();
    const picker = page.getByRole('dialog', {name: 'Wybierz konto bankowe'});
    const assignment = await performGraphQlOperation<{assignBankAccountToAccount: string}>(
        page,
        'AssignBankAccountToAccount',
        () => picker.getByRole('button', {name: bankAccount.iban, exact: true}).click()
    );
    expect(assignment.variables).toEqual({
        accountPublicId: account.publicId,
        bankAccountPublicId: bankAccount.publicId,
    });
    expect(assignment.responseBody.data?.assignBankAccountToAccount).toBeTruthy();
    await expect(row.getByText(`Powiązane z kontem bankowym: ${bankAccount.iban}`, {exact: true})).toBeVisible();
}

async function disconnectBankAccount(page: Page, account: CreatedAccount): Promise<void> {
    const row = managementRow(page, account.name);
    await row.getByRole('button', {name: `Odłącz konto bankowe od ${account.name}`, exact: true}).click();
    const confirmation = page.getByRole('dialog', {name: 'Odłączyć konto bankowe?'});
    await expect(confirmation).toContainText(account.name);
    const disconnection = await performGraphQlOperation<{deleteBankAccountAssignment: string}>(
        page,
        'DeleteBankAccountAssignment',
        () => confirmation.getByRole('button', {name: 'Odłącz', exact: true}).click()
    );
    expect(disconnection.responseBody.data?.deleteBankAccountAssignment).toBeTruthy();
    await expect(row.getByText(/^Powiązane z kontem bankowym:/)).toHaveCount(0);
}

async function createCategory(page: Page, name: string): Promise<void> {
    const panel = page.getByRole('tabpanel', {name: 'Wydatki'});
    await panel.getByRole('button', {name: 'Dodaj kategorię', exact: true}).click();
    const dialog = page.getByRole('dialog', {name: 'Dodaj kategorię', exact: true});
    await dialog.getByRole('textbox', {name: 'Nazwa'}).fill(name);
    await dialog.getByRole('textbox', {name: 'Opis'}).fill('Dane bazowe pełnego zestawu E2E');
    const creation = await performGraphQlOperation<{createBillingCategory: {name: string}}>(
        page,
        'CreateBillingCategory',
        () => dialog.getByRole('button', {name: 'Dodaj kategorię', exact: true}).click()
    );
    expect(creation.responseBody.data?.createBillingCategory.name).toBe(name);
    await expect(dialog).toBeHidden();
    await expect(page.getByText(name, {exact: true})).toBeVisible();
}

async function createAndFundPiggyBank(page: Page): Promise<void> {
    const name = 'E2E Skarbonka PLN';
    const panel = page.getByRole('tabpanel', {name: 'Wydatki'});
    await panel.getByRole('button', {name: 'Dodaj skarbonkę', exact: true}).click();
    const dialog = page.getByRole('dialog', {name: 'Dodaj skarbonkę', exact: true});
    await dialog.getByRole('textbox', {name: 'Nazwa'}).fill(name);
    await dialog.getByRole('textbox', {name: 'Opis'}).fill('Skarbonka bazowa pełnego zestawu E2E');
    await chooseMatchingOption(page, dialog.getByRole('combobox', {name: 'Waluta'}), /^PLN$/);
    await dialog.getByRole('spinbutton', {name: 'Comiesięczne odkładanie'}).fill('0');
    const creation = await performGraphQlOperation<{createPiggyBank: {name: string}}>(page, 'CreatePiggyBank', () =>
        dialog.getByRole('button', {name: 'Dodaj skarbonkę', exact: true}).click()
    );
    expect(creation.responseBody.data?.createPiggyBank.name).toBe(name);
    await expect(dialog).toBeHidden();

    await page.getByRole('button', {name: `Dodaj środki do skarbonki ${name}`, exact: true}).click();
    const balanceDialog = page.getByRole('dialog', {name: `Dodaj środki: ${name}`, exact: true});
    await balanceDialog.getByRole('spinbutton', {name: 'Kwota'}).fill('1000');
    const update = await performGraphQlOperation<{updatePiggyBank: {balance: {amount: number}}}>(
        page,
        'UpdatePiggyBank',
        () => balanceDialog.getByRole('button', {name: 'Dodaj środki', exact: true}).click()
    );
    expect(Number(update.responseBody.data?.updatePiggyBank.balance.amount)).toBeCloseTo(1000, 8);
    await expect(balanceDialog).toBeHidden();
}

test('loguje fixture i przygotowuje minimalne dane E2E', async ({page}) => {
    const domainPublicId = await loginFixtureUser(page);
    await createBillingPeriod(page, domainPublicId);

    const settingsPromise = waitForGraphQlData<SettingsData>(page, 'GetFinanceManagementWithNotAssignedBankAccounts');
    await page.goto(`/ACCOUNTANT/${domainPublicId}/settings`);
    await expect(page.getByRole('heading', {name: 'Ustawienia', exact: true})).toBeVisible();
    const settings = await settingsPromise;
    const unassignedBankAccounts = settings.bankPermissions.bankAccountsNotAssignedToAccount;
    expect(
        unassignedBankAccounts,
        'Fixture minimalnego zestawu danych powinna zawierać dokładnie trzy nieprzypisane rachunki źródłowe'
    ).toHaveLength(3);
    const bankAccountsById = new Map(unassignedBankAccounts.map(bankAccount => [bankAccount.publicId, bankAccount]));
    await page.getByRole('tab', {name: 'Konta', exact: true}).click();

    const accounts = {
        plnA: await createAccount(page, ACCOUNT_NAMES.plnA, 'PLN'),
        plnB: await createAccount(page, ACCOUNT_NAMES.plnB, 'PLN'),
        eurC: await createAccount(page, ACCOUNT_NAMES.eurC, 'EUR'),
    };

    // Importer udostępnia surowe operacje wyłącznie dla przypisanych rachunków.
    // Tymczasowe przypisanie wszystkich rachunków pozwala odczytać ich identyfikatory
    // z operacji fixture, a następnie ustanowić właściwe powiązania poniżej.
    const temporaryBankAccounts = [...unassignedBankAccounts].sort((left, right) =>
        left.iban.localeCompare(right.iban)
    );
    await assignBankAccount(page, accounts.plnA, temporaryBankAccounts[0]);
    await assignBankAccount(page, accounts.plnB, temporaryBankAccounts[1]);
    await assignBankAccount(page, accounts.eurC, temporaryBankAccounts[2]);

    const transactions = await readRawTransactions(page, domainPublicId);
    const bankAccountIds = sourceBankAccountIds(transactions);

    await page.goto(`/ACCOUNTANT/${domainPublicId}/settings`);
    await expect(page.getByRole('heading', {name: 'Ustawienia', exact: true})).toBeVisible();
    await page.getByRole('tab', {name: 'Konta', exact: true}).click();
    await disconnectBankAccount(page, accounts.plnA);
    await disconnectBankAccount(page, accounts.plnB);
    await disconnectBankAccount(page, accounts.eurC);

    for (const bankAccountId of Object.values(bankAccountIds)) {
        expect(
            bankAccountsById.has(bankAccountId),
            `Brak uprawnienia do rachunku źródłowego ${bankAccountId}`
        ).toBeTruthy();
    }

    await assignBankAccount(page, accounts.plnA, bankAccountsById.get(bankAccountIds.plnA)!);
    await assignBankAccount(page, accounts.plnB, bankAccountsById.get(bankAccountIds.plnB)!);
    await assignBankAccount(page, accounts.eurC, bankAccountsById.get(bankAccountIds.eurC)!);

    await page.getByRole('tab', {name: 'Wydatki', exact: true}).click();
    await createCategory(page, 'E2E Kategoria dochodu');
    await createCategory(page, 'E2E Kategoria wydatku');
    await createAndFundPiggyBank(page);

    await page.context().storageState({path: E2E_AUTH_STATE_PATH});
});
