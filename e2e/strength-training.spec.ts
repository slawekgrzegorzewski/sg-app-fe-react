/* eslint-disable testing-library/prefer-screen-queries, jest/valid-expect -- Playwright Page locators are intentional in E2E tests; expect messages are supported by Playwright. */
import {expect, test} from '@playwright/test';
import {
    chooseMatchingOption,
    login,
    performGraphQlOperation,
    RUN_ID,
    waitForGraphQlData,
} from './support/data-interactions';

type CatalogData = {
    strengthTraining: {
        exerciseFamilies: Array<{
            name: string;
            scope: string;
            dimensions: Array<{variantDimension: {name: string}; allowedValues: Array<{variantValue: {name: string}}>}>;
        }>;
        variantDimensions: Array<{name: string; scope: string; values: Array<{name: string}>}>;
    };
};

test.describe('trening siłowy', () => {
    test('chroni katalog systemowy i pozwala rozszerzyć go danymi domeny', async ({page}) => {
        const domainPublicId = await login(page);
        const familyName = `E2E przysiad ${RUN_ID}`;
        const dimensionName = `E2E stanowisko ${RUN_ID}`;
        const valueName = `E2E stojak ${RUN_ID}`;

        const initialCatalogPromise = waitForGraphQlData<CatalogData>(page, 'GetStrengthTrainingExerciseCatalog');
        await page.goto(`/STRENGTH_TRAINING/${domainPublicId}/catalog`);
        await expect(page.getByRole('heading', {name: 'Katalog ćwiczeń'})).toBeVisible();
        const initialCatalog = await initialCatalogPromise;

        const systemFamily = initialCatalog.strengthTraining.exerciseFamilies.find(item => item.scope === 'SYSTEM');
        const systemDimension = initialCatalog.strengthTraining.variantDimensions.find(item => item.scope === 'SYSTEM');
        expect(systemFamily, 'Baza E2E powinna zawierać systemową rodzinę ćwiczeń').toBeDefined();
        expect(systemDimension, 'Baza E2E powinna zawierać systemowy wymiar wariantu').toBeDefined();

        await expect(page.getByText('Systemowa', {exact: true}).first()).toBeVisible();
        await expect(
            page.getByRole('button', {name: `Konfiguruj warianty ćwiczenia ${systemFamily!.name}`})
        ).toBeVisible();
        await expect(page.getByRole('button', {name: 'Edytuj'})).toHaveCount(0);
        await expect(page.getByRole('button', {name: 'Usuń'})).toHaveCount(0);

        await page.getByRole('button', {name: `Otwórz wartości wariantu ${systemDimension!.name}`}).click();
        await expect(page.getByRole('heading', {name: systemDimension!.name, exact: true})).toBeVisible();
        await expect(page.getByText('Systemowa', {exact: true}).first()).toBeVisible();
        await expect(page.getByRole('button', {name: 'Dodaj wartość', exact: true})).toHaveCount(0);
        await page.getByRole('button', {name: 'Powrót do katalogu', exact: true}).click();

        await page.getByRole('button', {name: 'Dodaj ćwiczenie', exact: true}).click();
        const familyDialog = page.getByRole('dialog', {name: 'Dodaj ćwiczenie', exact: true});
        await familyDialog.getByLabel('Nazwa').fill(familyName);
        await familyDialog.getByRole('combobox', {name: 'Typ ćwiczenia'}).click();
        await page.getByRole('listbox').getByRole('option', {name: 'Ciężar i powtórzenia'}).click();
        const familyCreatedPromise = waitForGraphQlData<CatalogData>(page, 'GetStrengthTrainingExerciseCatalog');
        await performGraphQlOperation(page, 'CreateStrengthTrainingExerciseFamily', () =>
            familyDialog.getByRole('button', {name: 'Dodaj ćwiczenie', exact: true}).click()
        );
        await familyCreatedPromise;
        await expect(page.getByText(familyName, {exact: true})).toBeVisible();

        await page.getByRole('button', {name: 'Dodaj wariant', exact: true}).click();
        const dimensionDialog = page.getByRole('dialog', {name: 'Dodaj wariant', exact: true});
        await dimensionDialog.getByLabel('Nazwa').fill(dimensionName);
        const dimensionCreatedPromise = waitForGraphQlData<CatalogData>(page, 'GetStrengthTrainingExerciseCatalog');
        await performGraphQlOperation(page, 'CreateStrengthTrainingVariantDimension', () =>
            dimensionDialog.getByRole('button', {name: 'Dodaj wariant', exact: true}).click()
        );
        await dimensionCreatedPromise;
        await expect(page.getByText(dimensionName, {exact: true})).toBeVisible();

        await page.getByRole('button', {name: `Konfiguruj warianty ćwiczenia ${familyName}`}).click();
        await expect(page.getByRole('heading', {name: familyName, exact: true})).toBeVisible();
        await page.getByRole('button', {name: 'Dodaj wariant', exact: true}).click();
        const assignDialog = page.getByRole('dialog', {name: 'Dodaj przypisany wariant', exact: true});
        await chooseMatchingOption(
            page,
            assignDialog.getByRole('combobox', {name: 'Wariant'}),
            new RegExp(`^${dimensionName}$`)
        );
        const position = assignDialog.getByLabel('Pozycja');
        await position.fill('1');
        const assignedPromise = waitForGraphQlData<CatalogData>(page, 'GetStrengthTrainingExerciseCatalog');
        await performGraphQlOperation(page, 'AssignStrengthTrainingDimensionToFamily', () =>
            assignDialog.getByRole('button', {name: 'Dodaj wariant', exact: true}).click()
        );
        await assignedPromise;
        await expect(page.getByText(dimensionName, {exact: true})).toBeVisible();

        await page.getByText(dimensionName, {exact: true}).click();
        const familyValuesDialog = page.getByRole('dialog', {name: /Możliwe wartości wariantu/});
        await expect(familyValuesDialog).toBeVisible();
        await familyValuesDialog.getByRole('button', {name: 'Anuluj', exact: true}).click();
        await page.getByRole('button', {name: 'Powrót do katalogu', exact: true}).click();
        await page.getByRole('button', {name: `Otwórz wartości wariantu ${dimensionName}`}).click();
        await page.getByRole('button', {name: 'Dodaj wartość', exact: true}).click();
        const valueDialog = page.getByRole('dialog', {name: 'Dodaj wartość', exact: true});
        await valueDialog.getByLabel('Nazwa').fill(valueName);
        const valueCreatedPromise = waitForGraphQlData<CatalogData>(page, 'GetStrengthTrainingExerciseCatalog');
        await performGraphQlOperation(page, 'CreateStrengthTrainingVariantValue', () =>
            valueDialog.getByRole('button', {name: 'Dodaj wartość', exact: true}).click()
        );
        await valueCreatedPromise;
        await expect(page.getByText(valueName, {exact: true})).toBeVisible();

        await page.getByRole('button', {name: 'Powrót do katalogu', exact: true}).click();
        await page.getByRole('button', {name: `Konfiguruj warianty ćwiczenia ${familyName}`}).click();
        await page.getByText(dimensionName, {exact: true}).click();
        const configuredValuesDialog = page.getByRole('dialog', {name: /Możliwe wartości wariantu/});
        const ownValueCheckbox = configuredValuesDialog.getByRole('checkbox', {name: valueName});
        await ownValueCheckbox.check();
        await configuredValuesDialog.getByRole('checkbox', {name: 'Domyślna'}).check();
        const catalogAfterConfigurationPromise = waitForGraphQlData<CatalogData>(
            page,
            'GetStrengthTrainingExerciseCatalog'
        );
        await performGraphQlOperation(page, 'SetAllowedStrengthTrainingVariantValues', () =>
            configuredValuesDialog.getByRole('button', {name: 'Zapisz', exact: true}).click()
        );
        await catalogAfterConfigurationPromise;
        await expect(page.getByText(`${valueName} (domyślna)`, {exact: true})).toBeVisible();
    });
});
