import {Box, BoxProps} from "@mui/material";
import {SxProps} from "@mui/system";
import {Theme} from "@mui/material/styles";

export type StandOutTextProps = Omit<BoxProps, 'component'> & {
    standOutBy?: 'color' | 'bold' | 'both';
};

export function StandOutText({standOutBy = 'color', sx, ...props}: StandOutTextProps) {
    const customSx = Array.isArray(sx) ? sx : [sx];

    return <Box
        component="span"
        {...props}
        sx={[
            {
                ...(standOutBy !== 'bold' ? {color: 'secondary.main'} : {}),
                ...(standOutBy !== 'color' ? {fontWeight: 700} : {}),
            },
            ...customSx,
        ] as SxProps<Theme>}
    />;
}
