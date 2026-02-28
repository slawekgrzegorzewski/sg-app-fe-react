import {useEffect, useState} from "react";

export function useIsTouchDevice() {
    const [isTouch, setIsTouch] = useState(false);

    useEffect(() => {
        const checkTouch =
            'ontouchstart' in window ||
            navigator.maxTouchPoints > 0

        setIsTouch(checkTouch);
    }, []);

    return isTouch;
}