import {Alert, Box, Stack} from '@mui/material';
import {useEffect, useRef, useState} from 'react';
import {CubeType} from '../types';
import {getCubeTypeOption} from './cube-types';
import {createCubingTwistyPlayer} from './cubing-api';

export function CubingVisualizer({cubeType, scramble}: {cubeType: CubeType; scramble: string}) {
    const containerRef = useRef<HTMLDivElement | null>(null);
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
            experimentalSetupAlg: scramble,
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
                player.style.width = '100%';
                player.style.height = '100%';
                player.tabIndex = 0;
                player.setAttribute('aria-label', `Interaktywna wizualizacja: ${option.label}`);
                container.appendChild(player);
            })
            .catch(() => {
                if (!disposed) {
                    setLoadError(true);
                }
            });

        return () => {
            disposed = true;
            player?.remove();
        };
    }, [cubeType, scramble]);

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
