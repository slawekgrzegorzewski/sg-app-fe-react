import {expect, test, type Locator, type Page, type Request, type TestInfo} from '@playwright/test';
import {
    login,
    performGraphQlOperation,
    RUN_ID,
    waitForGraphQlData,
    type ObservedGraphQlOperation,
} from './support/data-interactions';

const LOAN_AMOUNT = 12_345.67;
const NUMBER_OF_INSTALLMENTS = 36;
const CONSTANT_RATE_PERCENT = 7.25;
const CONSTANT_RATE_INSTALLMENTS = 6;
const VARIABLE_RATE_MARGIN_PERCENT = 1.35;
const REPAYMENT_DAY = 23;
const REPAID_INTEREST = 12.34;
const REPAID_CAPITAL = 123.45;
const OVERPAYMENT = 10.11;
const MONTHLY_SIMULATION_BUDGET = 75.5;
const YEARLY_SIMULATION_BUDGET = 900.25;

type Currency = {
    code: string;
    description: string;
};

type Money = {
    amount: number;
    currency: Currency;
};

type RateStrategy = {
    __typename: 'ConstantForNFirstInstallmentRateStrategyConfig';
    publicId: string;
    name: string;
    constantRate: number;
    becomesVariableRateAfterNInstallments: number;
    variableRateMargin: number;
};

type RepaymentDayStrategy = {
    __typename: 'NthDayOfMonthRepaymentDayStrategyConfig';
    publicId: string;
    name: string;
    dayOfMonth: number;
};

type Installment = {
    publicId: string;
    paidAt: string;
    repaidInterest: Money;
    repaidAmount: Money;
    overpayment: Money;
};

type LoanData = {
    publicId: string;
    name: string;
    paymentDate: string;
    numberOfInstallments: number;
    paidAmount: Money;
    rateStrategyConfig: RateStrategy;
    repaymentDayStrategyConfig: RepaymentDayStrategy;
    installments: Installment[];
};

type LoansData = {
    loans: {
        loans: LoanData[];
        rateStrategyConfigs: RateStrategy[];
        repaymentDayStrategyConfigs: RepaymentDayStrategy[];
    };
};

type SingleLoanData = {
    singleLoan: LoanData;
};

type SimulatedInstallment = {
    installment: number;
    repaidCapital: number;
    paidInterest: number;
    overpayment: number;
    paymentFrom: string;
    paymentTo: string;
    remainingCapitalAtTheBeginning: number;
};

