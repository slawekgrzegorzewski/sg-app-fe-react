import {expect, type Locator, type Page, test} from '@playwright/test';
import {login, openAccountantPage, performGraphQlOperation, RUN_ID} from './support/data-interactions';

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

test.describe('ustawienia księgowości', () => {
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
});
