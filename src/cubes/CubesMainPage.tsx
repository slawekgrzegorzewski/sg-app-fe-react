import * as React from "react";
import {useEffect, useRef, useState} from "react";
import {Box, Stack} from "@mui/material";
import {newCube} from "./visualizer";
import {scramble as generateScramble} from "./cube-scrambler";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";

export function CubesMainPage() {
    const [scramble, setScramble] = useState("");
    const cubeVisualizationContainerRef = useRef<HTMLElement | null>(null);

    useEffect(() => {
        const s = newCube(cubeVisualizationContainerRef.current!, 3);
        s.enableKey = (_) => true;
        s.puzzle.performAlg(scramble);
    }, [scramble]);

    return <Stack dir={'column'} alignItems={'center'}>
        <Button onClick={() => setScramble(generateScramble({turns: 30}).join(" "))}>Scramble</Button>
        <Typography variant={'h5'}>{scramble}</Typography>
        <Box component="div" ref={cubeVisualizationContainerRef}
             id="scenesContainer"
             sx={{display: 'flex', flexWrap: 'wrap', gap: '16px', width: '300px', height: '300px'}}>
        </Box>
    </Stack>;
}