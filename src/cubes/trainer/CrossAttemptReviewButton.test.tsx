import {act, fireEvent, render, screen, waitFor, within} from '@testing-library/react';
import {ThemeProvider} from '@mui/material';
import {themeVariants} from '../../utils/ThemeContext';
import {CrossAttemptReviewButton} from './CrossAttemptReviewButton';

const review = `## Najważniejsza wskazówka
Zaplanuj **cały krzyż**, zanim zaczniesz.

- Usuń zbędny ruch.
- Ćwicz płynność.

| Wykonano | Propozycja |
| --- | --- |
| 9 ruchów | 6 ruchów |

\`R U F2\`

> Dobra kontrola końcówki.
`;
const props = {review, performedAt: '2026-11-19 16:15:00.000', durationMs: 4321};
const themes = themeVariants.flatMap(variant =>
    (['light', 'dark'] as const).map(mode => ({name: `${variant.id}/${mode}`, theme: variant.buildTheme(mode)})));

test.each(themes)('renderuje formatowanie oceny w motywie $name', ({theme}) => {
    render(<ThemeProvider theme={theme}><CrossAttemptReviewButton {...props}/></ThemeProvider>);
    fireEvent.click(screen.getByRole('button', {name: 'Pokaż ocenę AI'}));
    const dialog = within(screen.getByRole('dialog', {name: /Ocena AI · CROSS/}));
    expect(dialog.getByRole('heading', {name: 'Najważniejsza wskazówka'})).toBeInTheDocument();
    expect(dialog.getByText('cały krzyż').tagName).toBe('STRONG');
    expect(dialog.getAllByRole('listitem')).toHaveLength(2);
    expect(dialog.getByRole('table')).toBeInTheDocument();
    expect(dialog.getByText('R U F2').tagName).toBe('CODE');
});

test.each(['Zamknij', 'Zamknij ocenę AI', 'Escape'])('zamyka dialog przez %s i przywraca fokus', async action => {
    render(<CrossAttemptReviewButton {...props}/>);
    const trigger = screen.getByRole('button', {name: 'Pokaż ocenę AI'});
    act(() => trigger.focus());
    fireEvent.click(trigger);
    if (action === 'Escape') {
        fireEvent.keyDown(screen.getByRole('dialog'), {key: 'Escape', code: 'Escape'});
    } else {
        fireEvent.click(screen.getByRole('button', {name: action}));
    }
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
});

test('nie wykonuje HTML ani nie ładuje obrazów z treści oceny i blokuje niebezpieczne linki', () => {
    render(<CrossAttemptReviewButton {...props} review={'<script>alert(1)</script>\n\n[Zły link](javascript:alert%281%29)\n\n![Obraz](https://example.invalid/image.png)\n\n[Opis](https://example.invalid/cross)'}/>);
    fireEvent.click(screen.getByRole('button', {name: 'Pokaż ocenę AI'}));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('<script>alert(1)</script>')).toBeVisible();
    expect(within(dialog).queryByRole('img')).not.toBeInTheDocument();
    const badLink = within(dialog).getByText('Zły link');
    expect(badLink).not.toHaveAttribute('href');
    expect(within(dialog).getByRole('link', {name: 'Opis'})).toHaveAttribute('rel', 'noopener noreferrer');
});
