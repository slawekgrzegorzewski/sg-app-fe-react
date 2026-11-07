import {faceletsToTransformationData, validateDerivedScramble} from './cubing-facelets';
import {scrambleStates, SOLVED_CUBE} from './smart-cube-state';

test('odwzorowuje stan F R zgodnie z modelem 3×3 cubing.js', () => {
    const data = faceletsToTransformationData(scrambleStates('F R')[2]);
    expect(data.EDGES).toEqual({permutation: [9, 0, 2, 3, 8, 10, 6, 7, 5, 4, 1, 11], orientationDelta: [1, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0]});
    expect(data.CORNERS).toEqual({permutation: [0, 3, 2, 5, 7, 4, 6, 1], orientationDelta: [1, 2, 0, 2, 1, 1, 0, 2]});
});

test('odrzuca błędny stan ścianek', () => {
    expect(() => faceletsToTransformationData(SOLVED_CUBE.replace('U', 'R'))).toThrow();
});

test('normalizuje i sprawdza krótki algorytm prowadzący do danego stanu', () => {
    const target = scrambleStates('R F2 U')[3];
    expect(validateDerivedScramble(target, "R F2' U")).toBe('R F2 U');
    expect(() => validateDerivedScramble(target, 'R F2')).toThrow();
    expect(() => validateDerivedScramble(SOLVED_CUBE, Array(32).fill('R').join(' '))).toThrow();
});
