import {act, render, screen} from '@testing-library/react';
import {StopWatch} from './StopWatch';

describe('StopWatch', () => {
    afterEach(() => {
        jest.useRealTimers();
        jest.restoreAllMocks();
    });

    it('counts inspection down and overtime up using whole seconds', () => {
        jest.useFakeTimers();
        jest.setSystemTime(1_000_000);
        let nextFrame: FrameRequestCallback = () => undefined;
        jest.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => {
            nextFrame = callback;
            return 1;
        });
        jest.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined);

        const {rerender, unmount} = render(
            <StopWatch showControls={false} inspectionMode="countdown" inspectionAllowanceMillis={15_000} />
        );
        expect(screen.getByRole('timer', {name: '00:15.000'})).toBeInTheDocument();

        act(() => {
            jest.setSystemTime(1_004_250);
            nextFrame(0);
        });
        expect(screen.getByRole('timer', {name: '00:11.000'})).toBeInTheDocument();

        act(() => {
            jest.setSystemTime(1_020_000);
            nextFrame(0);
        });
        expect(screen.getByRole('timer', {name: '00:00.000'})).toBeInTheDocument();

        rerender(<StopWatch showControls={false} inspectionMode="overtime" inspectionAllowanceMillis={15_000} />);
        expect(screen.getByRole('timer', {name: '00:00.000'})).toBeInTheDocument();

        act(() => {
            jest.setSystemTime(1_022_750);
            nextFrame(0);
        });
        expect(screen.getByRole('timer', {name: '00:02.000'})).toBeInTheDocument();

        unmount();
    });
});
