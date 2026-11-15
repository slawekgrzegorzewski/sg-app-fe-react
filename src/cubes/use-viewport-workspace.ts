import {useEffect, useRef} from 'react';

export function useViewportWorkspace(ready = true) {
    const workspaceRef = useRef<HTMLDivElement | null>(null);
    useEffect(
            () => {
                const workspace = workspaceRef.current;
                if (!ready || !workspace) {
                    return;
                }
                const updateHeight = () => {
                    const workspaceTop = workspace.getBoundingClientRect().top + window.scrollY;
                    const availableHeight = window.innerHeight - workspaceTop - 16;
                    workspace.style.setProperty(
                            '--workspace-height',
                            `${Math.max(320, availableHeight)}px`);
                };
                updateHeight();
                window.addEventListener('resize', updateHeight);
                const observer = typeof ResizeObserver === 'undefined'
                        ? null
                        : new ResizeObserver(updateHeight);
                if (workspace.parentElement) {
                    observer?.observe(workspace.parentElement);
                }
                return () => {
                    window.removeEventListener('resize', updateHeight);
                    observer?.disconnect();
                };
            },
            [ready]);
    return workspaceRef;
}
