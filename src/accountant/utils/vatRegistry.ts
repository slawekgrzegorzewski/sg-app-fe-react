import dayjs from 'dayjs';

export async function lookupVatRegistry(taxId: string) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 10000);
    try {
        const date = dayjs().format('YYYY-MM-DD');
        const endpoint = 'https://wykazpodatnikowvat.mf.gov.pl/api/search/nip';
        const response = await fetch(
                `${endpoint}/${taxId}?date=${date}`,
                {credentials: 'omit', signal: controller.signal});
        if (!response.ok) {
            throw new Error('Błąd HTTP wykazu');
        }
        const body = await response.json();
        const subject = body?.result?.subject;
        if (subject === null) {
            return null;
        }
        if (subject?.nip !== taxId || typeof subject.name !== 'string' || !subject.name.trim()) {
            throw new Error('Niepełne dane w odpowiedzi wykazu');
        }
        const address = [subject.residenceAddress, subject.workingAddress].find(
                value => typeof value === 'string' && value.trim()) ?? '';
        return {name: subject.name.trim(), address: address.trim()};
    } finally {
        window.clearTimeout(timeout);
    }
}
