import {PaletteMode, Theme} from '@mui/material';
import {buildThemeWithColorTokens, ThemeColorTokens} from './theme-builder';

const colorTokens: Record<PaletteMode, ThemeColorTokens> = {
    light: {
        primary: {
            main: '#344967',
            light: '#5D7394',
            dark: '#22344D',
            contrastText: '#FFFFFF',
        },
        secondary: {
            main: '#287C78',
            light: '#4D9892',
            dark: '#1E625F',
            contrastText: '#FFFFFF',
        },
        background: {
            default: '#F6F7F9',
            paper: '#FFFFFF',
            input: '#F0F3F6',
            inputActive: '#E6EBF0',
        },
        text: {
            primary: '#202630',
            secondary: '#667085',
        },
        divider: '#E2E6EC',
        error: '#B94A53',
        warning: '#A96F24',
        success: '#317A55',
        primaryChipText: '#22344D',
        secondaryChipText: '#1E625F',
    },
    dark: {
        primary: {
            main: '#9BB0CE',
            light: '#C3D0E0',
            dark: '#7389A8',
            contrastText: '#14202E',
        },
        secondary: {
            main: '#63B8B0',
            light: '#8CCFC8',
            dark: '#428E88',
            contrastText: '#0E2423',
        },
        background: {
            default: '#11151B',
            paper: '#191F27',
            input: '#222A35',
            inputActive: '#2C3542',
        },
        text: {
            primary: '#EDF1F5',
            secondary: '#AAB3C0',
        },
        divider: '#2C3542',
        error: '#EE7C83',
        warning: '#E8B466',
        success: '#62BD89',
        primaryChipText: '#EDF1F5',
        secondaryChipText: '#D9F3F0',
    },
};

export function buildTheme(mode: PaletteMode): Theme {
    return buildThemeWithColorTokens(mode, colorTokens[mode]);
}
