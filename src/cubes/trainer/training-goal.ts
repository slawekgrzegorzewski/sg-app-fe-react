import {CubeFacelets} from '../cube-facelets';
import {CfopStage} from '../../types';
import {faceletIndicesForPiece, SOLVED_CUBE} from '../smart-cube-state';
import {CORNERS, CUBE_FACES, CubeFace, CubePiece, EDGES} from '../cube-pieces';

export const CROSS_FACES = ['D', 'U', 'R', 'F', 'L', 'B'] as const satisfies readonly CubeFace[];
export type CrossFace = CubeFace;

const opposite: Record<CrossFace, CrossFace> = {D: 'U', U: 'D', R: 'L', L: 'R', F: 'B', B: 'F'};

export function trainingGoalReached(
    facelets: CubeFacelets,
    trainingGoal: CfopStage,
    crossFace: CrossFace): boolean {
    if (facelets.length !== 54) {
        return false;
    }

    const isIndexSolved = (index: number) => {
        return facelets[index] === SOLVED_CUBE[index];
    }

    const piecesSolved = (pieces: readonly CubePiece[]) =>
        pieces.every(piece =>
            faceletIndicesForPiece(piece).every(isIndexSolved));

    const edgesOnCrossFace = EDGES.filter(piece => piece.includes(crossFace));
    if (!piecesSolved(edgesOnCrossFace)) {

        return false;
    }
    if (trainingGoal === CfopStage.Cross) {
        return true;
    }
    const topFace = opposite[crossFace];
    const cornersOnCrossFace = CORNERS.filter(piece => piece.includes(crossFace));
    const edgesOnF2L = EDGES.filter(piece => !piece.includes(crossFace) && !piece.includes(topFace));
    if (!piecesSolved(cornersOnCrossFace) || !piecesSolved(edgesOnF2L)) {
        return false;
    }
    if (trainingGoal === CfopStage.F2L) {
        return true;
    }
    const topFaceOffset = CUBE_FACES.indexOf(topFace) * 9;
    if ([...facelets.slice(topFaceOffset, topFaceOffset + 9)].some(color => color !== topFace)) {
        return false;
    }
    return trainingGoal === CfopStage.Oll || facelets === SOLVED_CUBE;
}
