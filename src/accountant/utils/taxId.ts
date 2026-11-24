import type {ClipboardEvent} from 'react';

function normalizePastedTaxId(value: string) {
    const normalized = value.trim()
        .replace(/^(?:NIP|VAT(?:\s*(?:ID|NO\.?|NUMBER))?|TIN|EIN)\s*:\s*/i, '')
        .toUpperCase();
    const withoutSeparators = normalized.replace(/[\s-]/g, '');
    if (/^(?:PL)?[0-9]{10}$/.test(withoutSeparators)) {
        return withoutSeparators;
    }
    return normalized;
}

export function getPastedTaxId(event: ClipboardEvent<HTMLInputElement>) {
    event.preventDefault();
    const input = event.currentTarget;
    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? start;
    const pasted = event.clipboardData.getData('text');
    return normalizePastedTaxId(
            input.value.slice(0, start) + pasted + input.value.slice(end));
}
