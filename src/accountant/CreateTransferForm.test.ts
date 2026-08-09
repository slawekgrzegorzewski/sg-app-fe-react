import Decimal from 'decimal.js';
import {TRANSFER_FORM_PROPERTIES, TransferDTO} from './CreateTransferForm';

jest.mock('@apollo/client/react', () => ({
    useLazyQuery: jest.fn(),
}));

const transfer = (fromAmount: unknown, toAmount: unknown) =>
    ({
        fromAccountPublicId: 'from-account',
        fromAmount,
        fromCurrency: 'PLN',
        toAccountPublicId: 'to-account',
        toAmount,
        toCurrency: 'EUR',
        day: null,
        description: '',
    }) as TransferDTO;

describe('TRANSFER_FORM_PROPERTIES', () => {
    it.each([
        ['number', 10, 20],
        ['string', '10', '20'],
        ['Decimal', new Decimal(10), new Decimal(20)],
    ])('accepts %s amounts supplied by Formik', (_, fromAmount, toAmount) => {
        expect(() => TRANSFER_FORM_PROPERTIES(transfer(fromAmount, toAmount), [], [])).not.toThrow();
    });

    it('keeps an initially empty amount editable after the user enters a value', () => {
        const initialTransfer = transfer(new Decimal(0), new Decimal(0));
        const changedTransfer = transfer('1', '2');

        const properties = TRANSFER_FORM_PROPERTIES(changedTransfer, [], [], false, initialTransfer);

        expect(properties.fields.find(field => field.key === 'fromAmount')?.editable).toBe(true);
        expect(properties.fields.find(field => field.key === 'toAmount')?.editable).toBe(true);
    });

    it('keeps an initially populated amount blocked', () => {
        const initialTransfer = transfer(new Decimal(10), new Decimal(20));
        const changedTransfer = transfer('11', '21');

        const properties = TRANSFER_FORM_PROPERTIES(changedTransfer, [], [], false, initialTransfer);

        expect(properties.fields.find(field => field.key === 'fromAmount')?.editable).toBe(false);
        expect(properties.fields.find(field => field.key === 'toAmount')?.editable).toBe(false);
    });
});
