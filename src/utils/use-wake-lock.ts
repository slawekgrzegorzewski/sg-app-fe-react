import { useEffect, useRef } from "react";

export function useWakeLock() {
    const wakeLockRef = useRef<WakeLockSentinel | null>(null);

    const requestWakeLock = async () => {
        try {
            wakeLockRef.current = await navigator.wakeLock.request("screen");
        } catch (err) {
            console.error("Wake Lock error:", err);
        }
    };

    const releaseWakeLock = async () => {
        wakeLockRef.current?.release();
    };

    useEffect(() => {
        return () => {
            releaseWakeLock();
        };
    }, []);

    return [requestWakeLock, releaseWakeLock];
}