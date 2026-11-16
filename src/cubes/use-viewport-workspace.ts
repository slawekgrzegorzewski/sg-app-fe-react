import {useEffect, useRef} from 'react';

export function useViewportWorkspace(ready = true) {
    const workspaceRef = useRef<HTMLDivElement | null>(null);
    useEffect(
            () => {
                const workspace = workspaceRef.current;
                if (!ready || !workspace) {
                    return;
                }
                let frame: number | null = null;
                const updateHeight = () => {
                    frame = null;
                    const workspaceTop = workspace.getBoundingClientRect().top + window.scrollY;
                    const availableHeight = window.innerHeight - workspaceTop - 16;
                    const height = `${Math.max(320, availableHeight)}px`;
                    if (workspace.style.getPropertyValue('--workspace-height') !== height) {
                        workspace.style.setProperty('--workspace-height', height);
                    }
                };
                updateHeight();
                const scheduleUpdate = () => {
                    if (frame === null) {
                        frame = requestAnimationFrame(updateHeight);
                    }
                };
                window.addEventListener('resize', scheduleUpdate);
                const observer = typeof ResizeObserver === 'undefined'
                        ? null
                        : new ResizeObserver(scheduleUpdate);
                if (workspace.parentElement) {
                    observer?.observe(workspace.parentElement);
                }
                return () => {
                    window.removeEventListener('resize', scheduleUpdate);
                    if (frame !== null) {
                        cancelAnimationFrame(frame);
                    }
                    observer?.disconnect();
                };
            },
            [ready]);
    return workspaceRef;
}
