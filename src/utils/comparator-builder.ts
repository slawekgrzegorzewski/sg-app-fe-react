import dayjs from "dayjs";

export type TBasicComparable = string | number | boolean | undefined | null;

export type TKeyExtractor<T> = (t: T) => TBasicComparable;

export type TKeyDateExtractor<T> = (t: T) => Date;

export enum Order {
    DESC = -1,
    ASC = 1
}

export class KeyExtractor<T> {
    order: Order;
    comparator: TKeyExtractor<T>;

    constructor(comparator: TKeyExtractor<T>) {
        this.order = Order.ASC;
        this.comparator = comparator;
    }
}

export type CompareFunction<T> = (v1: T, v2: T) => number;

export function nullSafe<T>(keyExtractor: TKeyExtractor<T>): TKeyExtractor<T> {
    return (value: T) => {
        try {
            return keyExtractor(value);
        } catch (error) {
            if (error instanceof TypeError) {
                return null;
            } else {
                throw error;
            }
        }
    };
}

/**
 * Defines how <code>null</code> or <code>undefined</code> are treated when encountering. </br>
 * A <code>NullMode</code> of LOWEST defines null-values as lowest. The array ["a", "d", null, "c"] would be sorted
 * as ["a", "c", "d", null].
 * A <code>NullMode</code> of <code>HIGHEST</code> sorts priorizes null values. The array ["a", "d", null, "c"] would be sorted
 * as [null, "a", "c", "d"].
 */
export enum NullMode {
    /**
     * Priorizes non-null values. The array ["a", "d", null, "c"] would be sorted
     * as ["a", "c", "d", null].
     */
    LOWEST,

    /**
     * Priorizes null values. The array ["a", "d", null, "c"] would be sorted
     * as [null, "a", "c", "d"].
     */
    HIGHEST,
    /**
     * No null treatment.
     */
    NONE
}

/**
 * Sample usages:
 * <ul>
 *     <li><code>ComparatorBuilder<Person>.comparing(person => person.name).build()</code></li>
 *     <li><code>ComparatorBuilder<Person>.comparing(person => person.name).thenComparing(person => person.age).build()</code></li>
 *     <li><code>ComparatorBuilder<Person>.comparing(person => person.name).definingNullAs(LOWEST).build()</code></li>
 * </ul>
 */
export class ComparatorBuilder<T> {
    private extractors: Array<KeyExtractor<T>> = [];
    private lastExtractor: KeyExtractor<T>;
    private inverseFlag = false;
    private nullMode: NullMode = NullMode.NONE;


    private constructor(initialExtractor: TKeyExtractor<T>) {
        const keyExtractor = new KeyExtractor<T>(initialExtractor);
        this.extractors.push(keyExtractor);
        this.lastExtractor = keyExtractor;
    }

    /**
     * Creates a builder that compares <code>T</code> by the values extracted by the provided <code>keyExtractor</code>.
     * @param {KeyExtractor<T>} keyExtractor
     * @returns {ComparatorBuilder<T>}
     */
    public static comparing<T>(keyExtractor: TKeyExtractor<T>): ComparatorBuilder<T> {
        return new ComparatorBuilder<T>(keyExtractor);
    }

    public static comparingByDateDays<T>(keyExtractor: TKeyDateExtractor<T>): ComparatorBuilder<T> {
        return new ComparatorBuilder<T>(ComparatorBuilder.convertToStringExtractorByDays(keyExtractor));
    }

    public static comparingByYearMonth<T>(keyExtractor: TKeyDateExtractor<T>): ComparatorBuilder<T> {
        return new ComparatorBuilder<T>(ComparatorBuilder.convertToStringExtractorByYearMonth(keyExtractor));
    }

    public static comparingByDate<T>(keyExtractor: TKeyDateExtractor<T>): ComparatorBuilder<T> {
        return new ComparatorBuilder<T>(ComparatorBuilder.convertToNumberExtractor(keyExtractor));
    }

    private static convertToStringExtractorByYearMonth<T>(keyExtractor: TKeyDateExtractor<T>): TKeyExtractor<T> {
        return this.dateToStringConverter(keyExtractor, 'YYYY-MM');
    }

