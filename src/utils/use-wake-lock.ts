import {useCallback, useEffect, useRef, useState} from "react";
import {logWarning} from "./logger";

export function useWakeLock() {
    const [wakeLock, setWakeLock] = useState<WakeLockSentinel | null>(null);
    const wakeLockRef = useRef<WakeLockSentinel | null>(null);
   const requestInFlight = useRef(false);

    const requestWakeLock = useCallback(async () => {
        if (wakeLockRef.current || requestInFlight.current) {
            return;
        }
        requestInFlight.current = true;
        try {
            const wakeLockSentinel = await navigator.wakeLock.request("screen");
            wakeLockSentinel.addEventListener("release", () => {
                setWakeLock(null);
                wakeLockRef.current = null;
            });
            wakeLockRef.current = wakeLockSentinel;
            setWakeLock(wakeLockSentinel);
        } catch (err) {
            logWarning("Wake Lock could not be acquired", err);
            wakeLockRef.current = null;
            setWakeLock(null);
        } finally {
            requestInFlight.current = false;
        }
    }, []);

    const releaseWakeLock = useCallback(async () => {
        const sentinel = wakeLockRef.current;
        wakeLockRef.current = null;
        setWakeLock(null);
        await sentinel?.release();
    }, []);

    useEffect(() => {
        return () => {
            wakeLockRef.current?.release();
            wakeLockRef.current = null;
        };
    }, []);

    return [wakeLock, requestWakeLock, releaseWakeLock] as [WakeLockSentinel | null, () => Promise<void>, () => Promise<void>];
}
