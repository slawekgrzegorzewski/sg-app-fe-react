import {CubeMove, parseCubeMove} from './cube-move';
import {CubeFacelets, parseCubeFacelets} from './cube-facelets';
import {CUBE_FACES, CubeFace, CubePiece} from './cube-pieces';

export const SOLVED_CUBE = parseCubeFacelets(
    CUBE_FACES.map(
        face => face.repeat(9)).join(''));

type Vector = [number, number, number];

enum Axis {
    X = 0,
    Y = 1,
    Z = 2,
}

enum RotationDirection {
    Positive = 1,
    Negative = -1,
}

type Sticker = { position: Vector; normal: Vector; };

function sticker(face: CubeFace, row: number, col: number): Sticker {
    switch (face) {
        case 'U':
            return {
                position: [col - 1, 1, row - 1],
                normal: [0, 1, 0]
            };
        case 'R':
            return {
                position: [1, 1 - row, 1 - col],
                normal: [1, 0, 0]
            };
        case 'F':
            return {
                position: [col - 1, 1 - row, 1],
                normal: [0, 0, 1]
            };
        case 'D':
            return {
                position: [col - 1, -1, 1 - row],
                normal: [0, -1, 0]
            };
        case 'L':
            return {
                position: [-1, 1 - row, col - 1],
                normal: [-1, 0, 0]
            };
        default:
            return {
                position: [1 - col, 1 - row, -1],
                normal: [0, 0, -1]
            };
    }
}

const stickers = CUBE_FACES
    .flatMap(face => Array.from(
        {length: 9},
        (_, i) => sticker(face, Math.floor(i / 3), i % 3)));

const stickerKey = (s: Sticker) => [...s.position, ...s.normal].join(',');

const stickerIndicesByKey = new Map(stickers.map((s, i) => [stickerKey(s), i]));

export function faceletIndicesForPiece(piece: CubePiece): number[] {
    const normals = ([...piece] as CubeFace[])
        .map(face => sticker(face, 1, 1).normal);

    const position = normals.reduce<Vector>(
        (sum, normal) => [sum[0] + normal[0], sum[1] + normal[1], sum[2] + normal[2]],
        [0, 0, 0]);

    return normals.map(normal => {
        const index = stickerIndicesByKey.get(stickerKey({position, normal}));
        if (index === undefined) {
            throw new Error('Niepoprawne położenie elementu kostki.');
        }
        return index;
    });
}

function rotateVector(
    vector: Vector,
    axis: Axis,
    direction: RotationDirection): Vector {
    const [x, y, z] = vector;
    if (axis === Axis.X) {
        return [x, -direction * z, direction * y];
    }
    if (axis === Axis.Y) {
        return [direction * z, y, -direction * x];
    }
    return [-direction * y, direction * x, z];
}

export function applyCubeMove(
    facelets: CubeFacelets,
    move: CubeMove): CubeFacelets {
    const face = move[0] as CubeFace;
    const suffix = move.slice(1);
    const movingFaceIndex = CUBE_FACES.findIndex(f => f === face);
    const movingFaceAxis: Axis = ([Axis.Y, Axis.X, Axis.Z, Axis.Y, Axis.X, Axis.Z] as const)[movingFaceIndex];
    const anticlockwiseDirection: RotationDirection = movingFaceIndex < 3
        ? RotationDirection.Positive
        : RotationDirection.Negative;
    const clockwiseDirection: RotationDirection = -anticlockwiseDirection;
    const direction: RotationDirection = suffix === '\''
        ? anticlockwiseDirection
        : clockwiseDirection;
    const turns = suffix === '2'
        ? 2
        : 1;
    let currentFacelets = facelets;

    function isOnMovingFace(sticker: Sticker) {
        return sticker.position[movingFaceAxis] === (movingFaceIndex < 3 ? 1 : -1);
    }

    for (let turn = 0; turn < turns; turn++) {
        const nextFacelets = ([...currentFacelets] as CubeFace[]);
        for (let i = 0; i < stickers.length; i++) {
            const sticker = stickers[i];
            if (!isOnMovingFace(sticker)) {
                continue;
            }
            const destinationIndex = stickerIndicesByKey.get(
                stickerKey({
                    position: rotateVector(sticker.position, movingFaceAxis, direction),
                    normal: rotateVector(sticker.normal, movingFaceAxis, direction)
                }));
            if (destinationIndex === undefined) {
                throw new Error('Niepoprawny stan kostki.');
            }
            nextFacelets[destinationIndex] = currentFacelets[i] as CubeFace;
        }
        currentFacelets = parseCubeFacelets(nextFacelets.join(''));
    }
    return currentFacelets;
}

export function findCubeMove(
    before: CubeFacelets,
    after: CubeFacelets): CubeMove | null {
    if (before.length !== 54 || after.length !== 54 || before === after) {
        return null;
    }
    for (const face of CUBE_FACES) {
        for (const suffix of ['', '\'', '2'] as const) {
            const move: CubeMove = `${face}${suffix}`;
            if (applyCubeMove(before, move) === after) {
                return move;
            }
        }
    }
    return null;
}

export function scrambleStates(scramble: string): CubeFacelets[] {
    return scramble.trim()
        .split(/\s+/)
        .filter(Boolean)
        .map(parseCubeMove)
        .reduce<CubeFacelets[]>((states, move) => {
                states.push(applyCubeMove(states[states.length - 1], move));
                return states;
            },
            [SOLVED_CUBE]);
}
