import {alpha, createTheme, PaletteMode, Theme} from "@mui/material";
import {buildTheme as buildPlumTheme} from "./theme2";

const colorTokens = {
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

export type ThemeColorTokens = (typeof colorTokens)[PaletteMode];

const BORDER_RADIUS = 6;

export function buildThemeWithColorTokens(mode: PaletteMode, tokens: ThemeColorTokens): Theme {
    const baseTheme = buildPlumTheme(mode);

    return createTheme(baseTheme, {
        palette: {
            mode,
            primary: tokens.primary,
            secondary: tokens.secondary,
            background: {
                default: tokens.background.default,
                paper: tokens.background.paper,
            },
            text: tokens.text,
            divider: tokens.divider,
            action: {
                hover: alpha(tokens.primary.main, mode === 'light' ? 0.04 : 0.12),
            },
            error: {main: tokens.error},
            warning: {main: tokens.warning},
            success: {main: tokens.success},
            info: tokens.secondary,
        },
        shape: {
            borderRadius: BORDER_RADIUS,
        },
        components: {
            MuiButton: {
                styleOverrides: {
                    root: {borderRadius: BORDER_RADIUS},
                },
            },
            MuiFilledInput: {
                styleOverrides: {
                    root: {
                        borderRadius: BORDER_RADIUS,
                        backgroundColor: tokens.background.input,
                        '&:hover': {
                            backgroundColor: tokens.background.inputActive,
                        },
                        '&.Mui-focused': {
                            backgroundColor: tokens.background.inputActive,
                        },
                    },
                },
            },
            MuiInputLabel: {
                styleOverrides: {
                    root: {
                        color: tokens.text.secondary,
                        '&.Mui-focused': {
                            color: mode === 'light' ? tokens.primary.dark : tokens.primary.light,
                        },
                    },
                },
            },
            MuiCard: {
                styleOverrides: {
                    root: {borderRadius: BORDER_RADIUS},
                },
            },
            MuiPaper: {
                styleOverrides: {
                    root: {borderRadius: BORDER_RADIUS},
                },
            },
            MuiAccordion: {
                styleOverrides: {
                    root: {borderRadius: `${BORDER_RADIUS}px !important`},
                },
            },
            MuiDialog: {
                styleOverrides: {
                    paper: {borderRadius: BORDER_RADIUS},
                },
            },
            MuiChip: {
                styleOverrides: {
                    root: {borderRadius: BORDER_RADIUS},
                    filledPrimary: {
                        backgroundColor: alpha(tokens.primary.main, 0.18),
                        color: tokens.primaryChipText,
                    },
                    filledSecondary: {
                        backgroundColor: alpha(tokens.secondary.main, 0.18),
                        color: tokens.secondaryChipText,
                    },
                },
            },
        },
    });
}

export function buildTheme(mode: PaletteMode): Theme {
    return buildThemeWithColorTokens(mode, colorTokens[mode]);
}
