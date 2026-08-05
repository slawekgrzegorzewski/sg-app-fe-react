import * as React from "react";
import {clickableProps} from "./clickable";

function keyEvent(key: string) {
    return {
        key: key,
        preventDefault: jest.fn()
    } as unknown as React.KeyboardEvent & { preventDefault: jest.Mock };
}

describe('clickableProps', () => {

    it('exposes the element as a focusable button', () => {
        const props = clickableProps(() => {
        });

        expect(props.role).toBe('button');
        expect(props.tabIndex).toBe(0);
    });

    it('passes through the accessible name and expanded state', () => {
        const props = clickableProps(() => {
        }, 'Rozwiń kategorię', true);

        expect(props['aria-label']).toBe('Rozwiń kategorię');
        expect(props['aria-expanded']).toBe(true);
    });

    it('omits aria attributes that were not supplied', () => {
        const props = clickableProps(() => {
        });

        expect(props['aria-label']).toBeUndefined();
        expect(props['aria-expanded']).toBeUndefined();
    });

    it('activates on Enter and Space, as a real button does', () => {
        const onClick = jest.fn();
        const props = clickableProps(onClick);

        const enter = keyEvent('Enter');
        props.onKeyDown(enter);
        expect(onClick).toHaveBeenCalledTimes(1);
        // Space must not also scroll the page.
        expect(enter.preventDefault).toHaveBeenCalled();

        const space = keyEvent(' ');
        props.onKeyDown(space);
        expect(onClick).toHaveBeenCalledTimes(2);
        expect(space.preventDefault).toHaveBeenCalled();
    });

    it('ignores other keys', () => {
        const onClick = jest.fn();
        const props = clickableProps(onClick);

        const tab = keyEvent('Tab');
        props.onKeyDown(tab);

        expect(onClick).not.toHaveBeenCalled();
        expect(tab.preventDefault).not.toHaveBeenCalled();
    });

    it('invokes the same handler for clicks', () => {
        const onClick = jest.fn();

        clickableProps(onClick).onClick();

        expect(onClick).toHaveBeenCalledTimes(1);
    });
});
