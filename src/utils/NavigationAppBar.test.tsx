import {render, screen} from '@testing-library/react';
import type {ReactNode} from 'react';
import {NavigationAppBar} from './NavigationAppBar';

jest.mock('@mui/material/AppBar', () => ({
    __esModule: true,
    default: ({children, enableColorOnDark}: {children?: ReactNode; enableColorOnDark?: boolean}) => (
        <header data-testid="mui-app-bar" data-enable-color-on-dark={String(enableColorOnDark)}>
            {children}
        </header>
    ),
}));

describe('NavigationAppBar', () => {
    it('zachowuje kolor główny w ciemnym trybie MUI', () => {
        render(<NavigationAppBar position="sticky">Nawigacja</NavigationAppBar>);

        expect(screen.getByTestId('mui-app-bar')).toHaveAttribute('data-enable-color-on-dark', 'true');
    });
});
