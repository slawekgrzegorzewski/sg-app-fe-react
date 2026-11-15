import {CubeMove} from './cube-move';
import {applyCubeMove, faceletIndicesForPiece, findCubeMove, scrambleStates, SOLVED_CUBE} from './smart-cube-state';
import {CORNERS, CUBE_FACES, EDGES} from './cube-pieces';

test('wspólne listy zachowują kolejność ścian i obejmują wszystkie pozycje krawędzi i narożników', () => {
    expect(CUBE_FACES.join('')).toBe('URFDLB');
    expect(EDGES).toHaveLength(12);
    expect(CORNERS).toHaveLength(8);
    const indices = [...EDGES, ...CORNERS].flatMap(faceletIndicesForPiece);
    expect(indices).toHaveLength(48);
    expect(new Set(indices).size).toBe(48);
    expect(indices.every(index => index >= 0 && index < 54 && index % 9 !== 4)).toBe(true);
});

test('zwraca indeksy w kolejności ścian w oznaczeniu elementu', () => {
    expect(faceletIndicesForPiece('UF')).toEqual([7, 19]);
    expect(faceletIndicesForPiece('UFR')).toEqual([8, 20, 9]);
});

test('odwzorowuje ruchy F R w notacji Kociemby', () => {
    expect(scrambleStates('F R')[2]).toBe('UUFUUFLLFUUURRRRRRFFRFFDFFDRRBDDBDDBLLDLLDLLDLBBUBBUBB');
});

test('każdy ruch można cofnąć i wykonać jako obrót podwójny', () => {
    for (const face of CUBE_FACES) {
        expect(applyCubeMove(applyCubeMove(SOLVED_CUBE, face), `${face}'`)).toBe(SOLVED_CUBE);
        expect(applyCubeMove(SOLVED_CUBE, `${face}2`)).toBe(applyCubeMove(applyCubeMove(SOLVED_CUBE, face), face));
    }
});

test('odrzuca ruchy nieobsługiwane przez kostkę 3×3', () => {
    expect(() => scrambleStates('Rw')).toThrow();
});

test('rozpoznaje pojedyncze obroty i nie przypisuje ruchu nieciągłemu stanowi', () => {
    const before = scrambleStates('F R U')[3];
    for (const face of CUBE_FACES) {
        for (const suffix of ['', "'", '2'] as const) {
            const move: CubeMove = `${face}${suffix}`;
            expect(findCubeMove(before, applyCubeMove(before, move))).toBe(move);
        }
    }
    expect(findCubeMove(before, applyCubeMove(applyCubeMove(before, 'F'), 'R'))).toBeNull();
    expect(findCubeMove(before, before)).toBeNull();
});
