import {alpha, createTheme, PaletteMode, Theme, ThemeOptions} from "@mui/material";

// Design tokens
const tokens = {
    primary: {
        main: '#6D3B75',
        light: '#8B5A92',
        dark: '#512C57',
        contrastText: '#FFFFFF',
    },
    secondary: {
        main: '#0E7490',
        light: '#38B2AC',
        dark: '#155E75',
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
                    default: '#FCF9FC',
                    paper: '#FFFFFF',
                },
                text: {
                    primary: '#2D2431',
                    secondary: '#6A5F6E',
                },
                divider: '#E8DFEA',
                action: {
                    hover: alpha(tokens.primary.main, 0.04),
                },
            }
            : {
                background: {
                    default: '#171319',
                    paper: '#211C24',
                },
                text: {
                    primary: '#F4EEF6',
                    secondary: '#C7BDCB',
                },
                divider: '#3B3340',
                action: {
                    hover: alpha(tokens.primary.main, 0.12),
                },
            }),
        error: {
            main: mode === 'light' ? '#C54E4E' : '#F06A6A',
        },
        warning: {
            main: mode === 'light' ? '#D9922E' : '#F2B544',
        },
        success: {
            main: mode === 'light' ? '#2E7D5A' : '#4CAF78',
        },
        info: tokens.secondary,
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
                        ? {backgroundColor: '#FAF4FB'}
                        : {backgroundColor: '#2A242E'}),
                    '&:hover': {
                        ...(mode === 'light'
                            ? {backgroundColor: '#F0E6F2'}
                            : {backgroundColor: '#3B3340'}),
                    },
                    '&.Mui-focused': {
                        ...(mode === 'light'
                            ? {backgroundColor: '#F0E6F2'}
                            : {backgroundColor: '#3B3340'}),
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
                    color: mode === 'light' ? '#6A5F6E' : '#C7BDCB',
                    '&.Mui-focused': {
                        color: mode === 'light' ? tokens.primary.dark : tokens.primary.light,
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
                filledPrimary: {
                    backgroundColor: alpha(tokens.primary.main, 0.18),
                    color: mode === 'light' ? tokens.primary.dark : '#F4EEF6',
                },
                filledSecondary: {
                    backgroundColor: alpha(tokens.secondary.main, 0.18),
                    color: mode === 'light' ? tokens.secondary.dark : '#DDF8F7',
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
