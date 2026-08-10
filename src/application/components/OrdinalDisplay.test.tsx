import {render, screen} from '@testing-library/react';
import {OrdinalDisplay} from './OrdinalDisplay';

describe('OrdinalDisplay', () => {
    it.each([
        [1, 'pierwszy'],
        [10, 'dziesiąty'],
        [20, 'dwudziesty'],
        [21, 'dwudziesty pierwszy'],
        [30, 'trzydziesty'],
        [31, 'trzydziesty pierwszy'],
    ])('displays %i as a Polish ordinal', (value, expected) => {
        render(<OrdinalDisplay value={value} />);

        expect(screen.getByText(expected)).toBeVisible();
    });
});
