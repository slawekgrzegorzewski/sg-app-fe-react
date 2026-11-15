import {isCubeMove, parseCubeMove} from './cube-move';
import {CUBE_FACES} from './cube-pieces';

test('przyjmuje wszystkie 18 podstawowych ruchów ścianek', () => {
    for (const face of CUBE_FACES) {
        for (const suffix of ['', "'", '2']) {
            const move = face + suffix;
            expect(isCubeMove(move)).toBe(true);
            expect(parseCubeMove(move)).toBe(move);
        }
    }
});

test.each(['', 'Rw', 'M', 'x', 'r', 'R3', "R2'", 'R U', ' R', 'R\n'])(
    'odrzuca nieobsługiwany zapis ruchu: %j',
    value => {
        expect(isCubeMove(value)).toBe(false);
        expect(() => parseCubeMove(value)).toThrow('Nieobsługiwany ruch kostki 3×3.');
    });