type SimulationData = {
    simulateExistingLoan: SimulatedInstallment[];
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

async function expectNoGraphQlOperation(
    page: Page,
    operationNames: string[],
    action: () => Promise<unknown>
): Promise<void> {
    const observedOperations: string[] = [];
    const observeRequest = (request: Request) => {
        const operationName = graphQlOperationName(request);
        if (operationName && operationNames.includes(operationName)) {
            observedOperations.push(operationName);
        }
    };
    page.on('request', observeRequest);
    try {
        await action();
        expect(observedOperations, `Nie oczekiwano operacji: ${operationNames.join(', ')}`).toHaveLength(0);
    } finally {
        page.off('request', observeRequest);
    }
}

async function performGraphQlOperationWithRefetch<TMutationData, TQueryData>(
    page: Page,
    mutationName: string,
    queryName: string,
    action: () => Promise<unknown>
): Promise<{
    mutation: ObservedGraphQlOperation<TMutationData>;
    refetch: TQueryData;
}> {
    const refetchPromise = waitForGraphQlData<TQueryData>(page, queryName);
    const [mutation, refetch] = await Promise.all([
        performGraphQlOperation<TMutationData>(page, mutationName, action),
        refetchPromise,
    ]);
    expect(mutation.responseBody.data, `Mutacja ${mutationName} nie zwróciła danych`).toBeDefined();
    return {mutation, refetch};
}

async function openLoansPage(page: Page, domainPublicId: string): Promise<LoansData> {
    const loansPromise = waitForGraphQlData<LoansData>(page, 'GetLoans');
    await page.goto(`/ACCOUNTANT/${domainPublicId}/loans`);
    const loans = await loansPromise;
    await expect(page.getByRole('heading', {name: 'Pożyczki', exact: true})).toBeVisible();
    return loans;
}

function sectionByHeading(page: Page, heading: string): Locator {
    return page.getByRole('heading', {name: heading, exact: true}).locator('xpath=ancestor::section[1]');
}

function entityRow(section: Locator, entityName: string): Locator {
    return section
        .getByText(entityName, {exact: true})
        .locator('xpath=ancestor::div[descendant::button[contains(@aria-label, "Usuń")]][1]');
}

async function chooseOptionAt(page: Page, combobox: Locator, index: number): Promise<void> {
    await combobox.click();
    const option = page.getByRole('listbox').getByRole('option').nth(index);
    await expect(option).toBeVisible();
    await option.click();
}

async function chooseFirstDayOfCurrentMonth(page: Page, dialog: Locator): Promise<string> {
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

async function formatMoney(page: Page, amount: number, currency: string): Promise<string> {
    return page.evaluate(
        ({amount, currency}) => new Intl.NumberFormat(navigator.language, {style: 'currency', currency}).format(amount),
        {amount, currency}
    );
}

function formatTableDate(isoDate: string): string {
    const [year, month, day] = isoDate.slice(0, 10).split('-');
    return `${day}.${month}.${year}`;
}

function expectNumericVariable(operation: ObservedGraphQlOperation, variableName: string, expectedValue: number): void {
    expect(Number(operation.variables[variableName]), `Zmienna ${variableName}`).toBeCloseTo(expectedValue, 8);
}

async function deleteEntityFromList(
    page: Page,
    sectionHeading: string,
    entityName: string,
    buttonName: string,
    dialogName: string,
    operationName: string
): Promise<void> {
    const section = sectionByHeading(page, sectionHeading);
    const matchingEntity = section.getByText(entityName, {exact: true});
    if ((await matchingEntity.count()) === 0) {
        return;
    }

    await entityRow(section, entityName).getByRole('button', {name: buttonName, exact: true}).click();
    const dialog = page.getByRole('dialog', {name: dialogName, exact: true});
    await performGraphQlOperation(page, operationName, () =>
        dialog.getByRole('button', {name: 'Usuń', exact: true}).click()
    );
    await expect(section.getByText(entityName, {exact: true})).toHaveCount(0);
}

async function cleanLoanData(
    page: Page,
    domainPublicId: string,
    loanNames: string[],
    rateStrategyName: string,
    repaymentDayStrategyName: string
): Promise<void> {
    await openLoansPage(page, domainPublicId);
    for (const loanName of loanNames) {
        await deleteEntityFromList(
            page,
            'Twoje pożyczki',
            loanName,
            `Usuń pożyczkę ${loanName}`,
            'Usunąć pożyczkę?',
            'DeleteLoan'
        );
    }
    await deleteEntityFromList(
        page,
        'Oprocentowanie',
        rateStrategyName,
        `Usuń sposób naliczania ${rateStrategyName}`,
        'Usunąć sposób naliczania?',
        'DeleteRateStrategyConfig'
    );
    await deleteEntityFromList(
        page,
        'Dzień spłaty',
        repaymentDayStrategyName,
        `Usuń sposób wyboru dnia ${repaymentDayStrategyName}`,
        'Usunąć sposób wyboru dnia?',
        'DeleteRepaymentDayStrategyConfig'
    );
}

function addCleanupFailure(testInfo: TestInfo, message: string, error: unknown): void {
    const description = `${message}: ${String(error)}`;
    testInfo.annotations.push({type: 'błąd sprzątania', description});
    console.warn(`[E2E] ${description}`);
}

test.describe('pożyczki', () => {
    test('obsługuje wszystkie interakcje z danymi na liście i szczegółach pożyczki', async ({page}, testInfo) => {
        test.setTimeout(240_000);

        const loanName = `E2E pożyczka ${RUN_ID}`;
        const updatedLoanName = `${loanName} — zmieniona`;
        const detailsDeletionLoanName = `E2E pożyczka do usunięcia ze szczegółów ${RUN_ID}`;
        const rateStrategyName = `E2E oprocentowanie ${RUN_ID}`;
        const repaymentDayStrategyName = `E2E dzień spłaty ${RUN_ID}`;
        let domainPublicId = '';
        let loanExists = false;
        let currentLoanName = loanName;
        let rateStrategyExists = false;
        let repaymentDayStrategyExists = false;

        try {
            domainPublicId = await login(page);
            const initialData = await openLoansPage(page, domainPublicId);
            const initialLoanCount = initialData.loans.loans.length;
            const initialRateStrategyCount = initialData.loans.rateStrategyConfigs.length;
            const initialRepaymentDayStrategyCount = initialData.loans.repaymentDayStrategyConfigs.length;

            await test.step('anuluje i waliduje utworzenie strategii oprocentowania bez mutacji', async () => {
                await page.getByRole('button', {name: 'Dodaj sposób naliczania', exact: true}).click();
                const dialog = page.getByRole('dialog', {name: 'Dodaj sposób naliczania odsetek', exact: true});
                await expectNoGraphQlOperation(
                    page,
                    ['CreateConstantForNFirstInstallmentRateStrategyConfig'],
                    async () => {
                        await dialog.getByRole('button', {name: 'Dodaj strategię', exact: true}).click();
                        await expect(dialog.getByText('Wymagana', {exact: true})).toBeVisible();
                        await expect(dialog.getByText('Musi być dodatnia', {exact: true})).toHaveCount(3);
                        await dialog.getByRole('button', {name: 'Anuluj', exact: true}).click();
                        await expect(dialog).toBeHidden();
                    }
                );
            });

            const {rateStrategy, rateStrategyIndex} = await test.step('tworzy strategię oprocentowania', async () => {
                await page.getByRole('button', {name: 'Dodaj sposób naliczania', exact: true}).click();
                const dialog = page.getByRole('dialog', {name: 'Dodaj sposób naliczania odsetek', exact: true});
                await dialog.getByRole('textbox', {name: 'Nazwa', exact: true}).fill(rateStrategyName);
                await dialog
                    .getByRole('spinbutton', {name: 'Stałe oprocentowanie', exact: true})
                    .fill(String(CONSTANT_RATE_PERCENT));
                await dialog
                    .getByRole('spinbutton', {
                        name: 'Liczba miesięcy kiedy stałe oprocentowanie obowiązuje',
                        exact: true,
                    })
                    .fill(String(CONSTANT_RATE_INSTALLMENTS));
                await dialog
                    .getByRole('spinbutton', {name: 'Marża po stałym oprocentowaniu', exact: true})
                    .fill(String(VARIABLE_RATE_MARGIN_PERCENT));

                const result = await performGraphQlOperationWithRefetch<
                    {createConstantForNFirstInstallmentRateStrategyConfig: RateStrategy},
                    LoansData
                >(page, 'CreateConstantForNFirstInstallmentRateStrategyConfig', 'GetLoans', () =>
                    dialog.getByRole('button', {name: 'Dodaj strategię', exact: true}).click()
                );
                rateStrategyExists = true;
                expect(result.mutation.variables.name).toBe(rateStrategyName);
                expectNumericVariable(result.mutation, 'constantRate', CONSTANT_RATE_PERCENT / 100);
                expectNumericVariable(result.mutation, 'variableRateMargin', VARIABLE_RATE_MARGIN_PERCENT / 100);
                expectNumericVariable(
                    result.mutation,
                    'becomesVariableRateAfterNInstallments',
                    CONSTANT_RATE_INSTALLMENTS
                );
                const created = result.mutation.responseBody.data!.createConstantForNFirstInstallmentRateStrategyConfig;
                expect(created).toMatchObject({
                    name: rateStrategyName,
                    becomesVariableRateAfterNInstallments: CONSTANT_RATE_INSTALLMENTS,
                });
                expect(created.constantRate).toBeCloseTo(CONSTANT_RATE_PERCENT / 100, 8);
                expect(created.variableRateMargin).toBeCloseTo(VARIABLE_RATE_MARGIN_PERCENT / 100, 8);
                expect(result.refetch.loans.rateStrategyConfigs).toHaveLength(initialRateStrategyCount + 1);
                expect(result.refetch.loans.rateStrategyConfigs).toContainEqual(created);
                const createdIndex = result.refetch.loans.rateStrategyConfigs.findIndex(
                    strategy => strategy.publicId === created.publicId
                );
                expect(createdIndex).toBeGreaterThanOrEqual(0);

                const section = sectionByHeading(page, 'Oprocentowanie');
                await expect(section.getByText(`Liczba: ${initialRateStrategyCount + 1}`, {exact: true})).toBeVisible();
                const row = entityRow(section, rateStrategyName);
                await expect(row).toContainText(`${CONSTANT_RATE_PERCENT} %`);
                await expect(row).toContainText(`${CONSTANT_RATE_INSTALLMENTS} miesiącach`);
                await expect(row).toContainText(`${VARIABLE_RATE_MARGIN_PERCENT} %`);
                return {rateStrategy: created, rateStrategyIndex: createdIndex};
            });

            await test.step('anuluje i waliduje utworzenie strategii dnia spłaty bez mutacji', async () => {
                await page.getByRole('button', {name: 'Dodaj sposób wyboru dnia', exact: true}).click();
                const dialog = page.getByRole('dialog', {name: 'Dodaj sposób wyboru dnia spłaty', exact: true});
                await dialog.getByRole('spinbutton', {name: 'Dzień spłaty'}).fill('32');
                await expectNoGraphQlOperation(page, ['CreateNthDayOfMonthRepaymentDayStrategyConfig'], async () => {
                    await dialog.getByRole('button', {name: 'Dodaj strategię', exact: true}).click();
                    await expect(dialog.getByText('Wymagana', {exact: true})).toBeVisible();
                    await expect(dialog.getByRole('spinbutton', {name: 'Dzień spłaty'})).toHaveAttribute(
                        'aria-invalid',
                        'true'
                    );
                    await dialog.getByRole('button', {name: 'Anuluj', exact: true}).click();
                    await expect(dialog).toBeHidden();
                });
            });

            const {repaymentDayStrategy, repaymentDayStrategyIndex} =
                await test.step('tworzy strategię dnia spłaty', async () => {
                    await page.getByRole('button', {name: 'Dodaj sposób wyboru dnia', exact: true}).click();
                    const dialog = page.getByRole('dialog', {name: 'Dodaj sposób wyboru dnia spłaty', exact: true});
                    await dialog.getByRole('textbox', {name: 'Nazwa'}).fill(repaymentDayStrategyName);
                    await dialog.getByRole('spinbutton', {name: 'Dzień spłaty'}).fill(String(REPAYMENT_DAY));
                    const result = await performGraphQlOperationWithRefetch<
                        {createNthDayOfMonthRepaymentDayStrategyConfig: RepaymentDayStrategy},
                        LoansData
                    >(page, 'CreateNthDayOfMonthRepaymentDayStrategyConfig', 'GetLoans', () =>
                        dialog.getByRole('button', {name: 'Dodaj strategię', exact: true}).click()
                    );
                    repaymentDayStrategyExists = true;
                    expect(result.mutation.variables).toEqual({
                        name: repaymentDayStrategyName,
                        dayOfMonth: REPAYMENT_DAY,
                    });
                    const created = result.mutation.responseBody.data!.createNthDayOfMonthRepaymentDayStrategyConfig;
                    expect(created).toMatchObject({name: repaymentDayStrategyName, dayOfMonth: REPAYMENT_DAY});
                    expect(result.refetch.loans.repaymentDayStrategyConfigs).toHaveLength(
                        initialRepaymentDayStrategyCount + 1
                    );
                    expect(result.refetch.loans.repaymentDayStrategyConfigs).toContainEqual(created);
                    const createdIndex = result.refetch.loans.repaymentDayStrategyConfigs.findIndex(
                        strategy => strategy.publicId === created.publicId
                    );
                    expect(createdIndex).toBeGreaterThanOrEqual(0);

                    const section = sectionByHeading(page, 'Dzień spłaty');
                    await expect(
                        section.getByText(`Liczba: ${initialRepaymentDayStrategyCount + 1}`, {exact: true})
                    ).toBeVisible();
                    await expect(entityRow(section, repaymentDayStrategyName)).toContainText(
                        'dwudziesty trzeci dzień miesiąca'
                    );
                    return {repaymentDayStrategy: created, repaymentDayStrategyIndex: createdIndex};
                });

            await test.step('anuluje i waliduje utworzenie pożyczki bez mutacji', async () => {
                await page.getByRole('button', {name: 'Dodaj pożyczkę', exact: true}).click();
                const dialog = page.getByRole('dialog', {name: 'Dodaj pożyczkę', exact: true});
                await expectNoGraphQlOperation(page, ['CreateLoan'], async () => {
                    await dialog.getByRole('button', {name: 'Dodaj pożyczkę', exact: true}).click();
                    await expect(dialog.getByText('Wymagana', {exact: true})).toHaveCount(3);
                    await expect(dialog.getByRole('spinbutton', {name: 'Liczba rat'})).toHaveAttribute(
                        'aria-invalid',
                        'true'
                    );
                    await expect(dialog.getByRole('spinbutton', {name: 'Wypłacona kwota'})).toHaveAttribute(
                        'aria-invalid',
                        'true'
                    );
                    await dialog.getByRole('button', {name: 'Anuluj', exact: true}).click();
                    await expect(dialog).toBeHidden();
                });
            });

            const createdLoan = await test.step('tworzy pożyczkę z pełnymi danymi', async () => {
                await page.getByRole('button', {name: 'Dodaj pożyczkę', exact: true}).click();
                const dialog = page.getByRole('dialog', {name: 'Dodaj pożyczkę', exact: true});
                await dialog.getByRole('textbox', {name: 'Nazwa'}).fill(loanName);
                const paymentDate = await chooseFirstDayOfCurrentMonth(page, dialog);
                await dialog.getByRole('spinbutton', {name: 'Liczba rat'}).fill(String(NUMBER_OF_INSTALLMENTS));
                await dialog.getByRole('spinbutton', {name: 'Wypłacona kwota'}).fill(String(LOAN_AMOUNT));
                await chooseOptionAt(page, dialog.getByRole('combobox', {name: 'Waluta'}), 0);
                await chooseOptionAt(
                    page,
                    dialog.getByRole('combobox', {name: 'Strategia naliczania odsetek'}),
                    rateStrategyIndex
                );
                await chooseOptionAt(
                    page,
                    dialog.getByRole('combobox', {name: 'Strategia wyboru dnia spłaty'}),
                    repaymentDayStrategyIndex
                );

                const result = await performGraphQlOperationWithRefetch<{createLoan: LoanData}, LoansData>(
                    page,
                    'CreateLoan',
                    'GetLoans',
                    () => dialog.getByRole('button', {name: 'Dodaj pożyczkę', exact: true}).click()
                );
                loanExists = true;
                expect(result.mutation.variables).toMatchObject({
                    name: loanName,
                    paymentDate,
                    numberOfInstallments: NUMBER_OF_INSTALLMENTS,
                    paidCurrency: 'PLN',
                    rateStrategyConfigId: rateStrategy.publicId,
                    repaymentDayStrategyConfigId: repaymentDayStrategy.publicId,
                });
                expectNumericVariable(result.mutation, 'paidAmount', LOAN_AMOUNT);
                const created = result.mutation.responseBody.data!.createLoan;
                expect(created).toMatchObject({
                    name: loanName,
                    paymentDate,
                    numberOfInstallments: NUMBER_OF_INSTALLMENTS,
                    rateStrategyConfig: {publicId: rateStrategy.publicId},
                    repaymentDayStrategyConfig: {publicId: repaymentDayStrategy.publicId},
                    paidAmount: {currency: {code: 'PLN'}},
                });
                expect(created.paidAmount.amount).toBeCloseTo(LOAN_AMOUNT, 8);
                expect(result.refetch.loans.loans).toHaveLength(initialLoanCount + 1);
                expect(result.refetch.loans.loans.find(loan => loan.publicId === created.publicId)).toMatchObject({
                    name: loanName,
                    paymentDate,
                    numberOfInstallments: NUMBER_OF_INSTALLMENTS,
                });

                const section = sectionByHeading(page, 'Twoje pożyczki');
                await expect(section.getByText(`Liczba: ${initialLoanCount + 1}`, {exact: true})).toBeVisible();
                const row = entityRow(section, loanName);
                await expect(row).toContainText(await formatMoney(page, LOAN_AMOUNT, 'PLN'));
                await expect(row).toContainText(`Oprocentowanie stałe ${CONSTANT_RATE_PERCENT} %`);
                await expect(row).toContainText(`${CONSTANT_RATE_INSTALLMENTS} miesiącach`);
                await expect(row).toContainText(`marżą ${VARIABLE_RATE_MARGIN_PERCENT} %`);
                await expect(row).toContainText('dwudziesty trzeci dzień miesiąca');
                return created;
            });

            await test.step('otwiera szczegóły pożyczki i wraca do listy', async () => {
                const singleLoan = await performGraphQlOperation<SingleLoanData>(page, 'SingleLoan', () =>
                    entityRow(sectionByHeading(page, 'Twoje pożyczki'), loanName)
                        .getByText(loanName, {exact: true})
                        .click()
                );
                expect(singleLoan.variables).toEqual({loanId: createdLoan.publicId});
                expect(singleLoan.responseBody.data!.singleLoan.publicId).toBe(createdLoan.publicId);
                await expect(page).toHaveURL(new RegExp(`/loans/${createdLoan.publicId}$`));
                await expect(page.getByRole('heading', {name: loanName, exact: true})).toBeVisible();
                await expect(page.getByText('Pozostały kapitał', {exact: true}).first().locator('..')).toContainText(
                    await formatMoney(page, LOAN_AMOUNT, 'PLN')
                );
                await expect(page.getByText('Kwota początkowa', {exact: true}).locator('..')).toContainText(
                    await formatMoney(page, LOAN_AMOUNT, 'PLN')
                );
                await expect(page.getByText('Liczba rat', {exact: true}).locator('..')).toContainText(
                    String(NUMBER_OF_INSTALLMENTS)
                );
                await expect(page.getByText(rateStrategyName, {exact: true})).toBeVisible();
                await expect(page.getByText(repaymentDayStrategyName, {exact: true})).toBeVisible();
                await page.getByRole('button', {name: 'Wróć do pożyczek', exact: true}).click();
                await expect(page).toHaveURL(/\/loans$/);
                await expect(page.getByRole('heading', {name: 'Pożyczki', exact: true})).toBeVisible();

                await entityRow(sectionByHeading(page, 'Twoje pożyczki'), loanName)
                    .getByText(loanName, {exact: true})
                    .click();
                await expect(page).toHaveURL(new RegExp(`/loans/${createdLoan.publicId}$`));
                await expect(page.getByRole('heading', {name: loanName, exact: true})).toBeVisible();
            });

            await test.step('anuluje i waliduje edycję nazwy bez mutacji', async () => {
                await page.getByRole('button', {name: 'Edytuj nazwę pożyczki', exact: true}).click();
                const dialog = page.getByRole('dialog', {name: 'Edytuj nazwę pożyczki', exact: true});
                await dialog.getByRole('textbox', {name: 'Nazwa'}).clear();
                await expectNoGraphQlOperation(page, ['UpdateLoan'], async () => {
                    await dialog.getByRole('button', {name: 'Zapisz zmiany', exact: true}).click();
                    await expect(dialog.getByText('Wymagana', {exact: true})).toBeVisible();
                    await dialog.getByRole('button', {name: 'Anuluj', exact: true}).click();
                    await expect(dialog).toBeHidden();
                });
                await expect(page.getByRole('heading', {name: loanName, exact: true})).toBeVisible();
            });

            await test.step('zmienia nazwę pożyczki i odświeża szczegóły', async () => {
                await page.getByRole('button', {name: 'Edytuj nazwę pożyczki', exact: true}).click();
                const dialog = page.getByRole('dialog', {name: 'Edytuj nazwę pożyczki', exact: true});
                await dialog.getByRole('textbox', {name: 'Nazwa'}).fill(updatedLoanName);
                const result = await performGraphQlOperationWithRefetch<{updateLoan: LoanData}, SingleLoanData>(
                    page,
                    'UpdateLoan',
                    'SingleLoan',
                    () => dialog.getByRole('button', {name: 'Zapisz zmiany', exact: true}).click()
                );
                currentLoanName = updatedLoanName;
                expect(result.mutation.variables).toEqual({loanId: createdLoan.publicId, name: updatedLoanName});
                expect(result.mutation.responseBody.data!.updateLoan).toMatchObject({
                    publicId: createdLoan.publicId,
                    name: updatedLoanName,
                });
                expect(result.refetch.singleLoan.name).toBe(updatedLoanName);
                await expect(page.getByRole('heading', {name: updatedLoanName, exact: true})).toBeVisible();
                const persistedLoanPromise = waitForGraphQlData<SingleLoanData>(page, 'SingleLoan');
                await page.reload();
                const persistedLoan = await persistedLoanPromise;
                expect(persistedLoan.singleLoan).toMatchObject({
                    publicId: createdLoan.publicId,
                    name: updatedLoanName,
                });
                await expect(page.getByRole('heading', {name: updatedLoanName, exact: true})).toBeVisible();
            });

            await test.step('anuluje i waliduje rejestrację raty bez mutacji', async () => {
                await page.getByRole('button', {name: 'Zarejestruj ratę', exact: true}).click();
                const dialog = page.getByRole('dialog', {name: 'Zarejestruj spłatę raty', exact: true});
                await dialog.getByRole('spinbutton', {name: 'Spłacone odsetki'}).fill('-1');
                await dialog.getByRole('spinbutton', {name: 'Spłacony kapitał'}).fill('-1');
                await dialog.getByRole('spinbutton', {name: 'Nadpłata'}).fill('-1');
                await expectNoGraphQlOperation(page, ['CreateInstallment'], async () => {
                    await dialog.getByRole('button', {name: 'Zarejestruj ratę', exact: true}).click();
                    await expect(dialog.getByRole('spinbutton', {name: 'Spłacone odsetki'})).toHaveAttribute(
                        'aria-invalid',
                        'true'
                    );
                    await expect(dialog.getByRole('spinbutton', {name: 'Spłacony kapitał'})).toHaveAttribute(
                        'aria-invalid',
                        'true'
                    );
                    await expect(dialog.getByRole('spinbutton', {name: 'Nadpłata'})).toHaveAttribute(
                        'aria-invalid',
                        'true'
                    );
                    await dialog.getByRole('button', {name: 'Anuluj', exact: true}).click();
                    await expect(dialog).toBeHidden();
                });
                await expect(
                    sectionByHeading(page, 'Historia spłat').getByText('Liczba: 0', {exact: true})
                ).toBeVisible();
            });

            const createdInstallment =
                await test.step('rejestruje ratę i aktualizuje kapitał oraz historię', async () => {
                    await page.getByRole('button', {name: 'Zarejestruj ratę', exact: true}).click();
                    const dialog = page.getByRole('dialog', {name: 'Zarejestruj spłatę raty', exact: true});
                    const paidAt = await chooseFirstDayOfCurrentMonth(page, dialog);
                    await dialog.getByRole('spinbutton', {name: 'Spłacone odsetki'}).fill(String(REPAID_INTEREST));
                    await dialog.getByRole('spinbutton', {name: 'Spłacony kapitał'}).fill(String(REPAID_CAPITAL));
                    await dialog.getByRole('spinbutton', {name: 'Nadpłata'}).fill(String(OVERPAYMENT));
                    const result = await performGraphQlOperationWithRefetch<
                        {createInstallment: Installment},
                        SingleLoanData
                    >(page, 'CreateInstallment', 'SingleLoan', () =>
                        dialog.getByRole('button', {name: 'Zarejestruj ratę', exact: true}).click()
                    );
                    expect(result.mutation.variables).toMatchObject({
                        loanId: createdLoan.publicId,
                        paidAt,
                        currency: 'PLN',
                    });
                    expectNumericVariable(result.mutation, 'repaidInterest', REPAID_INTEREST);
                    expectNumericVariable(result.mutation, 'repaidAmount', REPAID_CAPITAL);
                    expectNumericVariable(result.mutation, 'overpayment', OVERPAYMENT);
                    const created = result.mutation.responseBody.data!.createInstallment;
                    expect(created).toMatchObject({paidAt});
                    expect(created.repaidInterest.amount).toBeCloseTo(REPAID_INTEREST, 8);
                    expect(created.repaidAmount.amount).toBeCloseTo(REPAID_CAPITAL, 8);
                    expect(created.overpayment.amount).toBeCloseTo(OVERPAYMENT, 8);
                    expect(result.refetch.singleLoan.installments).toContainEqual(created);

                    const remainingCapital = LOAN_AMOUNT - REPAID_CAPITAL - OVERPAYMENT;
                    await expect(
                        page.getByText('Pozostały kapitał', {exact: true}).first().locator('..')
                    ).toContainText(await formatMoney(page, remainingCapital, 'PLN'));
                    const historySection = sectionByHeading(page, 'Historia spłat');
                    await expect(historySection.getByText('Liczba: 1', {exact: true})).toBeVisible();
                    const row = historySection
                        .getByRole('row')
                        .filter({hasText: formatTableDate(paidAt)})
                        .first();
                    await expect(row).toContainText(await formatMoney(page, REPAID_INTEREST + REPAID_CAPITAL, 'PLN'));
                    await expect(row).toContainText(await formatMoney(page, REPAID_INTEREST, 'PLN'));
                    await expect(row).toContainText(await formatMoney(page, REPAID_CAPITAL, 'PLN'));
                    await expect(row).toContainText(await formatMoney(page, OVERPAYMENT, 'PLN'));
                    await expect(row).toContainText(await formatMoney(page, remainingCapital, 'PLN'));
                    const footerCells = historySection.locator('tfoot').getByRole('cell');
                    await expect(footerCells.nth(1)).toContainText(
                        await formatMoney(page, REPAID_INTEREST + REPAID_CAPITAL, 'PLN')
                    );
                    await expect(footerCells.nth(2)).toContainText(await formatMoney(page, REPAID_INTEREST, 'PLN'));
                    await expect(footerCells.nth(3)).toContainText(await formatMoney(page, REPAID_CAPITAL, 'PLN'));
                    await expect(footerCells.nth(4)).toContainText(await formatMoney(page, OVERPAYMENT, 'PLN'));
                    await expect(footerCells.nth(5)).toContainText(
                        await formatMoney(page, REPAID_INTEREST + REPAID_CAPITAL + OVERPAYMENT, 'PLN')
                    );
                    return created;
                });

            await test.step('anuluje i waliduje parametry symulacji bez zapytania', async () => {
                await page.getByRole('button', {name: 'Symuluj spłatę', exact: true}).click();
                const dialog = page.getByRole('dialog', {name: 'Parametry symulacji spłaty', exact: true});
                await dialog.getByRole('spinbutton', {name: 'Dodatkowy budżet miesięczny'}).fill('-1');
                await dialog.getByRole('spinbutton', {name: 'Dodatkowy budżet roczny'}).fill('-1');
                await expectNoGraphQlOperation(page, ['SimulateExistingLoan'], async () => {
                    await dialog.getByRole('button', {name: 'Pokaż symulację', exact: true}).click();
                    await expect(dialog.getByRole('spinbutton', {name: 'Dodatkowy budżet miesięczny'})).toHaveAttribute(
                        'aria-invalid',
                        'true'
                    );
                    await expect(dialog.getByRole('spinbutton', {name: 'Dodatkowy budżet roczny'})).toHaveAttribute(
                        'aria-invalid',
                        'true'
                    );
                    await dialog.getByRole('button', {name: 'Anuluj', exact: true}).click();
                    await expect(dialog).toBeHidden();
                });
                await expect(page.getByRole('heading', {name: 'Symulacja spłaty', exact: true})).toHaveCount(0);
            });

            await test.step('symuluje spłatę i pokazuje wyliczone kwoty', async () => {
                await page.getByRole('button', {name: 'Symuluj spłatę', exact: true}).click();
                const dialog = page.getByRole('dialog', {name: 'Parametry symulacji spłaty', exact: true});
                await dialog
                    .getByRole('spinbutton', {name: 'Dodatkowy budżet miesięczny'})
                    .fill(String(MONTHLY_SIMULATION_BUDGET));
                await dialog
                    .getByRole('spinbutton', {name: 'Dodatkowy budżet roczny'})
                    .fill(String(YEARLY_SIMULATION_BUDGET));
                const simulationPromise = performGraphQlOperation<SimulationData>(page, 'SimulateExistingLoan', () =>
                    dialog.getByRole('button', {name: 'Pokaż symulację', exact: true}).click()
                );
                const simulation = await simulationPromise;
                expect(simulation.variables).toMatchObject({loanId: createdLoan.publicId});
                expect(Number((simulation.variables.monthlyBudget as {amount: unknown}).amount)).toBeCloseTo(
                    MONTHLY_SIMULATION_BUDGET,
                    8
                );
                expect((simulation.variables.monthlyBudget as {currency: string}).currency).toBe('PLN');
                expect(Number((simulation.variables.yearlyOverpayment as {amount: unknown}).amount)).toBeCloseTo(
                    YEARLY_SIMULATION_BUDGET,
                    8
                );
                expect((simulation.variables.yearlyOverpayment as {currency: string}).currency).toBe('PLN');
                const installments = simulation.responseBody.data!.simulateExistingLoan;
                expect(installments.length).toBeGreaterThan(0);

                const first = [...installments].sort((left, right) =>
                    left.paymentFrom.localeCompare(right.paymentFrom)
                )[0];
                const repaidCapital = first.installment - first.paidInterest;
                const remainingBeforeSimulation = LOAN_AMOUNT - REPAID_CAPITAL - OVERPAYMENT;
                const remainingAfterFirstInstallment = remainingBeforeSimulation - repaidCapital - first.overpayment;
                const simulationSection = sectionByHeading(page, 'Symulacja spłaty');
                const firstRow = simulationSection
                    .getByRole('row')
                    .filter({hasText: formatTableDate(first.paymentTo)})
                    .first();
                await expect(firstRow).toContainText(await formatMoney(page, first.installment, 'PLN'));
                await expect(firstRow).toContainText(await formatMoney(page, first.paidInterest, 'PLN'));
                await expect(firstRow).toContainText(await formatMoney(page, repaidCapital, 'PLN'));
                if (first.overpayment > 0) {
                    await expect(firstRow).toContainText(await formatMoney(page, first.overpayment, 'PLN'));
                }
                await expect(firstRow).toContainText(await formatMoney(page, remainingAfterFirstInstallment, 'PLN'));
                await expect(simulationSection.locator('tbody').getByRole('row')).toHaveCount(installments.length);
                const totalInstallments = installments.reduce(
                    (total, installment) => total + installment.installment,
                    0
                );
                const totalInterest = installments.reduce((total, installment) => total + installment.paidInterest, 0);
                const totalCapital = installments.reduce(
                    (total, installment) => total + installment.installment - installment.paidInterest,
                    0
                );
                const totalOverpayment = installments.reduce(
                    (total, installment) => total + installment.overpayment,
                    0
                );
                const footerCells = simulationSection.locator('tfoot').getByRole('cell');
                await expect(footerCells.nth(1)).toContainText(await formatMoney(page, totalInstallments, 'PLN'));
                await expect(footerCells.nth(2)).toContainText(await formatMoney(page, totalInterest, 'PLN'));
                await expect(footerCells.nth(3)).toContainText(await formatMoney(page, totalCapital, 'PLN'));
                await expect(footerCells.nth(4)).toContainText(await formatMoney(page, totalOverpayment, 'PLN'));
                await expect(footerCells.nth(5)).toContainText(
                    await formatMoney(page, totalInstallments + totalOverpayment, 'PLN')
                );
            });

            await test.step('anuluje usunięcie pożyczki na szczegółach bez mutacji', async () => {
                await page.getByRole('button', {name: 'Usuń pożyczkę', exact: true}).click();
                const dialog = page.getByRole('dialog', {name: 'Usunąć pożyczkę?', exact: true});
                await expect(dialog).toContainText(updatedLoanName);
                await expectNoGraphQlOperation(page, ['DeleteLoan'], async () => {
                    await dialog.getByRole('button', {name: 'Anuluj', exact: true}).click();
                    await expect(dialog).toBeHidden();
                });
                await expect(page.getByRole('heading', {name: updatedLoanName, exact: true})).toBeVisible();
                expect(createdInstallment.publicId).toBeTruthy();
            });

            await test.step('wraca do listy i anuluje usuwanie pożyczki bez mutacji', async () => {
                const [refreshedList] = await Promise.all([
                    waitForGraphQlData<LoansData>(page, 'GetLoans'),
                    page.getByRole('button', {name: 'Wróć do pożyczek', exact: true}).click(),
                ]);
                await expect(page.getByRole('heading', {name: 'Pożyczki', exact: true})).toBeVisible();
                expect(refreshedList.loans.loans.find(loan => loan.publicId === createdLoan.publicId)).toMatchObject({
                    name: updatedLoanName,
                    installments: [{publicId: createdInstallment.publicId}],
                });
                const section = sectionByHeading(page, 'Twoje pożyczki');
                await entityRow(section, updatedLoanName)
                    .getByRole('button', {name: `Usuń pożyczkę ${updatedLoanName}`, exact: true})
                    .click();
                const dialog = page.getByRole('dialog', {name: 'Usunąć pożyczkę?', exact: true});
                await expectNoGraphQlOperation(page, ['DeleteLoan'], async () => {
                    await dialog.getByRole('button', {name: 'Anuluj', exact: true}).click();
                    await expect(dialog).toBeHidden();
                });
                await expect(section.getByText(updatedLoanName, {exact: true})).toBeVisible();
            });

            await test.step('usuwa pożyczkę z listy i aktualizuje licznik', async () => {
                const section = sectionByHeading(page, 'Twoje pożyczki');
                await entityRow(section, updatedLoanName)
                    .getByRole('button', {name: `Usuń pożyczkę ${updatedLoanName}`, exact: true})
                    .click();
                const dialog = page.getByRole('dialog', {name: 'Usunąć pożyczkę?', exact: true});
                const result = await performGraphQlOperationWithRefetch<{deleteLoan: string}, LoansData>(
                    page,
                    'DeleteLoan',
                    'GetLoans',
                    () => dialog.getByRole('button', {name: 'Usuń', exact: true}).click()
                );
                loanExists = false;
                expect(result.mutation.variables).toEqual({loanId: createdLoan.publicId});
                expect(result.mutation.responseBody.data!.deleteLoan).toBeTruthy();
                expect(result.refetch.loans.loans).toHaveLength(initialLoanCount);
                expect(result.refetch.loans.loans.some(loan => loan.publicId === createdLoan.publicId)).toBeFalsy();
                await expect(section.getByText(updatedLoanName, {exact: true})).toHaveCount(0);
                await expect(section.getByText(`Liczba: ${initialLoanCount}`, {exact: true})).toBeVisible();
            });

            await test.step('tworzy drugą pożyczkę i usuwa ją ze strony szczegółów', async () => {
                await page.getByRole('button', {name: 'Dodaj pożyczkę', exact: true}).click();
                const createDialog = page.getByRole('dialog', {name: 'Dodaj pożyczkę', exact: true});
                await createDialog.getByRole('textbox', {name: 'Nazwa'}).fill(detailsDeletionLoanName);
                const paymentDate = await chooseFirstDayOfCurrentMonth(page, createDialog);
                await createDialog.getByRole('spinbutton', {name: 'Liczba rat'}).fill('12');
                await createDialog.getByRole('spinbutton', {name: 'Wypłacona kwota'}).fill('1000');
                await chooseOptionAt(page, createDialog.getByRole('combobox', {name: 'Waluta'}), 0);
                await chooseOptionAt(
                    page,
                    createDialog.getByRole('combobox', {name: 'Strategia naliczania odsetek'}),
                    rateStrategyIndex
                );
                await chooseOptionAt(
                    page,
                    createDialog.getByRole('combobox', {name: 'Strategia wyboru dnia spłaty'}),
                    repaymentDayStrategyIndex
                );
                const creation = await performGraphQlOperationWithRefetch<{createLoan: LoanData}, LoansData>(
                    page,
                    'CreateLoan',
                    'GetLoans',
                    () => createDialog.getByRole('button', {name: 'Dodaj pożyczkę', exact: true}).click()
                );
                loanExists = true;
                currentLoanName = detailsDeletionLoanName;
                const loanToDelete = creation.mutation.responseBody.data!.createLoan;
                expect(creation.mutation.variables).toMatchObject({
                    name: detailsDeletionLoanName,
                    paymentDate,
                    numberOfInstallments: 12,
                    paidCurrency: 'PLN',
                    rateStrategyConfigId: rateStrategy.publicId,
                    repaymentDayStrategyConfigId: repaymentDayStrategy.publicId,
                });
                expectNumericVariable(creation.mutation, 'paidAmount', 1000);
                expect(creation.refetch.loans.loans).toHaveLength(initialLoanCount + 1);

                const singleLoan = await performGraphQlOperation<SingleLoanData>(page, 'SingleLoan', () =>
                    entityRow(sectionByHeading(page, 'Twoje pożyczki'), detailsDeletionLoanName)
                        .getByText(detailsDeletionLoanName, {exact: true})
                        .click()
                );
                expect(singleLoan.variables).toEqual({loanId: loanToDelete.publicId});
                expect(singleLoan.responseBody.data!.singleLoan.name).toBe(detailsDeletionLoanName);

                await page.getByRole('button', {name: 'Usuń pożyczkę', exact: true}).click();
                const deleteDialog = page.getByRole('dialog', {name: 'Usunąć pożyczkę?', exact: true});
                await expect(deleteDialog).toContainText(detailsDeletionLoanName);
                const deletion = await performGraphQlOperation<{deleteLoan: string}>(page, 'DeleteLoan', () =>
                    deleteDialog.getByRole('button', {name: 'Usuń', exact: true}).click()
                );
                loanExists = false;
                expect(deletion.variables).toEqual({loanId: loanToDelete.publicId});
                expect(deletion.responseBody.data!.deleteLoan).toBeTruthy();
                await expect(page).toHaveURL(/\/loans$/);
                await expect(page.getByRole('heading', {name: 'Pożyczki', exact: true})).toBeVisible();

                const persistedList = await openLoansPage(page, domainPublicId);
                expect(persistedList.loans.loans).toHaveLength(initialLoanCount);
                expect(persistedList.loans.loans.some(loan => loan.publicId === loanToDelete.publicId)).toBeFalsy();
                await expect(
                    sectionByHeading(page, 'Twoje pożyczki').getByText(detailsDeletionLoanName, {exact: true})
                ).toHaveCount(0);
            });

            await test.step('anuluje usunięcie obu strategii bez mutacji', async () => {
                const rateSection = sectionByHeading(page, 'Oprocentowanie');
                await entityRow(rateSection, rateStrategyName)
                    .getByRole('button', {name: `Usuń sposób naliczania ${rateStrategyName}`, exact: true})
                    .click();
                const rateDialog = page.getByRole('dialog', {name: 'Usunąć sposób naliczania?', exact: true});
                await expectNoGraphQlOperation(page, ['DeleteRateStrategyConfig'], async () => {
                    await rateDialog.getByRole('button', {name: 'Anuluj', exact: true}).click();
                    await expect(rateDialog).toBeHidden();
                });

                const repaymentSection = sectionByHeading(page, 'Dzień spłaty');
                await entityRow(repaymentSection, repaymentDayStrategyName)
                    .getByRole('button', {
                        name: `Usuń sposób wyboru dnia ${repaymentDayStrategyName}`,
                        exact: true,
                    })
                    .click();
                const repaymentDialog = page.getByRole('dialog', {name: 'Usunąć sposób wyboru dnia?', exact: true});
                await expectNoGraphQlOperation(page, ['DeleteRepaymentDayStrategyConfig'], async () => {
                    await repaymentDialog.getByRole('button', {name: 'Anuluj', exact: true}).click();
                    await expect(repaymentDialog).toBeHidden();
                });
            });

            await test.step('usuwa strategię oprocentowania i aktualizuje licznik', async () => {
                const section = sectionByHeading(page, 'Oprocentowanie');
                await entityRow(section, rateStrategyName)
                    .getByRole('button', {name: `Usuń sposób naliczania ${rateStrategyName}`, exact: true})
                    .click();
                const dialog = page.getByRole('dialog', {name: 'Usunąć sposób naliczania?', exact: true});
                const result = await performGraphQlOperationWithRefetch<{deleteRateStrategyConfig: string}, LoansData>(
                    page,
                    'DeleteRateStrategyConfig',
                    'GetLoans',
                    () => dialog.getByRole('button', {name: 'Usuń', exact: true}).click()
                );
                rateStrategyExists = false;
                expect(result.mutation.variables).toEqual({publicId: rateStrategy.publicId});
                expect(result.mutation.responseBody.data!.deleteRateStrategyConfig).toBeTruthy();
                expect(result.refetch.loans.rateStrategyConfigs).toHaveLength(initialRateStrategyCount);
                expect(
                    result.refetch.loans.rateStrategyConfigs.some(
                        strategy => strategy.publicId === rateStrategy.publicId
                    )
                ).toBeFalsy();
                await expect(section.getByText(rateStrategyName, {exact: true})).toHaveCount(0);
                await expect(section.getByText(`Liczba: ${initialRateStrategyCount}`, {exact: true})).toBeVisible();
            });

            await test.step('usuwa strategię dnia spłaty i przywraca stan początkowy', async () => {
                const section = sectionByHeading(page, 'Dzień spłaty');
                await entityRow(section, repaymentDayStrategyName)
                    .getByRole('button', {
                        name: `Usuń sposób wyboru dnia ${repaymentDayStrategyName}`,
                        exact: true,
                    })
                    .click();
                const dialog = page.getByRole('dialog', {name: 'Usunąć sposób wyboru dnia?', exact: true});
                const result = await performGraphQlOperationWithRefetch<
                    {deleteRepaymentDayStrategyConfig: string},
                    LoansData
                >(page, 'DeleteRepaymentDayStrategyConfig', 'GetLoans', () =>
                    dialog.getByRole('button', {name: 'Usuń', exact: true}).click()
                );
                repaymentDayStrategyExists = false;
                expect(result.mutation.variables).toEqual({publicId: repaymentDayStrategy.publicId});
                expect(result.mutation.responseBody.data!.deleteRepaymentDayStrategyConfig).toBeTruthy();
                expect(result.refetch.loans.repaymentDayStrategyConfigs).toHaveLength(initialRepaymentDayStrategyCount);
                expect(
                    result.refetch.loans.repaymentDayStrategyConfigs.some(
                        strategy => strategy.publicId === repaymentDayStrategy.publicId
                    )
                ).toBeFalsy();
                await expect(section.getByText(repaymentDayStrategyName, {exact: true})).toHaveCount(0);
                await expect(
                    section.getByText(`Liczba: ${initialRepaymentDayStrategyCount}`, {exact: true})
                ).toBeVisible();
            });
        } finally {
            if (domainPublicId && (loanExists || rateStrategyExists || repaymentDayStrategyExists)) {
                try {
                    await cleanLoanData(
                        page,
                        domainPublicId,
                        [currentLoanName, loanName, updatedLoanName, detailsDeletionLoanName],
                        rateStrategyName,
                        repaymentDayStrategyName
                    );
                } catch (error) {
                    addCleanupFailure(testInfo, 'nie udało się usunąć danych testowych strony pożyczek', error);
                }
            }
        }
    });
});
