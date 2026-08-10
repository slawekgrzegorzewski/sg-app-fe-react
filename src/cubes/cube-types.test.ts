import {CubeType} from '../types';
import {CUBE_TYPE_OPTIONS, getCubeTypeOption} from './cube-types';

describe('cube type configuration', () => {
    it.each([
        [CubeType.Two, '2×2', '2x2x2', '222'],
        [CubeType.Three, '3×3', '3x3x3', '333'],
        [CubeType.Four, '4×4', '4x4x4', '444'],
        [CubeType.Five, '5×5', '5x5x5', '555'],
        [CubeType.Six, '6×6', '6x6x6', '666'],
        [CubeType.Seven, '7×7', '7x7x7', '777'],
        [CubeType.Megaminx, 'Megaminx', 'megaminx', 'minx'],
        [CubeType.Pyraminx, 'Pyraminx', 'pyraminx', 'pyram'],
        [CubeType.Skewb, 'Skewb', 'skewb', 'skewb'],
        [CubeType.Square_1, 'Square-1', 'square1', 'sq1'],
    ])('maps %s to cubing.js puzzle and event identifiers', (cubeType, label, puzzleId, eventId) => {
        expect(getCubeTypeOption(cubeType)).toEqual({value: cubeType, label, puzzleId, eventId});
    });

    it('exposes all supported types in the picker', () => {
        expect(CUBE_TYPE_OPTIONS).toHaveLength(10);
        expect(new Set(CUBE_TYPE_OPTIONS.map(option => option.value))).toEqual(new Set(Object.values(CubeType)));
    });

    it('rejects an unsupported type', () => {
        expect(() => getCubeTypeOption('UNKNOWN' as CubeType)).toThrow('Unsupported cube type: UNKNOWN');
    });
});
