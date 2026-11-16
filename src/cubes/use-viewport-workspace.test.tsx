import {act, render, screen} from '@testing-library/react';
import {useViewportWorkspace} from './use-viewport-workspace';

function Workspace() {
    const ref = useViewportWorkspace();
    return <div data-testid="workspace-parent"><div ref={ref} data-testid="workspace"/></div>;
}

const originalResizeObserver = window.ResizeObserver;
let notify: () => void;
let frame: FrameRequestCallback | null;
const observe = jest.fn();
const disconnect = jest.fn();

beforeEach(() => {
    jest.clearAllMocks();
    frame = null;
    window.ResizeObserver = jest.fn().mockImplementation(callback => {
        notify = callback;
        return {observe, disconnect};
    });
    jest.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => {
        frame = callback;
        return 1;
    });
    jest.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {
        frame = null;
    });
    jest.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({top: 200} as DOMRect);
});

afterEach(() => {
    jest.restoreAllMocks();
    window.ResizeObserver = originalResizeObserver;
});

test('odkłada zmianę wysokości poza callback obserwatora i łączy powiadomienia w jedną klatkę', () => {
    render(<Workspace/>);
    const workspace = screen.getByTestId('workspace');
    const initialHeight = workspace.style.getPropertyValue('--workspace-height');
    const setProperty = jest.spyOn(workspace.style, 'setProperty');
    jest.mocked(HTMLElement.prototype.getBoundingClientRect).mockReturnValue({top: 250} as DOMRect);
    act(() => {
        notify();
        notify();
        window.dispatchEvent(new Event('resize'));
    });
    expect(workspace.style.getPropertyValue('--workspace-height')).toBe(initialHeight);
    expect(setProperty).not.toHaveBeenCalled();
    expect(requestAnimationFrame).toHaveBeenCalledTimes(1);
    act(() => frame!(0));
    expect(workspace.style.getPropertyValue('--workspace-height')).toBe(`${window.innerHeight - 250 - 16}px`);
    expect(setProperty).toHaveBeenCalledTimes(1);
    act(() => {
        notify();
        frame!(0);
    });
    expect(setProperty).toHaveBeenCalledTimes(1);
});

test('anuluje oczekującą aktualizację i odłącza obserwatora po opuszczeniu widoku', () => {
    const {unmount} = render(<Workspace/>);
    expect(observe).toHaveBeenCalledWith(screen.getByTestId('workspace-parent'));
    act(() => notify());
    unmount();
    expect(cancelAnimationFrame).toHaveBeenCalledWith(1);
    expect(disconnect).toHaveBeenCalledTimes(1);
    expect(frame).toBeNull();
    window.dispatchEvent(new Event('resize'));
    expect(requestAnimationFrame).toHaveBeenCalledTimes(1);
});
