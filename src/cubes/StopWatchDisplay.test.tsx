import {render, screen} from '@testing-library/react';
import {formatStopWatchTime, StopWatchDisplay} from './StopWatchDisplay';

describe('StopWatchDisplay', () => {
    it('formats stopwatch time with fixed-width seconds and milliseconds', () => {
        expect(formatStopWatchTime(65_007)).toBe('01:05.007');
        expect(formatStopWatchTime(-1)).toBe('00:00.000');
    });

    it('renders an accessible segmented display', () => {
        const {container} = render(<StopWatchDisplay currentTimeInMillis={65_007} variant="h2" />);

        expect(screen.getByRole('timer', {name: '01:05.007'})).toBeInTheDocument();
        expect(container.querySelectorAll('[data-digit]')).toHaveLength(7);
        expect(container.querySelectorAll('[data-digit="1"] rect[opacity="1"]')).toHaveLength(2);
        expect(container.querySelectorAll('[data-digit="0"]')[0].querySelectorAll('rect[opacity="1"]')).toHaveLength(6);
    });
});
