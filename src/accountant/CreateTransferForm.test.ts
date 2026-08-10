import Decimal from 'decimal.js';
import {TRANSFER_FORM_PROPERTIES, TransferDTO} from './CreateTransferForm';
import {Account, CurrencyInfo} from '../types';
import {SelectEditorField} from '../utils/forms/Form';
import dayjs from 'dayjs';

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

const currency = {code: 'PLN', description: 'Polski złoty'} as CurrencyInfo;
const account = (publicId: string) =>
    ({
        publicId,
        name: publicId,
        currentBalance: {amount: 0, currency},
    }) as Account;

describe('TRANSFER_FORM_PROPERTIES', () => {
    it('uses the dialog presentation', () => {
        expect(TRANSFER_FORM_PROPERTIES(transfer(0, 0), [], []).presentation).toBe('dialog');
    });

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

    it('locks the description when requested', () => {
        const initialTransfer = transfer(new Decimal(10), new Decimal(0));

        const properties = TRANSFER_FORM_PROPERTIES(initialTransfer, [], [], false, initialTransfer, false);

        expect(properties.fields.find(field => field.key === 'description')?.editable).toBe(false);
    });

    it('can keep a prefilled date editable', () => {
        const initialTransfer = {...transfer(new Decimal(10), new Decimal(0)), day: dayjs('2026-08-08')};

        const properties = TRANSFER_FORM_PROPERTIES(initialTransfer, [], [], false, initialTransfer, false, true);

        expect(properties.fields.find(field => field.key === 'day')?.editable).toBe(true);
    });

    it('excludes the source account from destination options', () => {
        const initialTransfer = transfer(new Decimal(10), new Decimal(0));
        const accounts = [account('from-account'), account('to-account'), account('another-account')];

        const properties = TRANSFER_FORM_PROPERTIES(initialTransfer, accounts, []);
        const destinationField = properties.fields.find(
            field => field.key === 'toAccountPublicId'
        ) as SelectEditorField;

        expect(destinationField.selectOptions.map(option => option.key)).toEqual(['to-account', 'another-account']);
    });
});
