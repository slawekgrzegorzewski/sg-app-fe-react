import React, {createContext, useCallback, useContext, useEffect, useMemo, useState} from "react";
import {PaletteMode, ThemeProvider, useMediaQuery} from "@mui/material";
import {buildTheme} from "./theme";

export type ThemeMode = 'light' | 'dark' | 'auto';

interface ThemeModeContextType {
    mode: ThemeMode;
    setMode: (mode: ThemeMode) => void;
    resolvedMode: PaletteMode;
}

const STORAGE_KEY = 'sg-app-theme-mode';

const ThemeModeContext = createContext<ThemeModeContextType>({
    mode: 'auto',
    setMode: () => {},
    resolvedMode: 'light',
});

export function useThemeMode() {
    return useContext(ThemeModeContext);
}

function getStoredMode(): ThemeMode {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored === 'light' || stored === 'dark' || stored === 'auto') {
            return stored;
        }
    } catch {
        // localStorage unavailable
    }
    return 'auto';
}

export function AppThemeProvider({children}: { children: React.ReactNode }) {
    const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
    const [mode, setModeState] = useState<ThemeMode>(getStoredMode);

    const setMode = useCallback((newMode: ThemeMode) => {
        setModeState(newMode);
        try {
            localStorage.setItem(STORAGE_KEY, newMode);
        } catch {
            // ignore
        }
    }, []);

    const resolvedMode: PaletteMode = useMemo(() => {
        if (mode === 'auto') {
            return prefersDarkMode ? 'dark' : 'light';
        }
        return mode;
    }, [mode, prefersDarkMode]);

    const theme = useMemo(() => buildTheme(resolvedMode), [resolvedMode]);

    // Update meta theme-color for mobile browsers
    useEffect(() => {
        const meta = document.querySelector('meta[name="theme-color"]');
        const color = resolvedMode === 'dark' ? '#1E1E2E' : '#475569';
        if (meta) {
            meta.setAttribute('content', color);
        }
    }, [resolvedMode]);

    return (
        <ThemeModeContext.Provider value={{mode, setMode, resolvedMode}}>
            <ThemeProvider theme={theme}>
                {children}
            </ThemeProvider>
        </ThemeModeContext.Provider>
    );
}
