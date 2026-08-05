import dayjs from "dayjs";
import Decimal from "decimal.js";
import {formatBalance, maxDate, minDate, notEmpty, trimDateToDay, trimDateToMonth} from "./functions";

describe('minDate', () => {

    it('returns the earliest of several dates', () => {
        const earliest = dayjs('2026-01-05');
        const result = minDate([dayjs('2026-03-01'), earliest, dayjs('2026-02-01')]);

        expect(result.format('YYYY-MM-DD')).toBe('2026-01-05');
    });

    it('returns the single date unchanged', () => {
        expect(minDate([dayjs('2026-07-31')]).format('YYYY-MM-DD')).toBe('2026-07-31');
    });

    /*
     * The empty case used to return a Date, making the inferred return type
     * `Dayjs | Date` and handing callers an object without Dayjs methods.
     */
    it('returns a Dayjs even when given no dates', () => {
        const result = minDate([]);

        expect(dayjs.isDayjs(result)).toBe(true);
        expect(typeof result.format).toBe('function');
    });

    it('always returns a Dayjs for a non-empty input', () => {
        expect(dayjs.isDayjs(minDate([dayjs(), dayjs().add(1, 'day')]))).toBe(true);
    });
});

describe('maxDate', () => {

    it('returns the latest of several dates', () => {
        const result = maxDate([new Date('2026-01-01'), new Date('2026-05-01'), new Date('2026-03-01')]);

        expect(result.toISOString()).toBe(new Date('2026-05-01').toISOString());
    });

    it('returns a Date when given no dates', () => {
        expect(maxDate([])).toBeInstanceOf(Date);
    });
});

describe('trimDateToDay', () => {

    it('drops the time of day', () => {
        const result = trimDateToDay(new Date('2026-07-31T13:45:12.345Z'));

        expect(dayjs(result).hour()).toBe(0);
        expect(dayjs(result).minute()).toBe(0);
        expect(dayjs(result).second()).toBe(0);
        expect(dayjs(result).millisecond()).toBe(0);
    });

    it('accepts a Dayjs as well as a Date', () => {
        expect(dayjs(trimDateToDay(dayjs('2026-07-31T23:59:59'))).date()).toBe(31);
    });
});

describe('trimDateToMonth', () => {

    it('moves to the first day of the month', () => {
        expect(dayjs(trimDateToMonth(new Date('2026-07-31T13:00:00'))).date()).toBe(1);
    });
});

describe('formatBalance', () => {

    it('wraps negative balances in parentheses', () => {
        expect(formatBalance('PLN', new Decimal(-10))).toMatch(/^\(.*\)$/);
    });

    it('leaves non-negative balances unwrapped', () => {
        expect(formatBalance('PLN', new Decimal(10))).not.toMatch(/^\(/);
        expect(formatBalance('PLN', new Decimal(0))).not.toMatch(/^\(/);
    });
});

describe('notEmpty', () => {

    it('filters out null and undefined but keeps falsy values', () => {
        expect([1, null, 2, undefined, 0, ''].filter(notEmpty)).toEqual([1, 2, 0, '']);
    });
});
