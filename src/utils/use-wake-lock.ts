import {useEffect, useState} from "react";

export function useWakeLock() {
    const [wakeLock, setWakeLock] = useState<WakeLockSentinel | null>(null);

    const requestWakeLock = async () => {
        try {
            if (!wakeLock) {
                const wakeLockSentinel = await navigator.wakeLock.request("screen");
                wakeLockSentinel.addEventListener("release", () => {
                    setWakeLock(null);
                });
                setWakeLock(wakeLockSentinel);
            }
        } catch (err) {
            console.error("Wake Lock error:", err);
            setWakeLock(null);
        }
    };

    const releaseWakeLock = async () => {
        wakeLock?.release();
        setWakeLock(null);
    };

    useEffect(() => {
        return () => {
            wakeLock?.release();
            setWakeLock(null);
        };
    }, [wakeLock]);

    return [!!wakeLock, requestWakeLock, releaseWakeLock] as [boolean, () => Promise<void>, () => Promise<void>];
}