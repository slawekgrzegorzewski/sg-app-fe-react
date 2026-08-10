import {CubeType} from '../types';
import {CUBING_SCRAMBLE_MODULE_URL, CUBING_TWISTY_MODULE_URL, randomCubingScramble} from './cubing-api';
import {generateCubingScramble} from './cubing-scramble';

jest.mock('./cubing-api', () => ({
    ...jest.requireActual('./cubing-api'),
    randomCubingScramble: jest.fn(),
}));

const randomCubingScrambleMock = randomCubingScramble as jest.Mock;

describe('generateCubingScramble', () => {
    it('loads cubing.js from application assets', () => {
        expect(CUBING_SCRAMBLE_MODULE_URL).toBe('/vendor/cubing/scramble/index.js');
        expect(CUBING_TWISTY_MODULE_URL).toBe('/vendor/cubing/twisty/index.js');
    });

    it('generates and serializes a scramble for the selected event', async () => {
        randomCubingScrambleMock.mockResolvedValue({toString: () => "R U R'"});

        await expect(generateCubingScramble(CubeType.Pyraminx)).resolves.toBe("R U R'");
        expect(randomCubingScrambleMock).toHaveBeenCalledWith('pyram');
    });
});
