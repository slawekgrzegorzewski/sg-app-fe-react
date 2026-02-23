import * as React from "react";
import {useEffect, useRef, useState} from "react";
import {Box, Stack} from "@mui/material";
import {newCube} from "./visualizer";
import scramble from "./cube-scrambler";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";

export function CubesMainPage() {
    const [scr, setScr] = useState("");
    const ref = useRef<HTMLElement | null>(null);

    useEffect(() => {
        const s = newCube(ref.current!, 3);
        s.enableKey = (_) => true;
        s.puzzle.performAlg(scr);
    }, [scr])

    const makeScramble = () => {
        setScr(scramble({turns: 30}).join(" "));
    }

    return <Stack dir={'column'}>
        <Box component="div" ref={ref}
             id="scenesContainer"
             sx={{display: 'flex', flexWrap: 'wrap', gap: '16px', width: '300px', height: '300px'}}>
        </Box>
        <Typography>{scr}</Typography>
        <Button onClick={makeScramble}>Scramble</Button>
    </Stack>;
}