import {createTheme, PaletteMode, Theme, ThemeOptions} from "@mui/material";
// noinspection ES6UnusedImports
import type {} from '@mui/x-date-pickers/themeAugmentation';

// Design tokens
const tokens = {
    primary: {
        main: '#475569',
        light: '#94A3B8',
        dark: '#334155',
        contrastText: '#FFFFFF',
    },
    secondary: {
        main: '#A16207',
        light: '#E5C563',
        dark: '#854D0E',
        contrastText: '#FFFFFF',
    },
    borderRadius: 4,
};

const getDesignTokens = (mode: PaletteMode): ThemeOptions => ({
    palette: {
        mode,
        primary: tokens.primary,
        secondary: tokens.secondary,
        ...(mode === 'light'
            ? {
                background: {
                    default: '#FFFBF5',
                    paper: '#FFFBF5',
                },
                text: {
                    primary: '#1F2937',
                    secondary: '#6B7280',
                },
                divider: '#E5E7EB',
                action: {
                    hover: '#DEDAD5',
                },
            }
            : {
                background: {
                    default: '#1F1E2A',
                    paper: '#2A2A3C',
                },
                text: {
                    primary: '#F3F4F6',
                    secondary: '#9CA3AF',
                },
                divider: '#3A3A4C',
                action: {
                    hover: '#3A3A4C',
                },
            }),
        error: {
            main: '#EF4444',
        },
        warning: {
            main: '#F59E0B',
        },
        success: {
            main: '#10B981',
        },
        info: {
            main: '#3B82F6',
        },
    },
    typography: {
        fontFamily: '"Inter", "Helvetica", "Arial", sans-serif',
        fontSize: 13,
        h1: {fontSize: '1.75rem', fontWeight: 700},
        h2: {fontSize: '1.375rem', fontWeight: 600},
        h3: {fontSize: '1.125rem', fontWeight: 600},
        h4: {fontSize: '1rem', fontWeight: 600},
        h5: {fontSize: '0.875rem', fontWeight: 600},
        h6: {fontSize: '0.8125rem', fontWeight: 600},
        subtitle1: {fontSize: '0.9375rem', fontWeight: 500},
        subtitle2: {fontSize: '0.8125rem', fontWeight: 500},
        body1: {fontSize: '0.875rem', fontWeight: 400},
        body2: {fontSize: '0.8125rem', fontWeight: 400},
        caption: {fontSize: '0.75rem', fontWeight: 500},
        button: {fontSize: '0.8125rem', fontWeight: 600, textTransform: 'none'},
    },
    shape: {
        borderRadius: tokens.borderRadius,
    },
    spacing: 8,
    components: {
        MuiButton: {
            defaultProps: {
                disableElevation: false,
                size: 'small',
                color: 'secondary',
            },
            styleOverrides: {
                root: {
                    borderRadius: tokens.borderRadius,
                    padding: '6px 16px',
                },
            },
        },
        MuiIconButton: {
            defaultProps: {
                size: 'small',
            },
        },
        MuiTextField: {
            defaultProps: {
                variant: 'filled',
                size: 'small',
            },
        },
        MuiFilledInput: {
            defaultProps: {
                disableUnderline: true,
            },
            styleOverrides: {
                root: {
                    borderRadius: tokens.borderRadius,
                    ...(mode === 'light'
                        ? {backgroundColor: '#F1F5F9'}
                        : {backgroundColor: '#3A3A4C'}),
                    '&:hover': {
                        ...(mode === 'light'
                            ? {backgroundColor: '#E2E8F0'}
                            : {backgroundColor: '#4A4A5C'}),
                    },
                    '&.Mui-focused': {
                        ...(mode === 'light'
                            ? {backgroundColor: '#E2E8F0'}
                            : {backgroundColor: '#4A4A5C'}),
                    },
                },
            },
        },
        MuiPickersFilledInput: {
            defaultProps: {
                disableUnderline: true,
            },
            styleOverrides: {
                root: {
                    borderRadius: tokens.borderRadius,
                    ...(mode === 'light' ? {backgroundColor: '#F1F5F9'} : {backgroundColor: '#3A3A4C'}),
                    '&:hover': {
                        ...(mode === 'light' ? {backgroundColor: '#E2E8F0'} : {backgroundColor: '#4A4A5C'}),
                    },
                    '&.Mui-focused': {
                        ...(mode === 'light' ? {backgroundColor: '#E2E8F0'} : {backgroundColor: '#4A4A5C'}),
                    },
                },
            },
        },
        MuiSelect: {
            defaultProps: {
                variant: 'filled',
                size: 'small',
            },
        },
        MuiFormControl: {
            defaultProps: {
                variant: 'filled',
                size: 'small',
            },
        },
        MuiInputLabel: {
            defaultProps: {
                size: 'small',
            },
            styleOverrides: {
                root: {
                    color: mode === 'light' ? '#6B7280' : '#9CA3AF',
                    '&.Mui-focused': {
                        color: mode === 'light' ? '#334155' : '#E5C563',
                    },
                },
            },
        },
        MuiCard: {
            defaultProps: {
                elevation: 1,
            },
            styleOverrides: {
                root: {
                    borderRadius: tokens.borderRadius,
                },
            },
        },
        MuiPaper: {
            defaultProps: {
                elevation: 1,
            },
            styleOverrides: {
                root: {
                    borderRadius: tokens.borderRadius,
                },
            },
        },
        MuiAccordion: {
            defaultProps: {
                elevation: 1,
            },
            styleOverrides: {
                root: {
                    borderRadius: `${tokens.borderRadius}px !important`,
                    '&:before': {
                        display: 'none',
                    },
                },
            },
        },
        MuiDialog: {
            styleOverrides: {
                paper: {
                    borderRadius: tokens.borderRadius,
                },
            },
        },
        MuiChip: {
            styleOverrides: {
                root: {
                    borderRadius: tokens.borderRadius,
                },
            },
        },
        MuiAppBar: {
            defaultProps: {
                elevation: 2,
            },
        },
        MuiTableCell: {
            styleOverrides: {
                root: {
                    padding: '8px 12px',
                    fontSize: '0.8125rem',
                },
                head: {
                    fontWeight: 600,
                },
            },
        },
        MuiToolbar: {
            styleOverrides: {
                root: {
                    minHeight: '48px !important',
                },
            },
        },
        MuiTab: {
            styleOverrides: {
                root: {
                    textTransform: 'none',
                    fontWeight: 500,
                    minHeight: 40,
                },
            },
        },
        MuiSwitch: {
            defaultProps: {
                size: 'small',
            },
        },
        MuiFormControlLabel: {
            styleOverrides: {
                label: {
                    fontSize: '0.8125rem',
                },
            },
        },
        MuiMenuItem: {
            styleOverrides: {
                root: {
                    fontSize: '0.8125rem',
                },
            },
        },
        MuiCssBaseline: {
            styleOverrides: {
                body: {
                    fontFamily: '"Inter", "Helvetica", "Arial", sans-serif',
                },
            },
        },
    },
});

export function buildTheme(mode: PaletteMode): Theme {
    return createTheme(getDesignTokens(mode));
}
