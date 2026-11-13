import {Alert, Box, Stack} from '@mui/material';
import {useEffect, useRef, useState} from 'react';
import type {RefObject} from 'react';
import {CubeType} from '../types';
import {getCubeTypeOption} from './cube-types';
import {createCubingFaceletTransformation, createCubingTwistyPlayer} from './cubing-api';
import {findCubeMove} from './smart-cube-state';
import type {CubeQuaternion} from './quaternion';

export function CubingVisualizer({cubeType, scramble, facelets = null, orientation, orientationResetVersion = 0}: {cubeType: CubeType; scramble: string; facelets?: string | null; orientation?: RefObject<CubeQuaternion | null>; orientationResetVersion?: number}) {
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

    useEffect(() => {
        const player = playerRef.current;
        if (!player || !orientation || orientationResetVersion === 0) return;
        player.cameraLatitude = 0;
        player.cameraLongitude = 10;
    }, [cubeType, orientation, orientationResetVersion, playerVersion]);

    useEffect(() => {
        const player = playerRef.current;
        if (!player || !orientation) return;
        let disposed = false;
        let frame = 0;
        let lastOrientation: CubeQuaternion | null = null;
        let scene: {quaternion: {set: (x: number, y: number, z: number, w: number) => unknown}} | null = null;
        let vantage: {scheduleRender: () => void} | null = null;

        const update = async () => {
            try {
                if (!vantage || !scene) {
                    const candidate = (await player.experimentalCurrentVantages())[Symbol.iterator]().next().value;
                    if (disposed) return;
                    if (candidate?.scene) {
                        const loadedScene = await candidate.scene.scene();
                        if (disposed) return;
                        vantage = candidate;
                        scene = loadedScene;
                    }
                }
                const current = orientation.current;
                if (vantage && scene && current && current !== lastOrientation) {
                    scene.quaternion.set(current.x, current.y, current.z, current.w);
                    vantage.scheduleRender();
                    lastOrientation = current;
                }
                if (!disposed) frame = requestAnimationFrame(() => { void update(); });
            } catch {
                // The experimental scene API may be unavailable; keep the normal viewer usable.
            }
        };
        void update();
        return () => {
            disposed = true;
            cancelAnimationFrame(frame);
            if (scene && vantage) {
                scene.quaternion.set(0, 0, 0, 1);
                vantage.scheduleRender();
            }
        };
    }, [cubeType, orientation, playerVersion]);

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
