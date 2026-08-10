import {alpha, createTheme} from '@mui/material';
import type {PaletteMode, Theme} from '@mui/material';
import {buildTheme as buildPlumTheme} from './theme2';

// noinspection ES6UnusedImports
import type {} from '@mui/x-date-pickers/themeAugmentation';

export interface ThemeColorTokens {
    primary: {
        main: string;
        light: string;
        dark: string;
        contrastText: string;
    };
    secondary: {
        main: string;
        light: string;
        dark: string;
        contrastText: string;
    };
    background: {
        default: string;
        paper: string;
        input: string;
        inputActive: string;
    };
    text: {
        primary: string;
        secondary: string;
    };
    divider: string;
    error: string;
    warning: string;
    success: string;
    primaryChipText: string;
    secondaryChipText: string;
}

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
            MuiPickersFilledInput: {
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
