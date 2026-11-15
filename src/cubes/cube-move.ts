import {CubeFace} from './cube-pieces';

export type CubeMove = `${CubeFace}${'' | "'" | '2'}`;

export function isCubeMove(value: string): value is CubeMove {
    return /^[URFDLB][2']?(?![\s\S])/.test(value);
}

export function parseCubeMove(value: string): CubeMove {
    if (!isCubeMove(value)) {
        throw new Error('Nieobsługiwany ruch kostki 3×3.');
    }
    return value;
}
