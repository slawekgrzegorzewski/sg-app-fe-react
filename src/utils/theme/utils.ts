import {SxProps, SystemStyleObject} from '@mui/system';
import {Theme} from '@mui/material/styles';

export const almostFullHeight = (
    theme: Theme
): SystemStyleObject<Theme> => ({
    height: '90vh',
    maxHeight: 'none',

    [theme.breakpoints.down('sm')]: {
        height: '100vh',
        width: '100vw',
        maxWidth: '100vw',
    },
});

export const almostFullHeightDialog = (
    theme: Theme
): SystemStyleObject<Theme> => ({
    '& .MuiDialog-paper': {
        ...almostFullHeight(theme),
        width: 'fit-content',
        maxWidth: '90vw',
        minWidth: 0,
    },
});

export const rowHover: (theme: Theme) => SxProps<Theme> = (theme: Theme) => {
    return {
        '&:hover': {
            backgroundColor: theme.palette.action.hover,
        }
    } as SxProps<Theme>;
}