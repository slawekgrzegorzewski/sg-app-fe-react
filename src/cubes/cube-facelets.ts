declare const cubeFaceletsBrand: unique symbol;

export type CubeFacelets = string & {
    readonly [cubeFaceletsBrand]: true;
};

export function isCubeFacelets(value: string): value is CubeFacelets {
    return value.length === 54 && /^[URFDLB]+$/.test(value);
}

export function parseCubeFacelets(value: string): CubeFacelets {
    if (!isCubeFacelets(value)) {
        throw new Error('Niepoprawny zapis naklejek kostki.');
    }
    return value;
}
