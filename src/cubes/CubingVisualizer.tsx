import {Alert, Box, Stack} from '@mui/material';
import {useEffect, useRef, useState} from 'react';
import {CubeType} from '../types';
import {getCubeTypeOption} from './cube-types';
import {createCubingFaceletTransformation, createCubingTwistyPlayer} from './cubing-api';
import {findCubeMove} from './smart-cube-state';

export function CubingVisualizer({cubeType, scramble, facelets = null}: {cubeType: CubeType; scramble: string; facelets?: string | null}) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const playerRef = useRef<Awaited<ReturnType<typeof createCubingTwistyPlayer>> | null>(null);
    const previousFacelets = useRef<string | null>(null);
    const initialScramble = useRef(scramble);
    initialScramble.current = scramble;
    const [playerVersion, setPlayerVersion] = useState(0);
    const [loadError, setLoadError] = useState(false);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) {
            return;
        }

        const option = getCubeTypeOption(cubeType);
        let disposed = false;
        let player: Awaited<ReturnType<typeof createCubingTwistyPlayer>> | null = null;
        setLoadError(false);

        createCubingTwistyPlayer({
            puzzle: option.puzzleId,
            experimentalSetupAlg: initialScramble.current,
            background: 'none',
            controlPanel: 'none',
            hintFacelets: 'none',
            experimentalDragInput: 'auto',
            experimentalMovePressInput: 'none',
        })
            .then(createdPlayer => {
                if (disposed) {
                    createdPlayer.remove();
                    return;
                }
                player = createdPlayer;
                playerRef.current = createdPlayer;
                previousFacelets.current = null;
                player.style.width = '100%';
                player.style.height = '100%';
                player.tabIndex = 0;
                player.setAttribute('aria-label', `Interaktywna wizualizacja: ${option.label}`);
                container.appendChild(player);
                setPlayerVersion(version => version + 1);
            })
            .catch(() => {
                if (!disposed) {
                    setLoadError(true);
                }
            });

        return () => {
            disposed = true;
            if (playerRef.current === player) playerRef.current = null;
            player?.remove();
        };
    }, [cubeType]);

    useEffect(() => {
        const player = playerRef.current;
        if (!player) return;
        let disposed = false;
        if (facelets) {
            const previous = previousFacelets.current;
            const move = previous ? findCubeMove(previous, facelets) : null;
            previousFacelets.current = facelets;
            createCubingFaceletTransformation(move && previous ? previous : facelets).then(transformation => {
                if (disposed) return;
                player.pause();
                player.alg = move ?? '';
                player.experimentalSetupAlg = '';
                player.experimentalModel.setupTransformation.set(transformation);
                if (move) {
                    player.tempoScale = 4;
                    player.jumpToStart();
                    player.play();
                } else {
                    player.jumpToEnd();
                }
                setLoadError(false);
            }).catch(() => { if (!disposed) setLoadError(true); });
        } else {
            previousFacelets.current = null;
            player.pause();
            player.alg = '';
            player.experimentalModel.setupTransformation.set(null);
            player.experimentalSetupAlg = scramble;
            player.jumpToEnd();
            setLoadError(false);
        }
        return () => { disposed = true; };
    }, [cubeType, scramble, facelets, playerVersion]);

    return (
        <Stack alignItems="center">
            <Box
                ref={containerRef}
                role="region"
                aria-label="Wizualizacja układanki"
                sx={{width: {xs: 300, sm: 420}, height: {xs: 300, sm: 360}, maxWidth: '100%'}}
            />
            {loadError && <Alert severity="error">Nie udało się załadować wizualizacji.</Alert>}
        </Stack>
    );
}
