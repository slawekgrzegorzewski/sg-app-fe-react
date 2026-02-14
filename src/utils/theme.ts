import {Theme} from "@mui/material";
import {SxProps} from "@mui/system";

export const rowHover: (theme: Theme) => SxProps<Theme> = (theme: Theme) => {
    return {
        '&:hover': {
            backgroundColor: theme.palette.grey['300']
        }
    } as SxProps<Theme>;
}
