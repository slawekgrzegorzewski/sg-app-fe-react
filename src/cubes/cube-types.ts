import {CubeType} from '../types';
import {ScrambleOptions} from './cube-scrambler';

export const CUBE_TYPE_OPTIONS: Array<{value: CubeType; label: string}> = [
    {value: CubeType.Two, label: '2×2'},
    {value: CubeType.Three, label: '3×3'},
    {value: CubeType.Four, label: '4×4'},
    {value: CubeType.Five, label: '5×5'},
    {value: CubeType.Six, label: '6×6'},
    {value: CubeType.Seven, label: '7×7'},
    {value: CubeType.Megaminx, label: 'Megaminx'},
];

const CUBE_LAYERS: Partial<Record<CubeType, number>> = {
    [CubeType.Two]: 2,
    [CubeType.Three]: 3,
    [CubeType.Four]: 4,
    [CubeType.Five]: 5,
    [CubeType.Six]: 6,
    [CubeType.Seven]: 7,
};

const SCRAMBLE_TURNS: Partial<Record<CubeType, number>> = {
    [CubeType.Two]: 11,
    [CubeType.Three]: 30,
    [CubeType.Four]: 40,
    [CubeType.Five]: 60,
    [CubeType.Six]: 80,
    [CubeType.Seven]: 100,
};

export function getCubeLayers(cubeType: CubeType): number | null {
    return CUBE_LAYERS[cubeType] ?? null;
}

export function getCubeScrambleOptions(cubeType: CubeType): ScrambleOptions | null {
    const turns = SCRAMBLE_TURNS[cubeType];
    const layers = getCubeLayers(cubeType);
    if (turns === undefined) {
        return null;
    }

    if (layers === null || layers < 4) {
        return {turns, wideMoves: false};
    }

    return {turns, wideMoves: true, maxWideMoveDepth: Math.floor(layers / 2)};
}
