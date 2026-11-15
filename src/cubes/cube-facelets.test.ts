import {isCubeFacelets, parseCubeFacelets} from './cube-facelets';
import {SOLVED_CUBE} from './smart-cube-state';

test('przyjmuje zapis 54 naklejek bez zmiany jego wartości', () => {
    expect(isCubeFacelets(SOLVED_CUBE)).toBe(true);
    expect(parseCubeFacelets(SOLVED_CUBE)).toBe(SOLVED_CUBE);
});

test.each([
    '',
    SOLVED_CUBE.slice(1),
    SOLVED_CUBE + 'U',
    SOLVED_CUBE.replace('U', 'X'),
    SOLVED_CUBE.toLowerCase(),
    SOLVED_CUBE.slice(0, -1) + '\n',
])('odrzuca niepoprawny zapis naklejek: %j', value => {
    expect(isCubeFacelets(value)).toBe(false);
    expect(() => parseCubeFacelets(value)).toThrow('Niepoprawny zapis naklejek kostki.');
});
