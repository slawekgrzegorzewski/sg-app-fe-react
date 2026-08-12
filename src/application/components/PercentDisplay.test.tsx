import {render, screen} from '@testing-library/react';
import {PercentDisplay} from './PercentDisplay';

describe('PercentDisplay', () => {
    it('wyświetla procent bez artefaktów arytmetyki zmiennoprzecinkowej', () => {
        render(<PercentDisplay rate={0.0725} />);

        expect(screen.getByText('7.25 %', {exact: true})).toBeVisible();
    });
});