    private static convertToStringExtractorByDays<T>(keyExtractor: TKeyDateExtractor<T>): TKeyExtractor<T> {
        return this.dateToStringConverter(keyExtractor, 'YYYY-MM-DD');
    }

    private static dateToStringConverter<T>(keyExtractor: TKeyDateExtractor<T>, format: string) {
        return (t: T) => {
            if (t) {
                const date = keyExtractor(t);
                if (date) {
                    return dayjs(date).format(format);
                }
            }
            return null;
        };
    }

    private static convertToNumberExtractor<T>(keyExtractor: TKeyDateExtractor<T>): TKeyExtractor<T> {
        return t => {
            if (t) {
                const date = keyExtractor(t);
                if (date) {
                    return Math.floor(date.getTime());
                }
            }
            return null;
        };
    }

    /**
     * Reverses the whole comparison result. Reversion is done on the FINAL comparison result, not on the individual ones.
     */
    public inverse = (): ComparatorBuilder<T> => {
        this.inverseFlag = true;
        return this;
    };

    public desc = (): ComparatorBuilder<T> => {
        if (this.lastExtractor) {
            this.lastExtractor.order = Order.DESC;
        }
        return this;
    };

    /**
     * See {@link NullMode}. </br>
     * The default NullMode is {@link NullMode.NONE}. With NONE, null values will cause an exception.
     * @param {NullMode} nullMode to be used
     * @returns {ComparatorBuilder<T>} this builder.
     */
    public definingNullAs = (nullMode: NullMode): ComparatorBuilder<T> => {
        this.nullMode = nullMode;
        return this;
    };

    public thenComparing = (nextExtractor: TKeyExtractor<T>): ComparatorBuilder<T> => {
        const keyExtractor = new KeyExtractor<T>(nextExtractor);
        this.extractors.push(keyExtractor);
        this.lastExtractor = keyExtractor;
        return this;
    };

    public thenComparingByDateDays = (nextExtractor: TKeyDateExtractor<T>): ComparatorBuilder<T> => {
        return this.thenComparing(ComparatorBuilder.convertToStringExtractorByDays(nextExtractor));
    };

    public thenComparingByDate = (nextExtractor: TKeyDateExtractor<T>): ComparatorBuilder<T> => {
        return this.thenComparing(ComparatorBuilder.convertToNumberExtractor(nextExtractor));
    };

    public build(): CompareFunction<T> {
        if (this.extractors.length === 0) {
            throw new Error('No Extractor Provided!');
        }
        let factor = 1;
        if (this.inverseFlag) {
            factor = -1;
        }
        return (t1, t2) => (this.compare(t1, t2, [...this.extractors], 0)) * factor;
    }

    private compare = (t1: T, t2: T, extractors: Array<KeyExtractor<T>>, depth: number) => {
        const extractor = extractors[depth];
        const v1 = extractor.comparator(t1);
        const v2 = extractor.comparator(t2);
        let res = 0;
        /** Null Value Control */
        if ((v1 === null || v2 === null) && this.nullMode === NullMode.NONE) {
            throw new Error('NullMode is NONE but one of the values is null!');
        }
        if (v1 === null && v2 === null && this.nullMode !== NullMode.NONE) {
            if ((depth + 1) < extractors.length) {
                res = this.compare(t1, t2, extractors, depth + 1);
            } else {
                res = 0;
            }
        } else if (!v1 && this.nullMode === NullMode.HIGHEST && !!v2) {
            res = -1 * extractor.order;
        } else if (!v2 && this.nullMode === NullMode.HIGHEST && !!v1) {
            res = 1 * extractor.order;
        } else if (!v1 && this.nullMode === NullMode.LOWEST && !!v2) {
            res = 1 * extractor.order;
        } else if (!v2 && this.nullMode === NullMode.LOWEST && !!v1) {
            res = -1 * extractor.order;
        } else if (v1! > v2!) {
            res = 1 * extractor.order;
        } else if (v2! > v1!) {
            res = -1 * extractor.order;
        } else if (v1 === v2 && ((depth + 1) < extractors.length)) {
            res = this.compare(t1, t2, extractors, depth + 1);
        }
        return res;
    };
}
