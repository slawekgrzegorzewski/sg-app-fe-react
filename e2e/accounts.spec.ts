import {expect, test, type Locator, type Page, type Request} from '@playwright/test';

const RUN_ID = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
const LOGIN = process.env.E2E_LOGIN ?? 'slag';
const PASSWORD = process.env.E2E_PASSWORD ?? 'e2e';
const OTP = process.env.E2E_OTP ?? 'e2e';
const TRANSFER_AMOUNT = 0.37;
const FOREIGN_CURRENCY_SOURCE_AMOUNT = 0.41;
const FOREIGN_CURRENCY_DESTINATION_AMOUNT = 1.73;
const PIGGY_BANK_AMOUNT = 4.56;
const INITIAL_MONTHLY_TOP_UP = 3.21;
const UPDATED_MONTHLY_TOP_UP = 6.54;

type GraphQlRequestBody = {
    operationName?: string;
    variables?: Record<string, unknown>;
};

type GraphQlResponse<TData> = {
    data?: TData;
    errors?: Array<{message?: string}>;
};

type ObservedGraphQlOperation<TData> = {
    data: TData;
    variables: Record<string, unknown>;
};

type Currency = {
    code: string;
    description: string;
};

type Money = {
    amount: number;
    currency: Currency;
};

type BankAccount = {
    publicId: string;
    iban: string;
};

type Account = {
    publicId: string;
    order: number;
    name: string;
    visible: boolean;
    currentBalance: Money;
    creditLimit: Money;
    bankAccount?: BankAccount | null;
};

type PiggyBank = {
    publicId: string;
    name: string;
    description: string;
    balance: Money;
    monthlyTopUp: Money;
    savings: boolean;
};

type FinanceManagementData = {
    financeManagement: {
        accounts: Account[];
        piggyBanks: PiggyBank[];
        supportedCurrencies: Currency[];
    };
};

type FinanceManagementSettingsData = FinanceManagementData & {
    bankPermissions: {
        bankAccountsNotAssignedToAccount: BankAccount[];
    };
};

type AccountTransaction = {
    publicId: string;
    description: string;
    timeOfTransaction: string;
    debit?: Money | null;
    credit?: Money | null;
    source?: {publicId: string} | null;
    destination?: {publicId: string} | null;
};

type AccountTransactionsData = {
    financeManagement: {
        accounts: Array<{transactions: AccountTransaction[]}>;
    };
};

function graphQlOperationName(request: Request): string | undefined {
    if (!request.url().endsWith('/graphql') || request.method() !== 'POST') {
        return undefined;
    }

    try {
        return (request.postDataJSON() as GraphQlRequestBody).operationName;
    } catch {
        return undefined;
    }
}

async function waitForGraphQlOperation<TData>(
    page: Page,
    operationName: string
): Promise<ObservedGraphQlOperation<TData>> {
    const response = await page.waitForResponse(
        candidate => graphQlOperationName(candidate.request()) === operationName,
        {timeout: 20_000}
    );
    const requestBody = response.request().postDataJSON() as GraphQlRequestBody;
    const responseBody = (await response.json()) as GraphQlResponse<TData>;

    expect(requestBody.operationName).toBe(operationName);
    expect(response.ok(), `Operacja ${operationName} zwróciła HTTP ${response.status()}`).toBeTruthy();
    expect(
        responseBody.errors,
        `Operacja ${operationName} zwróciła błędy GraphQL dla zmiennych ${JSON.stringify(requestBody.variables ?? {})}`
    ).toBeUndefined();
    expect(responseBody.data, `Operacja ${operationName} nie zwróciła danych`).toBeDefined();

    return {
        data: responseBody.data!,
        variables: requestBody.variables ?? {},
    };
}

async function performGraphQlOperation<TData>(
    page: Page,
    operationName: string,
    action: () => Promise<unknown>
): Promise<ObservedGraphQlOperation<TData>> {
    const operationPromise = waitForGraphQlOperation<TData>(page, operationName);
    await action();
    return operationPromise;
}

