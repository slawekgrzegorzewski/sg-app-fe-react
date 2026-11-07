import {applyCubeMove, findCubeMove, scrambleStates, SOLVED_CUBE} from './smart-cube-state';

test('odwzorowuje ruchy F R w notacji Kociemby', () => {
    expect(scrambleStates('F R')[2]).toBe('UUFUUFLLFUUURRRRRRFFRFFDFFDRRBDDBDDBLLDLLDLLDLBBUBBUBB');
});

test('każdy ruch można cofnąć i wykonać jako obrót podwójny', () => {
    for (const face of 'URFDLB') {
        expect(applyCubeMove(applyCubeMove(SOLVED_CUBE, face), `${face}'`)).toBe(SOLVED_CUBE);
        expect(applyCubeMove(SOLVED_CUBE, `${face}2`)).toBe(applyCubeMove(applyCubeMove(SOLVED_CUBE, face), face));
    }
});

test('odrzuca ruchy nieobsługiwane przez kostkę 3×3', () => {
    expect(() => scrambleStates('Rw')).toThrow();
});

test('rozpoznaje pojedyncze obroty i nie przypisuje ruchu nieciągłemu stanowi', () => {
    const before = scrambleStates('F R U')[3];
    for (const face of 'URFDLB') {
        for (const suffix of ['', "'", '2']) {
            const move = face + suffix;
            expect(findCubeMove(before, applyCubeMove(before, move))).toBe(move);
        }
    }
    expect(findCubeMove(before, applyCubeMove(applyCubeMove(before, 'F'), 'R'))).toBeNull();
    expect(findCubeMove(before, before)).toBeNull();
});
