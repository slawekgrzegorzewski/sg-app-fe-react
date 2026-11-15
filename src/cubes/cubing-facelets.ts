import {CubeFacelets, parseCubeFacelets} from './cube-facelets';
import type {KPatternData, KTransformationData} from 'cubing/kpuzzle';
import {faceletIndicesForPiece, scrambleStates} from './smart-cube-state';
import {CORNERS, CUBE_FACES, CubePiece, EDGES} from './cube-pieces';

export function patternDataToFacelets(data: KPatternData): CubeFacelets {
    const result = Array<string>(54);
    for (const [orbitName, pieces] of [
        ['EDGES', EDGES],
        ['CORNERS', CORNERS],
    ] as const) {
        const orbit = data[orbitName];
        pieces.forEach((position, index) => {
            const colors = pieces[orbit.pieces[index]];
            const orientation = orbit.orientation[index];
            const oriented = colors.slice(orientation) + colors.slice(0, orientation);
            faceletIndicesForPiece(position).forEach((facelet, sticker) => {
                result[facelet] = oriented[sticker];
            });
        });
    }
    const faces = CUBE_FACES.join('');
    const centerFaces = 'ULFRBD';
    const centerColors = [...faces].map(face => centerFaces[data.CENTERS.pieces[centerFaces.indexOf(face)]]);
    centerColors.forEach((color, index) => {
        result[index * 9 + 4] = color;
    });
    return parseCubeFacelets(
            result.map(
                    color => faces[centerColors.indexOf(color)]).join(''));
}

function orbit(facelets: CubeFacelets, pieces: readonly CubePiece[]) {
    const permutation: number[] = [];
    const orientationDelta: number[] = [];
    for (const position of pieces) {
        const colors = faceletIndicesForPiece(position)
            .map(index => facelets[index])
            .join('');
        let found = false;
        pieces.forEach((piece, index) => {
            for (let orientation = 0; orientation < piece.length; orientation++) {
                if (piece.slice(orientation) + piece.slice(0, orientation) === colors) {
                    permutation.push(index);
                    orientationDelta.push(orientation);
                    found = true;
                }
            }
        });
        if (!found) throw new Error('Niepoprawny stan ścianek kostki.');
    }
    if (new Set(permutation).size !== pieces.length) throw new Error('Niepoprawny stan ścianek kostki.');
    return {permutation, orientationDelta};
}

export function faceletsToTransformationData(facelets: CubeFacelets): KTransformationData {
    if (facelets.length !== 54 || CUBE_FACES.some((face, index) => facelets[index * 9 + 4] !== face)) {
        throw new Error('Niepoprawny stan ścianek kostki.');
    }
    return {
        EDGES: orbit(facelets, EDGES),
        CORNERS: orbit(facelets, CORNERS),
        CENTERS: {permutation: [0, 1, 2, 3, 4, 5], orientationDelta: [0, 0, 0, 0, 0, 0]},
    };
}

export function validateDerivedScramble(facelets: CubeFacelets, algorithm: string): string {
    const scramble = algorithm.trim().replace(/([URFDLB])2'/g, (_match, face: string) => `${face}2`);
    const moves = scramble ? scramble.split(/\s+/) : [];
    const states = scrambleStates(scramble);
    if (moves.length > 30 || states[states.length - 1] !== facelets) {
        throw new Error('Nie udało się wyznaczyć poprawnego scramble’a o długości do 30 ruchów.');
    }
    return scramble;
}
