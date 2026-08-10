import type {Alg} from 'cubing/alg';
import type {PuzzleID, TwistyPlayer, TwistyPlayerConfig} from 'cubing/twisty';
import type {CubingEventId} from './cube-types';

const PUBLIC_URL = (process.env.PUBLIC_URL ?? '').replace(/\/$/, '');
const CUBING_MODULE_BASE_URL = `${PUBLIC_URL}/vendor/cubing`;
export const CUBING_ALG_MODULE_URL = `${CUBING_MODULE_BASE_URL}/alg/index.js`;
export const CUBING_PUZZLES_MODULE_URL = `${CUBING_MODULE_BASE_URL}/puzzles/index.js`;
export const CUBING_SCRAMBLE_MODULE_URL = `${CUBING_MODULE_BASE_URL}/scramble/index.js`;
export const CUBING_TWISTY_MODULE_URL = `${CUBING_MODULE_BASE_URL}/twisty/index.js`;

type CubingAlgModule = typeof import('cubing/alg');
type CubingPuzzlesModule = typeof import('cubing/puzzles');
type CubingScrambleModule = typeof import('cubing/scramble');
type CubingTwistyModule = typeof import('cubing/twisty');

let algModulePromise: Promise<CubingAlgModule> | null = null;
let puzzlesModulePromise: Promise<CubingPuzzlesModule> | null = null;
let scrambleModulePromise: Promise<CubingScrambleModule> | null = null;
let twistyModulePromise: Promise<CubingTwistyModule> | null = null;

function loadAlgModule(): Promise<CubingAlgModule> {
    algModulePromise ??= import(/* webpackIgnore: true */ CUBING_ALG_MODULE_URL) as Promise<CubingAlgModule>;
    return algModulePromise;
}

function loadPuzzlesModule(): Promise<CubingPuzzlesModule> {
    puzzlesModulePromise ??= import(
        /* webpackIgnore: true */ CUBING_PUZZLES_MODULE_URL
    ) as Promise<CubingPuzzlesModule>;
    return puzzlesModulePromise;
}

function loadScrambleModule(): Promise<CubingScrambleModule> {
    scrambleModulePromise ??= import(
        /* webpackIgnore: true */ CUBING_SCRAMBLE_MODULE_URL
    ) as Promise<CubingScrambleModule>;
    return scrambleModulePromise;
}

function loadTwistyModule(): Promise<CubingTwistyModule> {
    twistyModulePromise ??= import(
        /* webpackIgnore: true */ CUBING_TWISTY_MODULE_URL
    ) as Promise<CubingTwistyModule>;
    return twistyModulePromise;
}

export async function randomCubingScramble(eventId: CubingEventId): Promise<Alg> {
    const cubingScrambleModule = await loadScrambleModule();
    return cubingScrambleModule.randomScrambleForEvent(eventId);
}

export async function createCubingTwistyPlayer(config: TwistyPlayerConfig): Promise<TwistyPlayer> {
    const cubingTwistyModule = await loadTwistyModule();
    return new cubingTwistyModule.TwistyPlayer(config);
}

export async function validateCubingScramble(puzzleId: PuzzleID, scramble: string): Promise<void> {
    const [{Alg}, {puzzles}] = await Promise.all([loadAlgModule(), loadPuzzlesModule()]);
    const puzzle = puzzles[puzzleId];
    if (!puzzle) {
        throw new Error(`Unsupported puzzle: ${puzzleId}`);
    }

    const kpuzzle = await puzzle.kpuzzle();
    kpuzzle.defaultPattern().applyAlg(new Alg(scramble));
}
