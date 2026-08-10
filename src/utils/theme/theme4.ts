import {PaletteMode, Theme} from '@mui/material';
import {buildThemeWithColorTokens, ThemeColorTokens} from './theme-builder';

const colorTokens: Record<PaletteMode, ThemeColorTokens> = {
    light: {
        primary: {
            main: '#4FBF91',
            light: '#83D9B5',
            dark: '#288762',
            contrastText: '#102B22',
        },
        secondary: {
            main: '#C92D62',
            light: '#E95788',
            dark: '#9F1F4A',
            contrastText: '#FFFFFF',
        },
        background: {
            default: '#F7FAF8',
            paper: '#FFFFFF',
            input: '#EDF7F2',
            inputActive: '#E0F0E8',
        },
        text: {
            primary: '#1B2A24',
            secondary: '#607168',
        },
        divider: '#DCE8E1',
        error: '#C9364A',
        warning: '#B56A00',
        success: '#18845B',
        primaryChipText: '#1B664C',
        secondaryChipText: '#9F1F4A',
    },
    dark: {
        primary: {
            main: '#9B87FF',
            light: '#C1B6FF',
            dark: '#7159EB',
            contrastText: '#171127',
        },
        secondary: {
            main: '#FF6B9A',
            light: '#FF9BBB',
            dark: '#D94878',
            contrastText: '#2B0C17',
        },
        background: {
            default: '#100E1A',
            paper: '#191624',
            input: '#221E32',
            inputActive: '#302A46',
        },
        text: {
            primary: '#F5F2FF',
            secondary: '#B8B0CC',
        },
        divider: '#302A42',
        error: '#FF737D',
        warning: '#FFB84D',
        success: '#45D69A',
        primaryChipText: '#F5F2FF',
        secondaryChipText: '#FFE1EB',
    },
};

export function buildTheme(mode: PaletteMode): Theme {
    return buildThemeWithColorTokens(mode, colorTokens[mode]);
}
