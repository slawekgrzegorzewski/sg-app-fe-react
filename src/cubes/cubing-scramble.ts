import {CubeType} from '../types';
import {getCubeTypeOption} from './cube-types';
import {randomCubingScramble} from './cubing-api';

export async function generateCubingScramble(cubeType: CubeType): Promise<string> {
    const scramble = await randomCubingScramble(getCubeTypeOption(cubeType).eventId);
    return scramble.toString();
}
