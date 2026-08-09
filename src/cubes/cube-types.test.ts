import {CubeType} from '../types';
import {getCubeLayers, getCubeScrambleOptions} from './cube-types';

describe('cube type configuration', () => {
    it.each([
        [CubeType.Two, 2],
        [CubeType.Three, 3],
        [CubeType.Four, 4],
        [CubeType.Five, 5],
        [CubeType.Six, 6],
        [CubeType.Seven, 7],
    ])('maps %s to a %i-layer visualizer', (cubeType, layers) => {
        expect(getCubeLayers(cubeType)).toBe(layers);
    });

    it('enables wide scramble moves only for cubes with at least four layers', () => {
        expect(getCubeScrambleOptions(CubeType.Three)).toEqual({turns: 30, wideMoves: false});
        expect(getCubeScrambleOptions(CubeType.Four)).toEqual({
            turns: 40,
            wideMoves: true,
            maxWideMoveDepth: 2,
        });
        expect(getCubeScrambleOptions(CubeType.Five)).toEqual({
            turns: 60,
            wideMoves: true,
            maxWideMoveDepth: 2,
        });
        expect(getCubeScrambleOptions(CubeType.Six)).toEqual({
            turns: 80,
            wideMoves: true,
            maxWideMoveDepth: 3,
        });
        expect(getCubeScrambleOptions(CubeType.Seven)).toEqual({
            turns: 100,
            wideMoves: true,
            maxWideMoveDepth: 3,
        });
    });

    it('marks Megaminx visualization and scramble generation as unavailable', () => {
        expect(getCubeLayers(CubeType.Megaminx)).toBeNull();
        expect(getCubeScrambleOptions(CubeType.Megaminx)).toBeNull();
    });
});
