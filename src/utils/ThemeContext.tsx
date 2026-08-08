import React, {createContext, useCallback, useContext, useEffect, useMemo, useState} from "react";
import {PaletteMode, ThemeProvider, useMediaQuery} from "@mui/material";
import {buildTheme as buildDefaultTheme} from "./theme/theme";
import {buildTheme as buildPlumTheme} from "./theme/theme2";
import {buildTheme as buildMidnightLedgerTheme} from "./theme/theme3";
import {buildTheme as buildAuroraTheme} from "./theme/theme4";
import {Theme} from "@mui/material/styles";

export type ThemeMode = 'light' | 'dark' | 'auto';

export interface ThemeVariantDef {
    id: string;
    label: string;
    buildTheme: (mode: PaletteMode) => Theme;
}

export const themeVariants: ThemeVariantDef[] = [
    {id: 'default', label: 'Slate', buildTheme: buildDefaultTheme},
    {id: 'plum', label: 'Plum', buildTheme: buildPlumTheme},
    {id: 'midnight-ledger', label: 'Midnight Ledger', buildTheme: buildMidnightLedgerTheme},
    {id: 'aurora', label: 'Aurora', buildTheme: buildAuroraTheme},
];

interface ThemeModeContextType {
    mode: ThemeMode;
    setMode: (mode: ThemeMode) => void;
    resolvedMode: PaletteMode;
    themeVariantId: string;
    setThemeVariant: (id: string) => void;
    availableVariants: ThemeVariantDef[];
}

const MODE_STORAGE_KEY = 'sg-app-theme-mode';
const VARIANT_STORAGE_KEY = 'sg-app-theme-variant';

const ThemeModeContext = createContext<ThemeModeContextType>({
    mode: 'auto',
    setMode: () => {},
    resolvedMode: 'light',
    themeVariantId: 'default',
    setThemeVariant: () => {},
    availableVariants: themeVariants,
});

export function useThemeMode() {
    return useContext(ThemeModeContext);
}

function getStoredMode(): ThemeMode {
    try {
        const stored = localStorage.getItem(MODE_STORAGE_KEY);
        if (stored === 'light' || stored === 'dark' || stored === 'auto') {
            return stored;
        }
    } catch {
        // localStorage unavailable
    }
    return 'auto';
}

function getStoredVariant(): string {
    try {
        const stored = localStorage.getItem(VARIANT_STORAGE_KEY);
        if (stored && themeVariants.some(v => v.id === stored)) {
            return stored;
        }
    } catch {
        // localStorage unavailable
    }
    return 'default';
}

export function AppThemeProvider({children}: { children: React.ReactNode }) {
    const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
    const [mode, setModeState] = useState<ThemeMode>(getStoredMode);
    const [themeVariantId, setThemeVariantIdState] = useState<string>(getStoredVariant);

    const setMode = useCallback((newMode: ThemeMode) => {
        setModeState(newMode);
        try {
            localStorage.setItem(MODE_STORAGE_KEY, newMode);
        } catch {
            // ignore
        }
    }, []);

    const setThemeVariant = useCallback((id: string) => {
        if (themeVariants.some(v => v.id === id)) {
            setThemeVariantIdState(id);
            try {
                localStorage.setItem(VARIANT_STORAGE_KEY, id);
            } catch {
                // ignore
            }
        }
    }, []);

    const resolvedMode: PaletteMode = useMemo(() => {
        if (mode === 'auto') {
            return prefersDarkMode ? 'dark' : 'light';
        }
        return mode;
    }, [mode, prefersDarkMode]);

    const theme = useMemo(() => {
        const variant = themeVariants.find(v => v.id === themeVariantId) || themeVariants[0];
        return variant.buildTheme(resolvedMode);
    }, [resolvedMode, themeVariantId]);

    // Update meta theme-color for mobile browsers
    useEffect(() => {
        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta) {
            meta.setAttribute('content', theme.palette.primary.main);
        }
    }, [theme]);

    return (
        <ThemeModeContext.Provider value={{
            mode,
            setMode,
            resolvedMode,
            themeVariantId,
            setThemeVariant,
            availableVariants: themeVariants,
        }}>
            <ThemeProvider theme={theme}>
                {children}
            </ThemeProvider>
        </ThemeModeContext.Provider>
    );
}
