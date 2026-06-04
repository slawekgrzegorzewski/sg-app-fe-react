import {GQLAccount, GQLBankTransactionToImport} from "../model/types";
import Decimal from "decimal.js";
import {BillingElementDTO} from "../CreateBillingElementForm";
import {TransferDTO} from "../CreateTransferForm";

export type GQLBankTransactionToCustomImportSummary = {
    bankAccountPublicId: string;
    balanceFromImportingTransactions: Decimal;
    balanceAfterImport: Decimal;
    currency: string;
    rows: GQLBankTransactionToImport[];
};

export function transactionCustomImportSummary(bankTransactionsToImport: GQLBankTransactionToImport[],
                                               accountsWithAssignedBankAccounts: GQLAccount[],
                                               billingElements: BillingElementDTO[],
                                               transfers: TransferDTO[]
): GQLBankTransactionToCustomImportSummary[] {

    const findAccount = (accountPublicId: string) => {
        return accountsWithAssignedBankAccounts.filter(account => account.publicId === accountPublicId);
    }

    const map = new Map<string, GQLBankTransactionToCustomImportSummary>();
    for (const item of bankTransactionsToImport) {
        const creditKey = item.creditBankAccountPublicId;
        if (creditKey) {
            const creditGroup = map.get(creditKey);
            if (!creditGroup) {
                map.set(creditKey, {
                    bankAccountPublicId: creditKey,
                    balanceFromImportingTransactions: item.credit,
                    balanceAfterImport: item.credit,
                    currency: accountsWithAssignedBankAccounts.filter(account => account.bankAccount.publicId === creditKey)![0].currentBalance.currency.code,
                    rows: [item],
                });
            } else {
                creditGroup.balanceFromImportingTransactions = creditGroup.balanceFromImportingTransactions.plus(item.credit);
                creditGroup.balanceAfterImport = creditGroup.balanceFromImportingTransactions;
                creditGroup.rows.push(item);
            }
        }

        const debitKey = item.debitBankAccountPublicId;
        if (debitKey) {
            const debitGroup = map.get(debitKey);
            if (!debitGroup) {
                map.set(debitKey, {
                    bankAccountPublicId: debitKey,
                    balanceFromImportingTransactions: item.debit.negated(),
                    balanceAfterImport: item.debit.negated(),
                    currency: accountsWithAssignedBankAccounts.filter(account => account.bankAccount.publicId === debitKey)![0].currentBalance.currency.code,
                    rows: [item],
                });
            } else {
                debitGroup.balanceFromImportingTransactions = debitGroup.balanceFromImportingTransactions.minus(item.debit);
                debitGroup.balanceAfterImport = debitGroup.balanceFromImportingTransactions;
                debitGroup.rows.push(item);
            }
        }
    }

    billingElements
        .forEach(billingElement => {
            const accounts = findAccount(billingElement.affectedAccountPublicId);
            const group = map.get((accounts && accounts.length > 0) ? accounts[0].bankAccount.publicId : '');
            if (group) {
                if (billingElement.billingElementType === 'Expense') group.balanceAfterImport = group.balanceAfterImport.plus(billingElement.amount);
                if (billingElement.billingElementType === 'Income') group.balanceAfterImport = group.balanceAfterImport.minus(billingElement.amount);
            }
        });
    transfers
        .forEach(transfer => {
            const fromAccount = findAccount(transfer.fromAccountPublicId || '');
            let group = map.get((fromAccount && fromAccount.length > 0) ? fromAccount[0].bankAccount.publicId : '');
            if (group) {
                group.balanceAfterImport = group.balanceAfterImport.plus(transfer.amount);
            }
            const toAccount = findAccount(transfer.toAccountPublicId || '');
            group = map.get((toAccount && toAccount.length > 0) ? toAccount[0].bankAccount.publicId : '');
            if (group) {
                group.balanceAfterImport = group.balanceAfterImport.minus(transfer.amount);
            }
        })


    return Array.from(map.values());
}