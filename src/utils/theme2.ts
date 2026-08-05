import {alpha, createTheme} from "@mui/material/styles";
import {Theme} from "@mui/material";
import {SxProps} from "@mui/system";

const plum = {
    main: "#6D3B75",
    light: "#8B5A92",
    dark: "#512C57",
};

const sea = {
    main: "#0E7490",
    light: "#38B2AC",
    dark: "#155E75",
};

export const createAppTheme = (mode: "light" | "dark") =>
    createTheme({
        palette: {
            mode,

            primary: plum,
            secondary: sea,

            ...(mode === "light"
                ? {
                    background: {
                        default: "#FCF9FC",
                        paper: "#FFFFFF",
                    },

                    text: {
                        primary: "#2D2431",
                        secondary: "#6A5F6E",
                    },

                    divider: "#E8DFEA",

                    success: {main: "#2E7D5A"},
                    warning: {main: "#D9922E"},
                    error: {main: "#C54E4E"},
                    info: sea,
                }
                : {
                    background: {
                        default: "#171319",
                        paper: "#211C24",
                    },

                    text: {
                        primary: "#F4EEF6",
                        secondary: "#C7BDCB",
                    },

                    divider: "#3B3340",

                    success: {main: "#4CAF78"},
                    warning: {main: "#F2B544"},
                    error: {main: "#F06A6A"},
                    info: sea,
                }),
        },

        shape: {
            borderRadius: 4,
        },

        typography: {
            fontFamily: "Inter, Roboto, sans-serif",

            button: {
                textTransform: "none",
                fontWeight: 600,
            },
        },

        components: {
            MuiCssBaseline: {
                styleOverrides: {
                    body: {
                        backgroundColor:
                            mode === "light" ? "#FCF9FC" : "#171319",
                    },
                },
            },

            MuiPaper: {
                styleOverrides: {
                    root: {
                        borderRadius: 4,
                        backgroundImage: "none",

                        border:
                            mode === "light"
                                ? "1px solid #E8DFEA"
                                : "1px solid #35303A",

                        boxShadow:
                            mode === "light"
                                ? "0 4px 18px rgba(81,44,87,.08)"
                                : "0 6px 24px rgba(0,0,0,.45)",
                    },
                },
            },

            MuiCard: {
                styleOverrides: {
                    root: {
                        backgroundImage: "none",
                    },
                },
            },

            MuiDrawer: {
                styleOverrides: {
                    paper: {
                        color: "#fff",
                        borderRight: 0,

                        background:
                            mode === "light"
                                ? "linear-gradient(180deg,#6D3B75,#512C57)"
                                : "linear-gradient(180deg,#4B2850,#311A35)",
                    },
                },
            },

            MuiAppBar: {
                styleOverrides: {
                    root: {
                        background: plum.light,
                        borderRadius: 0,
                        color:
                            mode === "light"
                                ? "#2D2431"
                                : "#F4EEF6",

                        boxShadow: "none",

                        borderBottom:
                            mode === "light"
                                ? "1px solid #E8DFEA"
                                : "1px solid #35303A",
                    },
                },
            },

            MuiButton: {
                defaultProps: {
                    disableElevation: true,
                },

                styleOverrides: {
                    root: {
                        borderRadius: 4,
                    },

                    containedPrimary: {
                        "&:hover": {
                            backgroundColor: plum.dark,
                        },
                    },

                    containedSecondary: {
                        "&:hover": {
                            backgroundColor: sea.dark,
                        },
                    },
                },
            },

            MuiOutlinedInput: {
                styleOverrides: {
                    root: {
                        borderRadius: 4,

                        "& .MuiOutlinedInput-notchedOutline": {
                            borderColor:
                                mode === "light"
                                    ? "#DCCEDF"
                                    : "#4A424E",
                        },

                        "&:hover .MuiOutlinedInput-notchedOutline": {
                            borderColor: plum.light,
                        },

                        "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                            borderColor: plum.main,
                            borderWidth: 2,
                        },
                    },
                },
            },

            MuiChip: {
                styleOverrides: {
                    filledPrimary: {
                        backgroundColor: alpha(plum.main, 0.18),
                        color:
                            mode === "light"
                                ? plum.dark
                                : "#F4EEF6",
                    },

                    filledSecondary: {
                        backgroundColor: alpha(sea.main, 0.18),
                        color:
                            mode === "light"
                                ? sea.dark
                                : "#DDF8F7",
                    },
                },
            },

            MuiTableHead: {
                styleOverrides: {
                    root: {
                        background:
                            mode === "light"
                                ? "#FAF4FB"
                                : "#2A242E",
                    },
                },
            },

            MuiTableRow: {
                styleOverrides: {
                    root: {
                        "&:hover": {
                            backgroundColor:
                                mode === "light"
                                    ? alpha(plum.main, 0.04)
                                    : alpha(plum.main, 0.12),
                        },
                    },
                },
            },

            MuiTabs: {
                styleOverrides: {
                    indicator: {
                        backgroundColor: sea.main,
                        height: 3,
                        borderRadius: 3,
                    },
                },
            },

            MuiTab: {
                styleOverrides: {
                    root: {
                        textTransform: "none",

                        "&.Mui-selected": {
                            color: plum.main,
                        },
                    },
                },
            },

            MuiCheckbox: {
                styleOverrides: {
                    root: {
                        "&.Mui-checked": {
                            color: sea.main,
                        },
                    },
                },
            },

            MuiSwitch: {
                styleOverrides: {
                    switchBase: {
                        "&.Mui-checked": {
                            color: sea.main,

                            "& + .MuiSwitch-track": {
                                backgroundColor: sea.main,
                            },
                        },
                    },
                },
            },
        },
    });

// Utility: row hover style using theme tokens
export const rowHover: (theme: Theme) => SxProps<Theme> = (theme: Theme) => {
    return {
        '&:hover': {
            backgroundColor: theme.palette.action.hover,
        }
    } as SxProps<Theme>;
}
