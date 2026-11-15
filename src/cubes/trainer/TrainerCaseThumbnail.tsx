import {CubeFacelets} from '../cube-facelets';
import {useEffect, useState} from 'react';
import {Box, Skeleton, Typography} from '@mui/material';
import {CfopStage} from '../../types';
import {faceletsFromCubingAlgorithm} from '../cubing-api';
import {faceletIndicesForPiece, SOLVED_CUBE} from '../smart-cube-state';
import {TRAINER_FACE_COLORS} from './trainer-cube-orientation';
import {Corner, CUBE_FACES, CubeFace, Edge, isCubeFace} from '../cube-pieces';

const previews = new Map<string, Promise<CubeFacelets>>();
type F2LView = {
    pieces: readonly [Corner, Edge];
    front: CubeFace;
    right: CubeFace;
    top: readonly number[];
};

const f2lViews: readonly F2LView[] = [
    {pieces: ['DRF', 'FR'], front: 'F', right: 'R', top: [0, 1, 2, 3, 4, 5, 6, 7, 8]},
    {pieces: ['DFL', 'FL'], front: 'L', right: 'F', top: [2, 5, 8, 1, 4, 7, 0, 3, 6]},
    {pieces: ['DLB', 'BL'], front: 'B', right: 'L', top: [8, 7, 6, 5, 4, 3, 2, 1, 0]},
    {pieces: ['DBR', 'BR'], front: 'R', right: 'B', top: [6, 3, 0, 7, 4, 1, 8, 5, 2]},
];

function preview(setupAlgorithm: string) {
    let result = previews.get(setupAlgorithm);
    if (!result) {
        result = faceletsFromCubingAlgorithm(setupAlgorithm)
            .catch(error => {
                previews.delete(setupAlgorithm);
                throw error;
            });
        previews.set(setupAlgorithm, result);
    }
    return result;
}

type Props = {
    setupAlgorithm: string;
    stage: CfopStage;
    label: string;
    size?: number;
};

export function TrainerCaseThumbnail({setupAlgorithm, stage, label, size = 80}: Props) {
    const [state, setState] = useState<{ setupAlgorithm: string; facelets?: CubeFacelets; failed?: boolean }>();
    useEffect(
        () => {
            let active = true;
            preview(setupAlgorithm)
                .then(facelets => {
                        if (active) {
                            setState({setupAlgorithm, facelets});
                        }
                    },
                    () => {
                        if (active) {
                            setState({setupAlgorithm, failed: true});
                        }
                    });
            return () => {
                active = false;
            };
        },
        [setupAlgorithm]);

    const current = state?.setupAlgorithm === setupAlgorithm
        ? state
        : undefined;
    const facelets = current?.facelets;
    const view = f2lViews.find(
        view =>
            view.pieces.some(
                piece =>
                    faceletIndicesForPiece(piece).some(
                        index => facelets?.[index] !== SOLVED_CUBE[index]))) ?? f2lViews[0];
    const face = (name: CubeFace) => facelets?.slice(
        CUBE_FACES.indexOf(name) * 9,
        CUBE_FACES.indexOf(name) * 9 + 9);
    const stickerColor = (color: string) => {
        if (stage === CfopStage.Oll && color !== 'U') {
            return '#9e9e9e';
        }
        return isCubeFace(color)
            ? TRAINER_FACE_COLORS[color]
            : undefined;
    };
    const squares = (
        name: CubeFace,
        order = f2lViews[0].top) =>
        order.map(
            (
                sticker,
                index) => (
                <rect
                    key={index}
                    x={(index % 3) * 14}
                    y={Math.floor(
                        index / 3) * 14}
                    width={14}
                    height={14}
                    fill={stickerColor(
                        face(name)![sticker])}
                />
            ));

    return (
        <Box sx={{width: size, height: size, flexShrink: 0, display: 'grid', placeItems: 'center'}}>
            {current?.failed
                ? (
                    <Typography
                        variant="caption"
                        color="text.secondary"
                        role="img"
                        aria-label={`Podgląd niedostępny: ${label}`}
                    >
                        Brak podglądu
                    </Typography>
                )
                : !facelets
                    ? (
                        <Skeleton variant="rounded" width={size} height={size}
                                  aria-label={`Ładowanie podglądu: ${label}`}/>
                    )
                    : (
                        <svg
                            width={size}
                            height={size}
                            viewBox="0 0 100 100"
                            role="img"
                            aria-label={`Stan początkowy: ${label}`}
                        >
                            <g stroke="#202124" strokeWidth={1.2} strokeLinejoin="round">
                                {stage === CfopStage.F2L
                                    ? (
                                        <>
                                            <g transform="matrix(1 0.5 -1 0.5 50 7)">{squares('U', view.top)}</g>
                                            <g transform="matrix(1 0.5 0 1.1 8 28)">{squares(view.front)}</g>
                                            <g transform="matrix(1 -0.5 0 1.1 50 49)">{squares(view.right)}</g>
                                        </>
                                    )
                                    : (
                                        <>
                                            <g transform="translate(29 29)">{squares('U')}</g>
                                            {[0, 1, 2].map(
                                                index => (
                                                    <g key={index}>
                                                        <rect
                                                            x={29 + index * 14}
                                                            y={17}
                                                            width={14}
                                                            height={10}
                                                            fill={stickerColor(
                                                                face('B')![2 - index])}
                                                        />
                                                        <rect
                                                            x={29 + index * 14}
                                                            y={73}
                                                            width={14}
                                                            height={10}
                                                            fill={stickerColor(
                                                                face('F')![index])}
                                                        />
                                                        <rect
                                                            x={17}
                                                            y={29 + index * 14}
                                                            width={10}
                                                            height={14}
                                                            fill={stickerColor(
                                                                face('L')![index])}
                                                        />
                                                        <rect
                                                            x={73}
                                                            y={29 + index * 14}
                                                            width={10}
                                                            height={14}
                                                            fill={stickerColor(
                                                                face('R')![2 - index])}
                                                        />
                                                    </g>
                                                ))}
                                        </>
                                    )}
                            </g>
                        </svg>
                    )}
        </Box>
    );
}