async function performGraphQlOperationWithRefetch<TMutationData, TQueryData>(
    page: Page,
    mutationName: string,
    refetchQueryName: string,
    action: () => Promise<unknown>
): Promise<{
    mutation: ObservedGraphQlOperation<TMutationData>;
    refetch: ObservedGraphQlOperation<TQueryData>;
}> {
    const mutationPromise = waitForGraphQlOperation<TMutationData>(page, mutationName);
    const refetchPromise = waitForGraphQlOperation<TQueryData>(page, refetchQueryName);
    const operationsPromise = Promise.all([mutationPromise, refetchPromise]);
    await action();
    const [mutation, refetch] = await operationsPromise;
    return {mutation, refetch};
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

async function openAccountsPage(
    page: Page,
    domainPublicId: string
): Promise<ObservedGraphQlOperation<FinanceManagementData>> {
    const settingsPromise = waitForGraphQlOperation(page, 'GetAccountantSettings');
    const financeManagementPromise = waitForGraphQlOperation<FinanceManagementData>(page, 'GetFinanceManagement');

    await page.goto(`/ACCOUNTANT/${domainPublicId}/accounts`);
    await settingsPromise;
    const financeManagement = await financeManagementPromise;
    await expect(page.getByRole('heading', {name: 'Konta', exact: true})).toBeVisible();
    return financeManagement;
}

async function openSettingsPage(
    page: Page,
    domainPublicId: string
): Promise<ObservedGraphQlOperation<FinanceManagementSettingsData>> {
    const financeManagementPromise = waitForGraphQlOperation<FinanceManagementSettingsData>(
        page,
        'GetFinanceManagementWithNotAssignedBankAccounts'
    );

    await page.goto(`/ACCOUNTANT/${domainPublicId}/settings`);
    const financeManagement = await financeManagementPromise;
    await expect(page.getByRole('heading', {name: 'Ustawienia', exact: true})).toBeVisible();
    return financeManagement;
}

async function chooseOption(page: Page, combobox: Locator, optionName: string): Promise<void> {
    await combobox.click();
    const option = page.getByRole('listbox').getByRole('option', {name: optionName, exact: true});
    await expect(option).toBeVisible();
    await option.click();
}

function accountManagementRow(page: Page, accountName: string): Locator {
    return page
        .getByRole('tabpanel', {name: 'Konta'})
        .getByText(accountName, {exact: true})
        .locator('xpath=ancestor::*[@draggable="true"][1]');
}

function piggyBankManagementRow(page: Page, piggyBankName: string): Locator {
    return page
        .getByRole('tabpanel', {name: 'Wydatki'})
        .getByText(piggyBankName, {exact: true})
        .locator('xpath=ancestor::div[descendant::button[contains(@aria-label, "w sekcji Skarbonki")]][1]');
}

function accountButton(page: Page, accountName: string): Locator {
    return page.locator('button[aria-haspopup="dialog"]').filter({
        has: page.getByText(accountName, {exact: true}),
    });
}

function piggyBankRow(page: Page, piggyBankName: string): Locator {
    return page
        .getByText(piggyBankName, {exact: true})
        .locator('xpath=ancestor::div[descendant::button[contains(@aria-label, "skarbonki")]][1]');
}

async function dragRow(page: Page, source: Locator, target: Locator, direction: 'up' | 'down'): Promise<void> {
    await expect(source).toHaveAttribute('draggable', 'true');
    await expect(target).toHaveAttribute('data-drop-target-for-element', 'true');
    const targetElement = await target.elementHandle();
    expect(targetElement, 'Nie znaleziono docelowego wiersza konta').not.toBeNull();

    await source.evaluate(
        async (sourceElement, {targetElementHandle, direction}) => {
            if (!(sourceElement instanceof HTMLElement) || !(targetElementHandle instanceof HTMLElement)) {
                throw new Error('Źródło i cel przeciągania muszą być elementami HTML.');
            }

            const nextFrame = () => new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
            const dataTransfer = new DataTransfer();
            const sourceRect = sourceElement.getBoundingClientRect();
            const targetRect = targetElementHandle.getBoundingClientRect();
            const clientX = targetRect.left + targetRect.width / 2;
            const dispatchDragEvent = (element: HTMLElement, type: string, clientY: number) => {
                element.dispatchEvent(
                    new DragEvent(type, {
                        bubbles: true,
                        cancelable: true,
                        clientX,
                        clientY,
                        buttons: 1,
                        dataTransfer,
                    })
                );
            };

            dispatchDragEvent(sourceElement, 'dragstart', sourceRect.top + sourceRect.height / 2);
            await nextFrame();
            const entryY = direction === 'up' ? targetRect.bottom - 4 : targetRect.top + 4;
            const finalY = direction === 'up' ? targetRect.top + 4 : targetRect.bottom - 4;
            dispatchDragEvent(targetElementHandle, 'dragenter', entryY);
            dispatchDragEvent(targetElementHandle, 'dragover', entryY);
            await nextFrame();
            dispatchDragEvent(targetElementHandle, 'dragover', finalY);
            await nextFrame();
            dispatchDragEvent(targetElementHandle, 'drop', finalY);
            dispatchDragEvent(sourceElement, 'dragend', finalY);
        },
        {targetElementHandle: targetElement, direction}
    );
}

function expectNumericVariable(
    operation: ObservedGraphQlOperation<unknown>,
    variableName: string,
    expectedValue: number
): void {
    expect(Number(operation.variables[variableName]), `Zmienna ${variableName}`).toBeCloseTo(expectedValue, 8);
}

function shiftYearMonth(yearMonth: string, offset: number): string {
    const [year, month] = yearMonth.split('-').map(Number);
    const shifted = new Date(Date.UTC(year, month - 1 + offset, 1));
    return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, '0')}`;
}

async function currentYearMonth(page: Page): Promise<string> {
    return page.evaluate(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    });
}

async function formatMoney(page: Page, amount: number, currency: string): Promise<string> {
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

function twoVisibleAccountsInTheSameCurrency(accounts: Account[]): [Account, Account] {
    const accountsByCurrency = new Map<string, Account[]>();
    for (const account of accounts.filter(candidate => candidate.visible)) {
        const currency = account.currentBalance.currency.code;
        accountsByCurrency.set(currency, [...(accountsByCurrency.get(currency) ?? []), account]);
    }

    const matchingAccounts = [...accountsByCurrency.values()].find(candidate => candidate.length >= 2);
    expect(matchingAccounts, 'Do testu są wymagane dwa widoczne konta w tej samej walucie').toBeDefined();
    return [matchingAccounts![0], matchingAccounts![1]];
}

function twoVisibleAccountsInDifferentCurrencies(accounts: Account[]): [Account, Account] {
    const visibleAccounts = accounts.filter(candidate => candidate.visible);
    const sourceAccount = visibleAccounts.find(account =>
        visibleAccounts.some(
            candidate => candidate.currentBalance.currency.code !== account.currentBalance.currency.code
        )
    );
    const destinationAccount = visibleAccounts.find(
        account => account.currentBalance.currency.code !== sourceAccount?.currentBalance.currency.code
    );

    expect(sourceAccount, 'Do testu są wymagane dwa widoczne konta w różnych walutach').toBeDefined();
    expect(destinationAccount, 'Do testu są wymagane dwa widoczne konta w różnych walutach').toBeDefined();
    return [sourceAccount!, destinationAccount!];
}

async function reverseTransferAfterFailure(
    page: Page,
    domainPublicId: string,
    sourceAccount: Account,
    destinationAccount: Account,
    description: string,
    fromAmount = TRANSFER_AMOUNT,
    toAmount = TRANSFER_AMOUNT
): Promise<void> {
    await page.goto(`/ACCOUNTANT/${domainPublicId}/accounts`);
    await expect(page.getByRole('heading', {name: 'Konta', exact: true})).toBeVisible();
    await page.getByRole('button', {name: `Przelej z konta ${destinationAccount.name}`, exact: true}).click();
    const dialog = page.getByRole('dialog', {name: `Przelej z konta ${destinationAccount.name}`, exact: true});
    await chooseOption(
        page,
        dialog.getByRole('combobox', {name: 'Na konto'}),
        `${sourceAccount.name} (${sourceAccount.currentBalance.currency.code})`
    );
    const differentCurrencies =
        sourceAccount.currentBalance.currency.code !== destinationAccount.currentBalance.currency.code;
    await dialog
        .getByRole('spinbutton', {name: differentCurrencies ? 'Kwota z' : 'Kwota', exact: true})
        .fill(String(fromAmount));
    if (differentCurrencies) {
        await dialog.getByRole('spinbutton', {name: 'Kwota na', exact: true}).fill(String(toAmount));
    }
    await dialog.getByRole('textbox', {name: 'Opis'}).fill(`${description} — sprzątanie`);
    await performGraphQlOperation(page, 'CreateTransfer', () =>
        dialog.getByRole('button', {name: 'Zapisz', exact: true}).click()
    );
}

async function restoreBankAccountAfterFailure(
    page: Page,
    domainPublicId: string,
    originalAccountName: string,
    testAccountName: string,
    bankAccountIban: string,
    assignmentState: 'original' | 'unassigned' | 'test-account'
): Promise<void> {
    if (assignmentState === 'original') {
        return;
    }

    await page.goto(`/ACCOUNTANT/${domainPublicId}/settings`);
    await expect(page.getByRole('heading', {name: 'Ustawienia', exact: true})).toBeVisible();
    await page.getByRole('tab', {name: 'Konta', exact: true}).click();

    if (assignmentState === 'test-account') {
        const row = accountManagementRow(page, testAccountName);
        await row.getByRole('button', {name: `Odłącz konto bankowe od ${testAccountName}`, exact: true}).click();
        const confirmation = page.getByRole('dialog', {name: 'Odłączyć konto bankowe?'});
        await performGraphQlOperation(page, 'DeleteBankAccountAssignment', () =>
            confirmation.getByRole('button', {name: 'Odłącz', exact: true}).click()
        );
    }

    const originalRow = accountManagementRow(page, originalAccountName);
    await originalRow.getByRole('button', {name: 'Przypisz konto', exact: true}).click();
    const picker = page.getByRole('dialog', {name: 'Wybierz konto bankowe'});
    await performGraphQlOperation(page, 'AssignBankAccountToAccount', () =>
        picker.getByRole('button', {name: bankAccountIban, exact: true}).click()
    );
}

async function deleteTestEntitiesAfterFailure(
    page: Page,
    domainPublicId: string,
    accountName: string | undefined,
    piggyBankName: string | undefined
): Promise<void> {
    if (!accountName && !piggyBankName) {
        return;
    }

    await page.goto(`/ACCOUNTANT/${domainPublicId}/settings`);
    await expect(page.getByRole('heading', {name: 'Ustawienia', exact: true})).toBeVisible();

    if (accountName) {
        await page.getByRole('tab', {name: 'Konta', exact: true}).click();
        const accountNameElement = page.getByRole('tabpanel', {name: 'Konta'}).getByText(accountName, {exact: true});
        if ((await accountNameElement.count()) > 0) {
            const rows = page.getByRole('tabpanel', {name: 'Konta'}).locator('[draggable="true"]');
            const lastRow = rows.last();
            if ((await lastRow.getByText(accountName, {exact: true}).count()) === 0) {
                await performGraphQlOperationWithRefetch(
                    page,
                    'ReorderAccount',
                    'GetFinanceManagementWithNotAssignedBankAccounts',
                    () => dragRow(page, accountManagementRow(page, accountName), lastRow, 'down')
                );
            }

            await accountManagementRow(page, accountName)
                .getByRole('button', {name: /Usuń element .* z sekcji Konta/})
                .click();
            const confirmation = page.getByRole('dialog', {name: 'Usunąć konto?'});
            await performGraphQlOperation(page, 'DeleteAccount', () =>
                confirmation.getByRole('button', {name: 'Usuń', exact: true}).click()
            );
        }
    }

    if (piggyBankName) {
        await page.getByRole('tab', {name: 'Wydatki', exact: true}).click();
        const piggyBankNameElement = page
            .getByRole('tabpanel', {name: 'Wydatki'})
            .getByText(piggyBankName, {exact: true});
        if ((await piggyBankNameElement.count()) > 0) {
            const row = piggyBankManagementRow(page, piggyBankName);
            await row.getByRole('button', {name: /Usuń element .* z sekcji Skarbonki/}).click();
            const confirmation = page.getByRole('dialog', {name: 'Usunąć skarbonkę?'});
            await performGraphQlOperation(page, 'DeletePiggyBank', () =>
                confirmation.getByRole('button', {name: 'Usuń', exact: true}).click()
            );
        }
    }
}

test('obsługuje wszystkie interakcje sekcji kont z GraphQL API', async ({page}, testInfo) => {
    test.setTimeout(240_000);

    const createdAccountName = `E2E konto pełne ${RUN_ID}`;
    const updatedAccountName = `${createdAccountName} — zmienione`;
    const createdPiggyBankName = `E2E skarbonka ${RUN_ID}`;
    const piggyBankName = `${createdPiggyBankName} — zmieniona`;
    const piggyBankDescription = `Skarbonka testowa ${RUN_ID}`;
    const updatedPiggyBankDescription = `${piggyBankDescription} — zmieniona`;
    const transferDescription = `E2E przelew kont ${RUN_ID}`;
    let domainPublicId = '';
    let accountToDelete: string | undefined;
    let piggyBankToDelete: string | undefined;
    let transferToReverse: {source: Account; destination: Account} | undefined;
    let bankAccountToRestore:
        | {
              originalAccountName: string;
              iban: string;
              assignmentState: 'original' | 'unassigned' | 'test-account';
          }
        | undefined;

    try {
        domainPublicId = await login(page);

        const initialFinanceManagement =
            await test.step('pobiera stronę kont i przechodzi do zarządzania kontami', async () => {
                const financeManagement = await openAccountsPage(page, domainPublicId);
                const accounts = financeManagement.data.financeManagement.accounts;
                const hiddenAccountsCount = accounts.filter(account => !account.visible).length;

                await expect(page.getByText(`Liczba kont: ${accounts.length}`, {exact: true})).toBeVisible();
                const settingsQueryPromise = waitForGraphQlOperation<FinanceManagementSettingsData>(
                    page,
                    'GetFinanceManagementWithNotAssignedBankAccounts'
                );
                await page
                    .getByRole('button', {
                        name: `Ukrytych: ${hiddenAccountsCount}. Przejdź do Ustawienia, Konta`,
                        exact: true,
                    })
                    .click();
                const settingsQuery = await settingsQueryPromise;
                await expect(page).toHaveURL(new RegExp(`/ACCOUNTANT/${domainPublicId}/settings$`));
                await expect(page.getByRole('tab', {name: 'Konta', exact: true})).toHaveAttribute(
                    'aria-selected',
                    'true'
                );
                expect(settingsQuery.data.financeManagement.accounts).toHaveLength(accounts.length);
                return settingsQuery;
            });

        const settingsAccounts = initialFinanceManagement.data.financeManagement.accounts;
        const [sourceAccountFromSettings] = twoVisibleAccountsInTheSameCurrency(settingsAccounts);
        const testCurrency = sourceAccountFromSettings.currentBalance.currency.code;
        const originalBankOwner = settingsAccounts.find(account => account.bankAccount);
        expect(originalBankOwner, 'Do testu jest wymagane konto powiązane z kontem bankowym').toBeDefined();
        bankAccountToRestore = {
            originalAccountName: originalBankOwner!.name,
            iban: originalBankOwner!.bankAccount!.iban,
            assignmentState: 'original',
        };

        let createdAccountPublicId = '';
        await test.step('tworzy konto', async () => {
            await page.getByRole('button', {name: 'Dodaj konto', exact: true}).click();
            const dialog = page.getByRole('dialog', {name: 'Dodaj konto', exact: true});
            await dialog.getByRole('textbox', {name: 'Nazwa'}).fill(createdAccountName);
            await dialog.getByRole('checkbox', {name: 'Widoczne'}).check();
            await chooseOption(page, dialog.getByRole('combobox', {name: 'Waluta'}), testCurrency);
            await dialog.getByRole('spinbutton', {name: 'Limit kredytowy'}).fill('12.34');

            const {mutation, refetch} = await performGraphQlOperationWithRefetch<
                {createAccount: Account},
                FinanceManagementSettingsData
            >(page, 'CreateAccount', 'GetFinanceManagementWithNotAssignedBankAccounts', () =>
                dialog.getByRole('button', {name: 'Dodaj konto', exact: true}).click()
            );

            expect(mutation.variables).toMatchObject({
                name: createdAccountName,
                visible: true,
                creditLimitCurrency: testCurrency,
            });
            expectNumericVariable(mutation, 'creditLimitAmount', 12.34);
            expect(mutation.data.createAccount).toMatchObject({name: createdAccountName, visible: true});
            expect(mutation.data.createAccount.currentBalance.currency.code).toBe(testCurrency);
            createdAccountPublicId = mutation.data.createAccount.publicId;
            accountToDelete = createdAccountName;
            expect(
                refetch.data.financeManagement.accounts.some(account => account.publicId === createdAccountPublicId)
            ).toBeTruthy();
            await expect(accountManagementRow(page, createdAccountName)).toBeVisible();
        });

        await test.step('modyfikuje konto', async () => {
            const row = accountManagementRow(page, createdAccountName);
            await row.getByRole('button', {name: /Edytuj element .* w sekcji Konta/}).click();
            const dialog = page.getByRole('dialog', {name: 'Edytuj konto'});
            await dialog.getByRole('textbox', {name: 'Nazwa'}).fill(updatedAccountName);
            await dialog.getByRole('checkbox', {name: 'Widoczne'}).uncheck();
            await dialog.getByRole('spinbutton', {name: 'Limit kredytowy'}).fill('56.78');

            const {mutation, refetch} = await performGraphQlOperationWithRefetch<
                {updateAccount: Account},
                FinanceManagementSettingsData
            >(page, 'UpdateAccount', 'GetFinanceManagementWithNotAssignedBankAccounts', () =>
                dialog.getByRole('button', {name: 'Zapisz zmiany', exact: true}).click()
            );

            accountToDelete = updatedAccountName;
            expect(mutation.variables).toMatchObject({
                publicId: createdAccountPublicId,
                name: updatedAccountName,
                visible: false,
                creditLimitCurrency: testCurrency,
            });
            expectNumericVariable(mutation, 'creditLimitAmount', 56.78);
            expect(mutation.data.updateAccount).toMatchObject({
                publicId: createdAccountPublicId,
                name: updatedAccountName,
                visible: false,
            });
            const updatedAccount = refetch.data.financeManagement.accounts.find(
                account => account.publicId === createdAccountPublicId
            );
            expect(updatedAccount).toMatchObject({name: updatedAccountName, visible: false});
            expect(updatedAccount!.creditLimit.amount).toBeCloseTo(56.78, 8);
            await expect(accountManagementRow(page, updatedAccountName)).toContainText('Ukryte z interfejsu');
        });

        await test.step('zmienia kolejność kont', async () => {
            const accountsBeforeReorder = initialFinanceManagement.data.financeManagement.accounts;
            const orderedAccountsBeforeReorder = [...accountsBeforeReorder].sort(
                (left, right) => left.order - right.order
            );
            const targetAccountIndex = orderedAccountsBeforeReorder.reduce(
                (matchingIndex, account, index) =>
                    index > 0 && account.order === orderedAccountsBeforeReorder[index - 1].order + 1
                        ? index
                        : matchingIndex,
                -1
            );
            expect(
                targetAccountIndex,
                'Do zmiany kolejności jest wymagana para kont o kolejnych wartościach order'
            ).toBeGreaterThan(0);
            const targetAccount = orderedAccountsBeforeReorder[targetAccountIndex];
            const accountAboveTarget = orderedAccountsBeforeReorder[targetAccountIndex - 1];
            const reorderPromise = performGraphQlOperationWithRefetch<
                {reorderAccount: string},
                FinanceManagementSettingsData
            >(page, 'ReorderAccount', 'GetFinanceManagementWithNotAssignedBankAccounts', () =>
                dragRow(
                    page,
                    accountManagementRow(page, updatedAccountName),
                    accountManagementRow(page, targetAccount.name),
                    'up'
                )
            );
            const {mutation, refetch} = await reorderPromise;

            expect(mutation.variables).toEqual({
                accountPublicId: createdAccountPublicId,
                accountBeforePublicId: accountAboveTarget.publicId,
                accountAfterPublicId: targetAccount.publicId,
            });
            expect(mutation.data.reorderAccount).toBeTruthy();
            const orderedAccounts = [...refetch.data.financeManagement.accounts].sort(
                (left, right) => left.order - right.order
            );
            const reorderedAccountIndex = orderedAccounts.findIndex(
                account => account.publicId === createdAccountPublicId
            );
            expect(orderedAccounts[reorderedAccountIndex + 1].publicId).toBe(targetAccount.publicId);
            expect(orderedAccounts[reorderedAccountIndex - 1]?.publicId).toBe(accountAboveTarget.publicId);
            const renderedAccountRows = page.getByRole('tabpanel', {name: 'Konta'}).locator('[draggable="true"]');
            await expect(renderedAccountRows.nth(reorderedAccountIndex)).toContainText(updatedAccountName);
            await expect(renderedAccountRows.nth(reorderedAccountIndex + 1)).toContainText(targetAccount.name);

            const financeManagementAfterReload = await openSettingsPage(page, domainPublicId);
            await page.getByRole('tab', {name: 'Konta', exact: true}).click();
            await expect(accountManagementRow(page, updatedAccountName)).toBeVisible();
            const lastExistingAccount = [...financeManagementAfterReload.data.financeManagement.accounts]
                .sort((left, right) => left.order - right.order)
                .filter(account => account.publicId !== createdAccountPublicId)
                .at(-1)!;
            const restoredOrder = await performGraphQlOperationWithRefetch<
                {reorderAccount: string},
                FinanceManagementSettingsData
            >(page, 'ReorderAccount', 'GetFinanceManagementWithNotAssignedBankAccounts', () =>
                dragRow(
                    page,
                    accountManagementRow(page, updatedAccountName),
                    accountManagementRow(page, lastExistingAccount.name),
                    'down'
                )
            );
            expect(restoredOrder.mutation.variables).toEqual({
                accountPublicId: createdAccountPublicId,
                accountBeforePublicId: lastExistingAccount.publicId,
                accountAfterPublicId: null,
            });
            expect(restoredOrder.mutation.data.reorderAccount).toBeTruthy();
            const restoredAccounts = [...restoredOrder.refetch.data.financeManagement.accounts].sort(
                (left, right) => left.order - right.order
            );
            expect(restoredAccounts.at(-1)!.publicId).toBe(createdAccountPublicId);
            await expect(renderedAccountRows.last()).toContainText(updatedAccountName);
        });

        await test.step('odłącza i przypisuje konto bankowe, a następnie odtwarza powiązanie', async () => {
            const originalRow = accountManagementRow(page, originalBankOwner!.name);
            await originalRow
                .getByRole('button', {name: `Odłącz konto bankowe od ${originalBankOwner!.name}`, exact: true})
                .click();
            const disconnectOriginalDialog = page.getByRole('dialog', {name: 'Odłączyć konto bankowe?'});
            const disconnectOriginal = await performGraphQlOperationWithRefetch<
                {deleteBankAccountAssignment: string},
                FinanceManagementSettingsData
            >(page, 'DeleteBankAccountAssignment', 'GetFinanceManagementWithNotAssignedBankAccounts', () =>
                disconnectOriginalDialog.getByRole('button', {name: 'Odłącz', exact: true}).click()
            );
            bankAccountToRestore!.assignmentState = 'unassigned';
            expect(disconnectOriginal.mutation.variables).toEqual({accountPublicId: originalBankOwner!.publicId});
            expect(disconnectOriginal.mutation.data.deleteBankAccountAssignment).toBeTruthy();
            expect(
                disconnectOriginal.refetch.data.bankPermissions.bankAccountsNotAssignedToAccount.some(
                    account => account.publicId === originalBankOwner!.bankAccount!.publicId
                )
            ).toBeTruthy();

            const testRow = accountManagementRow(page, updatedAccountName);
            await testRow.getByRole('button', {name: 'Przypisz konto', exact: true}).click();
            const assignToTestPicker = page.getByRole('dialog', {name: 'Wybierz konto bankowe'});
            const assignToTest = await performGraphQlOperationWithRefetch<
                {assignBankAccountToAccount: string},
                FinanceManagementSettingsData
            >(page, 'AssignBankAccountToAccount', 'GetFinanceManagementWithNotAssignedBankAccounts', () =>
                assignToTestPicker
                    .getByRole('button', {name: originalBankOwner!.bankAccount!.iban, exact: true})
                    .click()
            );
            bankAccountToRestore!.assignmentState = 'test-account';
            expect(assignToTest.mutation.variables).toEqual({
                accountPublicId: createdAccountPublicId,
                bankAccountPublicId: originalBankOwner!.bankAccount!.publicId,
            });
            expect(assignToTest.mutation.data.assignBankAccountToAccount).toBeTruthy();
            expect(
                assignToTest.refetch.data.financeManagement.accounts.find(
                    account => account.publicId === createdAccountPublicId
                )?.bankAccount?.publicId
            ).toBe(originalBankOwner!.bankAccount!.publicId);

            await accountManagementRow(page, updatedAccountName)
                .getByRole('button', {name: `Odłącz konto bankowe od ${updatedAccountName}`, exact: true})
                .click();
            const disconnectTestDialog = page.getByRole('dialog', {name: 'Odłączyć konto bankowe?'});
            const disconnectTest = await performGraphQlOperationWithRefetch<
                {deleteBankAccountAssignment: string},
                FinanceManagementSettingsData
            >(page, 'DeleteBankAccountAssignment', 'GetFinanceManagementWithNotAssignedBankAccounts', () =>
                disconnectTestDialog.getByRole('button', {name: 'Odłącz', exact: true}).click()
            );
            bankAccountToRestore!.assignmentState = 'unassigned';
            expect(disconnectTest.mutation.variables).toEqual({accountPublicId: createdAccountPublicId});
            expect(disconnectTest.mutation.data.deleteBankAccountAssignment).toBeTruthy();

            await accountManagementRow(page, originalBankOwner!.name)
                .getByRole('button', {name: 'Przypisz konto', exact: true})
                .click();
            const restorePicker = page.getByRole('dialog', {name: 'Wybierz konto bankowe'});
            const restore = await performGraphQlOperationWithRefetch<
                {assignBankAccountToAccount: string},
                FinanceManagementSettingsData
            >(page, 'AssignBankAccountToAccount', 'GetFinanceManagementWithNotAssignedBankAccounts', () =>
                restorePicker.getByRole('button', {name: originalBankOwner!.bankAccount!.iban, exact: true}).click()
            );
            bankAccountToRestore!.assignmentState = 'original';
            expect(restore.mutation.variables).toEqual({
                accountPublicId: originalBankOwner!.publicId,
                bankAccountPublicId: originalBankOwner!.bankAccount!.publicId,
            });
            expect(restore.mutation.data.assignBankAccountToAccount).toBeTruthy();
            expect(
                restore.refetch.data.financeManagement.accounts.find(
                    account => account.publicId === originalBankOwner!.publicId
                )?.bankAccount?.publicId
            ).toBe(originalBankOwner!.bankAccount!.publicId);
        });

        let createdPiggyBankPublicId = '';
        await test.step('tworzy skarbonkę potrzebną do operacji salda', async () => {
            await page.getByRole('tab', {name: 'Wydatki', exact: true}).click();
            const panel = page.getByRole('tabpanel', {name: 'Wydatki'});
            await panel.getByRole('button', {name: 'Dodaj skarbonkę', exact: true}).click();
            const dialog = page.getByRole('dialog', {name: 'Dodaj skarbonkę', exact: true});
            await dialog.getByRole('textbox', {name: 'Nazwa'}).fill(createdPiggyBankName);
            await dialog.getByRole('textbox', {name: 'Opis'}).fill(piggyBankDescription);
            await chooseOption(page, dialog.getByRole('combobox', {name: 'Waluta'}), testCurrency);
            await dialog
                .getByRole('spinbutton', {name: 'Comiesięczne odkładanie'})
                .fill(String(INITIAL_MONTHLY_TOP_UP));
            await dialog.getByRole('checkbox', {name: 'Oszczędnościowa'}).check();

            const {mutation, refetch} = await performGraphQlOperationWithRefetch<
                {createPiggyBank: PiggyBank},
                FinanceManagementSettingsData
            >(page, 'CreatePiggyBank', 'GetFinanceManagementWithNotAssignedBankAccounts', () =>
                dialog.getByRole('button', {name: 'Dodaj skarbonkę', exact: true}).click()
            );

            piggyBankToDelete = createdPiggyBankName;
            createdPiggyBankPublicId = mutation.data.createPiggyBank.publicId;
            expect(mutation.variables).toMatchObject({
                name: createdPiggyBankName,
                description: piggyBankDescription,
                currency: testCurrency,
                savings: true,
            });
            expectNumericVariable(mutation, 'monthlyTopUp', INITIAL_MONTHLY_TOP_UP);
            expect(mutation.data.createPiggyBank).toMatchObject({
                publicId: createdPiggyBankPublicId,
                name: createdPiggyBankName,
                description: piggyBankDescription,
                savings: true,
            });
            expect(
                refetch.data.financeManagement.piggyBanks.some(
                    piggyBank => piggyBank.publicId === createdPiggyBankPublicId
                )
            ).toBeTruthy();
            await expect(piggyBankManagementRow(page, createdPiggyBankName)).toBeVisible();
        });

        await test.step('modyfikuje skarbonkę w ustawieniach', async () => {
            const row = piggyBankManagementRow(page, createdPiggyBankName);
            await row.getByRole('button', {name: /Edytuj element .* w sekcji Skarbonki/}).click();
            const dialog = page.getByRole('dialog', {name: 'Edytuj skarbonkę'});
            await dialog.getByRole('textbox', {name: 'Nazwa'}).fill(piggyBankName);
            await dialog.getByRole('textbox', {name: 'Opis'}).fill(updatedPiggyBankDescription);
            await dialog
                .getByRole('spinbutton', {name: 'Comiesięczne odkładanie'})
                .fill(String(UPDATED_MONTHLY_TOP_UP));
            await dialog.getByRole('checkbox', {name: 'Oszczędnościowa'}).uncheck();

            const {mutation, refetch} = await performGraphQlOperationWithRefetch<
                {updatePiggyBank: PiggyBank},
                FinanceManagementSettingsData
            >(page, 'UpdatePiggyBank', 'GetFinanceManagementWithNotAssignedBankAccounts', () =>
                dialog.getByRole('button', {name: 'Zapisz zmiany', exact: true}).click()
            );

            piggyBankToDelete = piggyBankName;
            expect(mutation.variables).toMatchObject({
                publicId: createdPiggyBankPublicId,
                name: piggyBankName,
                description: updatedPiggyBankDescription,
                currency: testCurrency,
                savings: false,
            });
            expectNumericVariable(mutation, 'balance', 0);
            expectNumericVariable(mutation, 'monthlyTopUp', UPDATED_MONTHLY_TOP_UP);
            expect(mutation.data.updatePiggyBank).toMatchObject({
                publicId: createdPiggyBankPublicId,
                name: piggyBankName,
                description: updatedPiggyBankDescription,
                savings: false,
            });
            const updatedPiggyBank = refetch.data.financeManagement.piggyBanks.find(
                piggyBank => piggyBank.publicId === createdPiggyBankPublicId
            );
            expect(updatedPiggyBank).toMatchObject({
                name: piggyBankName,
                description: updatedPiggyBankDescription,
                savings: false,
            });
            expect(updatedPiggyBank!.monthlyTopUp.amount).toBeCloseTo(UPDATED_MONTHLY_TOP_UP, 8);
            await expect(piggyBankManagementRow(page, piggyBankName)).toContainText(updatedPiggyBankDescription);
        });

        const accountsPageFinanceManagement =
            await test.step('odświeża stronę kont i pokazuje aktualne dane', async () => {
                const financeManagement = await openAccountsPage(page, domainPublicId);
                const accounts = financeManagement.data.financeManagement.accounts;
                const hiddenAccountsCount = accounts.filter(account => !account.visible).length;
                await expect(page.getByText(`Liczba kont: ${accounts.length}`, {exact: true})).toBeVisible();
                await expect(
                    page.getByRole('button', {
                        name: `Ukrytych: ${hiddenAccountsCount}. Przejdź do Ustawienia, Konta`,
                        exact: true,
                    })
                ).toBeVisible();
                await expect(page.getByText(updatedAccountName, {exact: true})).toHaveCount(0);
                await expect(piggyBankRow(page, piggyBankName)).toBeVisible();
                return financeManagement;
            });

        const [sourceAccount, destinationAccount] = twoVisibleAccountsInTheSameCurrency(
            accountsPageFinanceManagement.data.financeManagement.accounts
        );
        const transferCurrency = sourceAccount.currentBalance.currency.code;
        const initialSourceBalance = sourceAccount.currentBalance.amount;
        const initialDestinationBalance = destinationAccount.currentBalance.amount;

        await test.step('wykonuje przelew z poziomu konta', async () => {
            await page.getByRole('button', {name: `Przelej z konta ${sourceAccount.name}`, exact: true}).click();
            const dialog = page.getByRole('dialog', {name: `Przelej z konta ${sourceAccount.name}`, exact: true});
            await expect(dialog.getByRole('combobox', {name: 'Z konta'})).toBeDisabled();
            await chooseOption(
                page,
                dialog.getByRole('combobox', {name: 'Na konto'}),
                `${destinationAccount.name} (${transferCurrency})`
            );
            await dialog.getByRole('spinbutton', {name: 'Kwota', exact: true}).fill(String(TRANSFER_AMOUNT));
            await dialog.getByRole('textbox', {name: 'Opis'}).fill(transferDescription);

            const {mutation, refetch} = await performGraphQlOperationWithRefetch<
                {createTransfer: string},
                FinanceManagementData
            >(page, 'CreateTransfer', 'GetFinanceManagement', () =>
                dialog.getByRole('button', {name: 'Zapisz', exact: true}).click()
            );
            transferToReverse = {source: sourceAccount, destination: destinationAccount};

            expect(mutation.variables).toMatchObject({
                fromAccountPublicId: sourceAccount.publicId,
                toAccountPublicId: destinationAccount.publicId,
                description: transferDescription,
                bankTransactionPublicIds: [],
            });
            expectNumericVariable(mutation, 'fromAmount', TRANSFER_AMOUNT);
            expectNumericVariable(mutation, 'toAmount', TRANSFER_AMOUNT);
            expect(mutation.variables.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
            expect(mutation.data.createTransfer).toBeTruthy();

            const sourceAfterTransfer = refetch.data.financeManagement.accounts.find(
                account => account.publicId === sourceAccount.publicId
            );
            const destinationAfterTransfer = refetch.data.financeManagement.accounts.find(
                account => account.publicId === destinationAccount.publicId
            );
            expect(sourceAfterTransfer!.currentBalance.amount).toBeCloseTo(initialSourceBalance - TRANSFER_AMOUNT, 8);
            expect(destinationAfterTransfer!.currentBalance.amount).toBeCloseTo(
                initialDestinationBalance + TRANSFER_AMOUNT,
                8
            );
            await expect(accountButton(page, sourceAccount.name)).toContainText(
                await formatMoney(page, initialSourceBalance - TRANSFER_AMOUNT, transferCurrency)
            );
            await expect(accountButton(page, destinationAccount.name)).toContainText(
                await formatMoney(page, initialDestinationBalance + TRANSFER_AMOUNT, transferCurrency)
            );
        });

        await test.step('pobiera historię, zmienia miesiąc i przelewa przychodzącą transakcję dalej', async () => {
            const currentMonth = await currentYearMonth(page);
            const currentTransactionsPromise = waitForGraphQlOperation<AccountTransactionsData>(
                page,
                'GetAccountTransactions'
            );
            await accountButton(page, destinationAccount.name).click();
            const currentTransactions = await currentTransactionsPromise;
            const dialog = page.getByRole('dialog', {
                name: `Transakcje dla konta ${destinationAccount.name}`,
                exact: true,
            });
            expect(currentTransactions.variables).toEqual({
                publicId: destinationAccount.publicId,
                yearMonth: currentMonth,
            });
            const transactions = currentTransactions.data.financeManagement.accounts[0]?.transactions ?? [];
            const receivedTransfer = transactions.find(transaction => transaction.description === transferDescription);
            expect(receivedTransfer).toMatchObject({
                description: transferDescription,
                source: {publicId: sourceAccount.publicId},
                destination: {publicId: destinationAccount.publicId},
            });
            expect(receivedTransfer!.credit!.amount).toBeCloseTo(TRANSFER_AMOUNT, 8);
            await expect(dialog.getByText(transferDescription, {exact: true})).toBeVisible();
            await expect(dialog.getByText(`Liczba transakcji: ${transactions.length}`, {exact: true})).toBeVisible();

            const previousMonth = shiftYearMonth(currentMonth, -1);
            const previousTransactionsPromise = waitForGraphQlOperation<AccountTransactionsData>(
                page,
                'GetAccountTransactions'
            );
            await dialog.getByRole('button', {name: 'Poprzedni miesiąc', exact: true}).click();
            const previousTransactions = await previousTransactionsPromise;
            expect(previousTransactions.variables).toEqual({
                publicId: destinationAccount.publicId,
                yearMonth: previousMonth,
            });
            const previousTransactionsCount =
                previousTransactions.data.financeManagement.accounts[0]?.transactions.length ?? 0;
            await expect(
                dialog.getByText(`Liczba transakcji: ${previousTransactionsCount}`, {exact: true})
            ).toBeVisible();

            const nextTransactionsPromise = waitForGraphQlOperation<AccountTransactionsData>(
                page,
                'GetAccountTransactions'
            );
            await dialog.getByRole('button', {name: 'Następny miesiąc', exact: true}).click();
            const nextTransactions = await nextTransactionsPromise;
            expect(nextTransactions.variables).toEqual({
                publicId: destinationAccount.publicId,
                yearMonth: currentMonth,
            });
            await expect(dialog.getByText(transferDescription, {exact: true})).toBeVisible();

            await dialog.getByRole('button', {name: `Przelej dalej: ${transferDescription}`, exact: true}).click();
            const transferDialog = page.getByRole('dialog', {
                name: `Przelej z konta ${destinationAccount.name}`,
                exact: true,
            });
            await chooseOption(
                page,
                transferDialog.getByRole('combobox', {name: 'Na konto'}),
                `${sourceAccount.name} (${transferCurrency})`
            );
            await expect(transferDialog.getByRole('spinbutton', {name: 'Kwota', exact: true})).toHaveValue(
                String(TRANSFER_AMOUNT)
            );
            await expect(transferDialog.getByRole('textbox', {name: 'Opis'})).toHaveValue(transferDescription);
            await expect(transferDialog.getByRole('textbox', {name: 'Opis'})).toBeDisabled();

            const transactionsRefetchPromise = waitForGraphQlOperation<AccountTransactionsData>(
                page,
                'GetAccountTransactions'
            );
            const financeManagementRefetchPromise = waitForGraphQlOperation<FinanceManagementData>(
                page,
                'GetFinanceManagement'
            );
            const forwardTransfer = await performGraphQlOperation<{createTransfer: string}>(
                page,
                'CreateTransfer',
                () => transferDialog.getByRole('button', {name: 'Zapisz', exact: true}).click()
            );
            transferToReverse = undefined;
            const transactionsAfterForward = await transactionsRefetchPromise;
            const financeManagementAfterForward = await financeManagementRefetchPromise;

            expect(forwardTransfer.variables).toMatchObject({
                fromAccountPublicId: destinationAccount.publicId,
                toAccountPublicId: sourceAccount.publicId,
                description: transferDescription,
                bankTransactionPublicIds: [],
            });
            expectNumericVariable(forwardTransfer, 'fromAmount', TRANSFER_AMOUNT);
            expectNumericVariable(forwardTransfer, 'toAmount', TRANSFER_AMOUNT);
            expect(forwardTransfer.data.createTransfer).toBeTruthy();
            expect(transactionsAfterForward.variables).toEqual({
                publicId: destinationAccount.publicId,
                yearMonth: currentMonth,
            });
            expect(
                transactionsAfterForward.data.financeManagement.accounts[0].transactions.filter(
                    transaction => transaction.description === transferDescription
                )
            ).toHaveLength(2);
            expect(
                financeManagementAfterForward.data.financeManagement.accounts.find(
                    account => account.publicId === sourceAccount.publicId
                )!.currentBalance.amount
            ).toBeCloseTo(initialSourceBalance, 8);
            expect(
                financeManagementAfterForward.data.financeManagement.accounts.find(
                    account => account.publicId === destinationAccount.publicId
                )!.currentBalance.amount
            ).toBeCloseTo(initialDestinationBalance, 8);

            const closeTransactionsButton = dialog.getByRole('button', {name: 'Zamknij', exact: true});
            if (await closeTransactionsButton.isVisible()) {
                await closeTransactionsButton.click();
            }
            await expect(dialog).toBeHidden();
            await expect(accountButton(page, sourceAccount.name)).toContainText(
                await formatMoney(page, initialSourceBalance, transferCurrency)
            );
            await expect(accountButton(page, destinationAccount.name)).toContainText(
                await formatMoney(page, initialDestinationBalance, transferCurrency)
            );
        });

        await test.step('dodaje i odejmuje środki skarbonki', async () => {
            const initialPiggyBank = accountsPageFinanceManagement.data.financeManagement.piggyBanks.find(
                piggyBank => piggyBank.publicId === createdPiggyBankPublicId
            );
            expect(initialPiggyBank).toBeDefined();
            const initialBalance = initialPiggyBank!.balance.amount;

            await page.getByRole('button', {name: `Dodaj środki do skarbonki ${piggyBankName}`, exact: true}).click();
            const creditDialog = page.getByRole('dialog', {name: `Dodaj środki: ${piggyBankName}`, exact: true});
            await creditDialog.getByRole('spinbutton', {name: 'Kwota'}).fill(String(PIGGY_BANK_AMOUNT));
            const credit = await performGraphQlOperationWithRefetch<
                {updatePiggyBank: PiggyBank},
                FinanceManagementData
            >(page, 'UpdatePiggyBank', 'GetFinanceManagement', () =>
                creditDialog.getByRole('button', {name: 'Dodaj środki', exact: true}).click()
            );
            expect(credit.mutation.variables).toMatchObject({
                publicId: createdPiggyBankPublicId,
                name: piggyBankName,
                description: updatedPiggyBankDescription,
                currency: testCurrency,
                savings: false,
            });
            expectNumericVariable(credit.mutation, 'balance', initialBalance + PIGGY_BANK_AMOUNT);
            expectNumericVariable(credit.mutation, 'monthlyTopUp', UPDATED_MONTHLY_TOP_UP);
            expect(credit.mutation.data.updatePiggyBank.balance.amount).toBeCloseTo(
                initialBalance + PIGGY_BANK_AMOUNT,
                8
            );
            expect(
                credit.refetch.data.financeManagement.piggyBanks.find(
                    piggyBank => piggyBank.publicId === createdPiggyBankPublicId
                )!.balance.amount
            ).toBeCloseTo(initialBalance + PIGGY_BANK_AMOUNT, 8);
            await expect(piggyBankRow(page, piggyBankName)).toContainText(
                await formatMoney(page, initialBalance + PIGGY_BANK_AMOUNT, testCurrency)
            );

            await page.getByRole('button', {name: `Odejmij środki ze skarbonki ${piggyBankName}`, exact: true}).click();
            const debitDialog = page.getByRole('dialog', {name: `Odejmij środki: ${piggyBankName}`, exact: true});
            await debitDialog.getByRole('spinbutton', {name: 'Kwota'}).fill(String(PIGGY_BANK_AMOUNT));
            const debit = await performGraphQlOperationWithRefetch<{updatePiggyBank: PiggyBank}, FinanceManagementData>(
                page,
                'UpdatePiggyBank',
                'GetFinanceManagement',
                () => debitDialog.getByRole('button', {name: 'Odejmij środki', exact: true}).click()
            );
            expectNumericVariable(debit.mutation, 'balance', initialBalance);
            expect(debit.mutation.data.updatePiggyBank.balance.amount).toBeCloseTo(initialBalance, 8);
            expect(
                debit.refetch.data.financeManagement.piggyBanks.find(
                    piggyBank => piggyBank.publicId === createdPiggyBankPublicId
                )!.balance.amount
            ).toBeCloseTo(initialBalance, 8);
            await expect(piggyBankRow(page, piggyBankName)).toContainText(
                await formatMoney(page, initialBalance, testCurrency)
            );
        });

        await test.step('usuwa dane konfiguracyjne utworzone przez test', async () => {
            await openSettingsPage(page, domainPublicId);
            await page.getByRole('tab', {name: 'Konta', exact: true}).click();
            const accountRow = accountManagementRow(page, updatedAccountName);
            await accountRow.getByRole('button', {name: /Usuń element .* z sekcji Konta/}).click();
            const accountConfirmation = page.getByRole('dialog', {name: 'Usunąć konto?'});
            const deletedAccount = await performGraphQlOperationWithRefetch<
                {deleteAccount: string},
                FinanceManagementSettingsData
            >(page, 'DeleteAccount', 'GetFinanceManagementWithNotAssignedBankAccounts', () =>
                accountConfirmation.getByRole('button', {name: 'Usuń', exact: true}).click()
            );
            expect(deletedAccount.mutation.variables).toEqual({publicId: createdAccountPublicId});
            expect(deletedAccount.mutation.data.deleteAccount).toBeTruthy();
            expect(
                deletedAccount.refetch.data.financeManagement.accounts.some(
                    account => account.publicId === createdAccountPublicId
                )
            ).toBeFalsy();
            accountToDelete = undefined;

            await page.getByRole('tab', {name: 'Wydatki', exact: true}).click();
            const piggyBankRowToDelete = piggyBankManagementRow(page, piggyBankName);
            await piggyBankRowToDelete.getByRole('button', {name: /Usuń element .* z sekcji Skarbonki/}).click();
            const piggyBankConfirmation = page.getByRole('dialog', {name: 'Usunąć skarbonkę?'});
            const deletedPiggyBank = await performGraphQlOperationWithRefetch<
                {deletePiggyBank: string},
                FinanceManagementSettingsData
            >(page, 'DeletePiggyBank', 'GetFinanceManagementWithNotAssignedBankAccounts', () =>
                piggyBankConfirmation.getByRole('button', {name: 'Usuń', exact: true}).click()
            );
            expect(deletedPiggyBank.mutation.variables).toEqual({publicId: createdPiggyBankPublicId});
            expect(deletedPiggyBank.mutation.data.deletePiggyBank).toBeTruthy();
            expect(
                deletedPiggyBank.refetch.data.financeManagement.piggyBanks.some(
                    piggyBank => piggyBank.publicId === createdPiggyBankPublicId
                )
            ).toBeFalsy();
            piggyBankToDelete = undefined;
        });
    } finally {
        const cleanupFailures: string[] = [];

        if (domainPublicId && transferToReverse) {
            try {
                await reverseTransferAfterFailure(
                    page,
                    domainPublicId,
                    transferToReverse.source,
                    transferToReverse.destination,
                    transferDescription
                );
                transferToReverse = undefined;
            } catch (error) {
                cleanupFailures.push(`nie udało się odwrócić przelewu: ${String(error)}`);
            }
        }

        if (domainPublicId && bankAccountToRestore && bankAccountToRestore.assignmentState !== 'original') {
            try {
                await restoreBankAccountAfterFailure(
                    page,
                    domainPublicId,
                    bankAccountToRestore.originalAccountName,
                    accountToDelete ?? updatedAccountName,
                    bankAccountToRestore.iban,
                    bankAccountToRestore.assignmentState
                );
                bankAccountToRestore.assignmentState = 'original';
            } catch (error) {
                cleanupFailures.push(`nie udało się odtworzyć powiązania bankowego: ${String(error)}`);
            }
        }

        if (domainPublicId && (accountToDelete || piggyBankToDelete)) {
            try {
                await deleteTestEntitiesAfterFailure(page, domainPublicId, accountToDelete, piggyBankToDelete);
                accountToDelete = undefined;
                piggyBankToDelete = undefined;
            } catch (error) {
                cleanupFailures.push(`nie udało się usunąć danych testowych: ${String(error)}`);
            }
        }

        for (const failure of cleanupFailures) {
            testInfo.annotations.push({type: 'błąd sprzątania', description: failure});
            console.warn(`[E2E] ${failure}`);
        }
    }
});

test('wykonuje przelew między kontami w różnych walutach i pokazuje prawidłowe salda', async ({page}, testInfo) => {
    test.setTimeout(120_000);

    const transferDescription = `E2E przelew różnowalutowy ${RUN_ID}`;
    let domainPublicId = '';
    let transferToReverse:
        | {
              source: Account;
              destination: Account;
          }
        | undefined;

    try {
        domainPublicId = await login(page);
        const financeManagement = await openAccountsPage(page, domainPublicId);
        const [sourceAccount, destinationAccount] = twoVisibleAccountsInDifferentCurrencies(
            financeManagement.data.financeManagement.accounts
        );
        const sourceCurrency = sourceAccount.currentBalance.currency.code;
        const destinationCurrency = destinationAccount.currentBalance.currency.code;
        const initialSourceBalance = sourceAccount.currentBalance.amount;
        const initialDestinationBalance = destinationAccount.currentBalance.amount;

        await test.step('przelewa różne kwoty między kontami w różnych walutach', async () => {
            await page.getByRole('button', {name: `Przelej z konta ${sourceAccount.name}`, exact: true}).click();
            const dialog = page.getByRole('dialog', {name: `Przelej z konta ${sourceAccount.name}`, exact: true});
            await expect(dialog.getByRole('combobox', {name: 'Z konta'})).toBeDisabled();
            await chooseOption(
                page,
                dialog.getByRole('combobox', {name: 'Na konto'}),
                `${destinationAccount.name} (${destinationCurrency})`
            );
            await dialog
                .getByRole('spinbutton', {name: 'Kwota z', exact: true})
                .fill(String(FOREIGN_CURRENCY_SOURCE_AMOUNT));
            await dialog
                .getByRole('spinbutton', {name: 'Kwota na', exact: true})
                .fill(String(FOREIGN_CURRENCY_DESTINATION_AMOUNT));
            await dialog.getByRole('textbox', {name: 'Opis'}).fill(transferDescription);

            const {mutation, refetch} = await performGraphQlOperationWithRefetch<
                {createTransfer: string},
                FinanceManagementData
            >(page, 'CreateTransfer', 'GetFinanceManagement', () =>
                dialog.getByRole('button', {name: 'Zapisz', exact: true}).click()
            );
            transferToReverse = {source: sourceAccount, destination: destinationAccount};

            expect(mutation.variables).toMatchObject({
                fromAccountPublicId: sourceAccount.publicId,
                toAccountPublicId: destinationAccount.publicId,
                description: transferDescription,
                bankTransactionPublicIds: [],
            });
            expectNumericVariable(mutation, 'fromAmount', FOREIGN_CURRENCY_SOURCE_AMOUNT);
            expectNumericVariable(mutation, 'toAmount', FOREIGN_CURRENCY_DESTINATION_AMOUNT);
            expect(mutation.variables.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
            expect(mutation.data.createTransfer).toBeTruthy();

            const sourceAfterTransfer = refetch.data.financeManagement.accounts.find(
                account => account.publicId === sourceAccount.publicId
            );
            const destinationAfterTransfer = refetch.data.financeManagement.accounts.find(
                account => account.publicId === destinationAccount.publicId
            );
            expect(sourceAfterTransfer!.currentBalance.amount).toBeCloseTo(
                initialSourceBalance - FOREIGN_CURRENCY_SOURCE_AMOUNT,
                8
            );
            expect(destinationAfterTransfer!.currentBalance.amount).toBeCloseTo(
                initialDestinationBalance + FOREIGN_CURRENCY_DESTINATION_AMOUNT,
                8
            );
            await expect(accountButton(page, sourceAccount.name)).toContainText(
                await formatMoney(page, initialSourceBalance - FOREIGN_CURRENCY_SOURCE_AMOUNT, sourceCurrency)
            );
            await expect(accountButton(page, destinationAccount.name)).toContainText(
                await formatMoney(
                    page,
                    initialDestinationBalance + FOREIGN_CURRENCY_DESTINATION_AMOUNT,
                    destinationCurrency
                )
            );
        });

        await test.step('odwraca przelew i przywraca salda obu walut', async () => {
            await page.getByRole('button', {name: `Przelej z konta ${destinationAccount.name}`, exact: true}).click();
            const dialog = page.getByRole('dialog', {
                name: `Przelej z konta ${destinationAccount.name}`,
                exact: true,
            });
            await chooseOption(
                page,
                dialog.getByRole('combobox', {name: 'Na konto'}),
                `${sourceAccount.name} (${sourceCurrency})`
            );
            await dialog
                .getByRole('spinbutton', {name: 'Kwota z', exact: true})
                .fill(String(FOREIGN_CURRENCY_DESTINATION_AMOUNT));
            await dialog
                .getByRole('spinbutton', {name: 'Kwota na', exact: true})
                .fill(String(FOREIGN_CURRENCY_SOURCE_AMOUNT));
            await dialog.getByRole('textbox', {name: 'Opis'}).fill(`${transferDescription} — odwrócenie`);

            const {mutation, refetch} = await performGraphQlOperationWithRefetch<
                {createTransfer: string},
                FinanceManagementData
            >(page, 'CreateTransfer', 'GetFinanceManagement', () =>
                dialog.getByRole('button', {name: 'Zapisz', exact: true}).click()
            );
            transferToReverse = undefined;

            expect(mutation.variables).toMatchObject({
                fromAccountPublicId: destinationAccount.publicId,
                toAccountPublicId: sourceAccount.publicId,
                bankTransactionPublicIds: [],
            });
            expectNumericVariable(mutation, 'fromAmount', FOREIGN_CURRENCY_DESTINATION_AMOUNT);
            expectNumericVariable(mutation, 'toAmount', FOREIGN_CURRENCY_SOURCE_AMOUNT);
            expect(mutation.data.createTransfer).toBeTruthy();
            expect(
                refetch.data.financeManagement.accounts.find(account => account.publicId === sourceAccount.publicId)!
                    .currentBalance.amount
            ).toBeCloseTo(initialSourceBalance, 8);
            expect(
                refetch.data.financeManagement.accounts.find(
                    account => account.publicId === destinationAccount.publicId
                )!.currentBalance.amount
            ).toBeCloseTo(initialDestinationBalance, 8);
            await expect(accountButton(page, sourceAccount.name)).toContainText(
                await formatMoney(page, initialSourceBalance, sourceCurrency)
            );
            await expect(accountButton(page, destinationAccount.name)).toContainText(
                await formatMoney(page, initialDestinationBalance, destinationCurrency)
            );
        });
    } finally {
        if (domainPublicId && transferToReverse) {
            try {
                await reverseTransferAfterFailure(
                    page,
                    domainPublicId,
                    transferToReverse.source,
                    transferToReverse.destination,
                    transferDescription,
                    FOREIGN_CURRENCY_DESTINATION_AMOUNT,
                    FOREIGN_CURRENCY_SOURCE_AMOUNT
                );
            } catch (error) {
                const failure = `nie udało się odwrócić przelewu różnowalutowego: ${String(error)}`;
                testInfo.annotations.push({type: 'błąd sprzątania', description: failure});
                console.warn(`[E2E] ${failure}`);
            }
        }
    }
});
