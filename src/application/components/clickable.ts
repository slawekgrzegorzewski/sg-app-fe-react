import * as React from "react";

/**
 * Props that turn a plain container (Stack, Grid, Typography) into something a keyboard
 * and a screen reader can actually use.
 *
 * Preferring this over a real `<button>` avoids having to unpick the surrounding MUI
 * layout, while still exposing the element as a button, making it focusable, and
 * activating it on Enter and Space the way a button does.
 *
 * @param onClick invoked on click, Enter and Space
 * @param label accessible name, needed when the visible content is not descriptive
 * @param expanded set for disclosure controls so the state is announced
 */
export function clickableProps(onClick: () => void, label?: string, expanded?: boolean) {
    return {
        role: 'button',
        tabIndex: 0,
        'aria-label': label,
        'aria-expanded': expanded,
        onClick: onClick,
        onKeyDown: activateOnEnterOrSpace(onClick)
    };
}

/**
 * A key handler that activates on Enter and Space, the way a real button does.
 *
 * Use this on a container that owns the click handler but whose focusable child is not a
 * native `<button>`, since such a child only fires a click when the pointer is used.
 *
 * @param onActivate invoked on Enter and Space
 */
export function activateOnEnterOrSpace(onActivate: (event: React.KeyboardEvent) => void) {
    return (event: React.KeyboardEvent) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;

        // Space would otherwise scroll the page.
        event.preventDefault();
        onActivate(event);
    };
}
