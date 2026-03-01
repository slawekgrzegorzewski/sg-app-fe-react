import {useEffect, useRef, useState} from "react";

export function useWakeLock() {
    const [wakeLock, setWakeLock] = useState<WakeLockSentinel | null>(null);
    const wakeLockRef = useRef<WakeLockSentinel | null>(null);

    const requestWakeLock = async () => {
        try {
            if (!wakeLock) {
                const wakeLockSentinel = await navigator.wakeLock.request("screen");
                wakeLockSentinel.addEventListener("release", () => {
                    setWakeLock(null);
                    wakeLockRef.current = null;
                });
                setWakeLock(wakeLockSentinel);
                wakeLockRef.current = wakeLockSentinel;
            }
        } catch (err) {
            console.error("Wake Lock error:", err);
            setWakeLock(null);
            wakeLockRef.current = null;
        }
    };

    const releaseWakeLock = async () => {
        wakeLock?.release();
        wakeLockRef.current = null;
    };

    useEffect(() => {
        return () => {
            wakeLockRef.current?.release();
        };
    }, []);

    return [wakeLock, requestWakeLock, releaseWakeLock] as [WakeLockSentinel | null, () => Promise<void>, () => Promise<void>];
}