import type {Alg} from 'cubing/alg';
import type {PuzzleID, TwistyPlayer, TwistyPlayerConfig} from 'cubing/twisty';
import type {CubingEventId} from './cube-types';
import {faceletsToTransformationData, validateDerivedScramble} from './cubing-facelets';

const PUBLIC_URL = (process.env.PUBLIC_URL ?? '').replace(/\/$/, '');
const CUBING_MODULE_BASE_URL = `${PUBLIC_URL}/vendor/cubing`;
export const CUBING_ALG_MODULE_URL = `${CUBING_MODULE_BASE_URL}/alg/index.js`;
export const CUBING_PUZZLES_MODULE_URL = `${CUBING_MODULE_BASE_URL}/puzzles/index.js`;
export const CUBING_SCRAMBLE_MODULE_URL = `${CUBING_MODULE_BASE_URL}/scramble/index.js`;
export const CUBING_TWISTY_MODULE_URL = `${CUBING_MODULE_BASE_URL}/twisty/index.js`;
export const CUBING_KPUZZLE_MODULE_URL = `${CUBING_MODULE_BASE_URL}/kpuzzle/index.js`;
export const CUBING_SEARCH_MODULE_URL = `${CUBING_MODULE_BASE_URL}/search/index.js`;

type CubingAlgModule = typeof import('cubing/alg');
type CubingPuzzlesModule = typeof import('cubing/puzzles');
type CubingScrambleModule = typeof import('cubing/scramble');
type CubingTwistyModule = typeof import('cubing/twisty');

let algModulePromise: Promise<CubingAlgModule> | null = null;
let puzzlesModulePromise: Promise<CubingPuzzlesModule> | null = null;
let scrambleModulePromise: Promise<CubingScrambleModule> | null = null;
let twistyModulePromise: Promise<CubingTwistyModule> | null = null;
let kpuzzleModulePromise: Promise<typeof import('cubing/kpuzzle')> | null = null;
let searchModulePromise: Promise<typeof import('cubing/search')> | null = null;

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

export async function createCubingFaceletTransformation(facelets: string) {
    const data = faceletsToTransformationData(facelets);
    kpuzzleModulePromise ??= import(/* webpackIgnore: true */ CUBING_KPUZZLE_MODULE_URL) as Promise<typeof import('cubing/kpuzzle')>;
    const [{KTransformation}, {puzzles}] = await Promise.all([kpuzzleModulePromise, loadPuzzlesModule()]);
    return new KTransformation(await puzzles['3x3x3'].kpuzzle(), data);
}

export async function deriveCubingScramble(facelets: string): Promise<string> {
    searchModulePromise ??= import(/* webpackIgnore: true */ CUBING_SEARCH_MODULE_URL) as Promise<typeof import('cubing/search')>;
    const [transformation, search] = await Promise.all([createCubingFaceletTransformation(facelets), searchModulePromise]);
    const pattern = transformation.kpuzzle.defaultPattern().applyTransformation(transformation);
    const solution = await search.experimentalSolve3x3x3IgnoringCenters(pattern);
    return validateDerivedScramble(facelets, solution.invert().toString());
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
