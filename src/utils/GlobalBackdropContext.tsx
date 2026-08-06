import React, {createContext, useCallback, useContext, useEffect, useMemo, useRef, useState} from "react";
import {Backdrop, CircularProgress, Stack} from "@mui/material";

interface GlobalBackdropContextType {
    showBackdrop: (label?: string) => void;
    hideBackdrop: (label?: string) => void;
}

const GlobalBackdropContext = createContext<GlobalBackdropContextType>({
    showBackdrop: () => {
    },
    hideBackdrop: () => {
    },
});

export const backdropHandle: { show: (label?: string) => void; hide: (label?: string) => void } = {
    show: () => {
    },
    hide: () => {
    },
};

export function GlobalBackdropProvider({children}: { children: React.ReactNode }) {
    const [count, setCount] = useState(0);
    const [labels, setLabels] = useState<string[]>([]);
    const countRef = useRef(0);

    const showBackdrop = useCallback((label?: string) => {
        countRef.current += 1;
        setCount(countRef.current);
        if (label) {
            setLabels(prev => [...prev, label]);
        }
    }, []);

    const hideBackdrop = useCallback((label?: string) => {
        countRef.current = Math.max(0, countRef.current - 1);
        setCount(countRef.current);
        if (label) {
            setLabels(prev => {
                const idx = prev.indexOf(label);
                if (idx === -1) return prev;
                return [...prev.slice(0, idx), ...prev.slice(idx + 1)];
            });
        }
        if (countRef.current === 0) {
            setLabels([]);
        }
    }, []);

    useEffect(() => {
        backdropHandle.show = showBackdrop;
        backdropHandle.hide = hideBackdrop;
        return () => {
            backdropHandle.show = () => {
            };
            backdropHandle.hide = () => {
            };
        };
    }, [showBackdrop, hideBackdrop]);

    const value = useMemo(() => ({showBackdrop, hideBackdrop}), [showBackdrop, hideBackdrop]);

    return (
        <GlobalBackdropContext.Provider value={value}>
            {children}
            <Backdrop
                sx={{color: 'common.white', zIndex: (theme) => theme.zIndex.modal + 1}}
                open={count > 0}
            >
                <Stack direction={'column'} alignItems={'center'}>
                    <CircularProgress color="inherit"/>
                    {labels.map((label, index) => <div key={index}>{label}</div>)}
                </Stack>
            </Backdrop>
        </GlobalBackdropContext.Provider>
    );
}

export function useGlobalBackdrop() {
    return useContext(GlobalBackdropContext);
}
