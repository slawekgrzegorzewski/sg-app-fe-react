import {formatMoney, Money} from "./FormattedMoneyText";
import {formatCurrency} from "../../utils/functions";

describe("formatMoney", () => {
    const negativeMoney: Money = {amount: -10, currency: "PLN"};

    it("formats the amount and currency internally without changing the sign", () => {
        expect(formatMoney(negativeMoney)).toBe(formatCurrency("PLN", -10));
    });

    it("uses accounting parentheses for a negative value when requested", () => {
        expect(formatMoney(negativeMoney, true)).toBe(`(${formatCurrency("PLN", 10)})`);
    });

    it("does not parenthesize zero or positive values", () => {
        expect(formatMoney({amount: 0, currency: "PLN"}, true)).toBe(formatCurrency("PLN", 0));
        expect(formatMoney({amount: 10, currency: "PLN"}, true)).toBe(formatCurrency("PLN", 10));
    });
});
