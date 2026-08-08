import {SxProps, SystemStyleObject} from '@mui/system';
import {Theme} from '@mui/material/styles';

export const almostFullHeight = (): SystemStyleObject<Theme> => ({
    height: '90vh',
    maxHeight: 'none',
});

export const almostFullHeightDialog = (
    theme: Theme
): SystemStyleObject<Theme> => ({
    '& .MuiDialog-paper': {
        ...almostFullHeight(),
        width: 'fit-content',
        maxWidth: '90vw',
        minWidth: 0,
        [theme.breakpoints.down('sm')]: {
            width: '100vw',
            maxWidth: '100vw',
            margin: 0,
            borderRadius: 0,
        },
    },
});

export const rowHover: (theme: Theme) => SxProps<Theme> = (theme: Theme) => {
    return {
        '&:hover': {
            backgroundColor: theme.palette.action.hover,
        }
    } as SxProps<Theme>;
}

export const compactListRow = (theme: Theme): SystemStyleObject<Theme> => ({
    px: 1.5,
    py: 0.65,
    borderBottom: '1px solid',
    borderColor: 'divider',
    '&:hover': {
        backgroundColor: theme.palette.action.hover,
    },
});
