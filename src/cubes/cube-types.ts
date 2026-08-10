import {CubeType} from '../types';
import type {PuzzleID} from 'cubing/twisty';

export type CubingEventId = '222' | '333' | '444' | '555' | '666' | '777' | 'minx' | 'pyram' | 'skewb' | 'sq1';

export type CubeTypeOption = {
    value: CubeType;
    label: string;
    puzzleId: PuzzleID;
    eventId: CubingEventId;
};

export const CUBE_TYPE_OPTIONS: CubeTypeOption[] = [
    {value: CubeType.Two, label: '2×2', puzzleId: '2x2x2', eventId: '222'},
    {value: CubeType.Three, label: '3×3', puzzleId: '3x3x3', eventId: '333'},
    {value: CubeType.Four, label: '4×4', puzzleId: '4x4x4', eventId: '444'},
    {value: CubeType.Five, label: '5×5', puzzleId: '5x5x5', eventId: '555'},
    {value: CubeType.Six, label: '6×6', puzzleId: '6x6x6', eventId: '666'},
    {value: CubeType.Seven, label: '7×7', puzzleId: '7x7x7', eventId: '777'},
    {value: CubeType.Megaminx, label: 'Megaminx', puzzleId: 'megaminx', eventId: 'minx'},
    {value: CubeType.Pyraminx, label: 'Pyraminx', puzzleId: 'pyraminx', eventId: 'pyram'},
    {value: CubeType.Skewb, label: 'Skewb', puzzleId: 'skewb', eventId: 'skewb'},
    {value: CubeType.Square_1, label: 'Square-1', puzzleId: 'square1', eventId: 'sq1'},
];

export function getCubeTypeOption(cubeType: CubeType): CubeTypeOption {
    const option = CUBE_TYPE_OPTIONS.find(candidate => candidate.value === cubeType);
    if (!option) {
        throw new Error(`Unsupported cube type: ${cubeType}`);
    }
    return option;
}
