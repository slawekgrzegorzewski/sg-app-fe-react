import type {KTransformationData} from 'cubing/kpuzzle';
import {faceletIndicesForPiece, scrambleStates} from './smart-cube-state';

const edges = 'UF UR UB UL DF DR DB DL FR FL BR BL'.split(' ');
const corners = 'UFR URB UBL ULF DRF DFL DLB DBR'.split(' ');

function orbit(facelets: string, pieces: string[]) {
    const permutation: number[] = [];
    const orientationDelta: number[] = [];
    for (const position of pieces) {
        const colors = faceletIndicesForPiece(position).map(index => facelets[index]).join('');
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

export function faceletsToTransformationData(facelets: string): KTransformationData {
    if (facelets.length !== 54 || [...'URFDLB'].some((face, index) => facelets[index * 9 + 4] !== face)) {
        throw new Error('Niepoprawny stan ścianek kostki.');
    }
    return {
        EDGES: orbit(facelets, edges),
        CORNERS: orbit(facelets, corners),
        CENTERS: {permutation: [0, 1, 2, 3, 4, 5], orientationDelta: [0, 0, 0, 0, 0, 0]},
    };
}

export function validateDerivedScramble(facelets: string, algorithm: string): string {
    const scramble = algorithm.trim().replace(/([URFDLB])2'/g, (_match, face: string) => `${face}2`);
    const moves = scramble ? scramble.split(/\s+/) : [];
    const states = scrambleStates(scramble);
    if (moves.length > 30 || states[states.length - 1] !== facelets) {
        throw new Error('Nie udało się wyznaczyć poprawnego scramble’a o długości do 30 ruchów.');
    }
    return scramble;
}
