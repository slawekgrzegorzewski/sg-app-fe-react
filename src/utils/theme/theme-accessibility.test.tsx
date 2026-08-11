import {decomposeColor, getContrastRatio} from '@mui/material/styles';
import {DRAWER_SECONDARY_ITEM_OPACITY} from '../NavigationAppBar';
import {themeVariants} from '../ThemeContext';

const MINIMUM_TEXT_CONTRAST = 4.5;
const ACTIVE_ITEM_OVERLAY_OPACITY = 0.15;

interface RgbColor {
    red: number;
    green: number;
    blue: number;
}

function toRgbColor(color: string): RgbColor {
    const decomposed = decomposeColor(color);
    const [red, green, blue] = decomposed.values;

    return {red, green, blue};
}

function blendColors(foreground: string, background: string, opacity: number): string {
    const foregroundRgb = toRgbColor(foreground);
    const backgroundRgb = toRgbColor(background);
    const blendChannel = (foregroundChannel: number, backgroundChannel: number) =>
        Math.round(foregroundChannel * opacity + backgroundChannel * (1 - opacity));

    return `rgb(${blendChannel(foregroundRgb.red, backgroundRgb.red)}, ${blendChannel(
        foregroundRgb.green,
        backgroundRgb.green
    )}, ${blendChannel(foregroundRgb.blue, backgroundRgb.blue)})`;
}

const themeCases = themeVariants.flatMap(variant =>
    (['light', 'dark'] as const).map(mode => ({
        name: `${variant.label} — ${mode === 'light' ? 'jasny' : 'ciemny'}`,
        theme: variant.buildTheme(mode),
    }))
);

describe.each(themeCases)('$name', ({theme}) => {
    it('zapewnia kontrast paska nawigacji i mobilnej szuflady', () => {
        expect(getContrastRatio(theme.palette.primary.contrastText, theme.palette.primary.main)).toBeGreaterThanOrEqual(
            MINIMUM_TEXT_CONTRAST
        );
    });

    it('zapewnia kontrast rozwijanych menu', () => {
        expect(getContrastRatio(theme.palette.text.primary, theme.palette.background.paper)).toBeGreaterThanOrEqual(
            MINIMUM_TEXT_CONTRAST
        );
    });

    it('zapewnia kontrast aktywnych i przygaszonych pozycji mobilnego menu', () => {
        const activeBackground = blendColors(
            theme.palette.primary.contrastText,
            theme.palette.primary.main,
            ACTIVE_ITEM_OVERLAY_OPACITY
        );
        const inactiveText = blendColors(
            theme.palette.primary.contrastText,
            theme.palette.primary.main,
            DRAWER_SECONDARY_ITEM_OPACITY
        );

        expect(getContrastRatio(theme.palette.primary.contrastText, activeBackground)).toBeGreaterThanOrEqual(
            MINIMUM_TEXT_CONTRAST
        );
        expect(getContrastRatio(inactiveText, theme.palette.primary.main)).toBeGreaterThanOrEqual(
            MINIMUM_TEXT_CONTRAST
        );
    });
});
