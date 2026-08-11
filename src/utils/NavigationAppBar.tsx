import AppBar from '@mui/material/AppBar';
import type {AppBarProps} from '@mui/material/AppBar';

export const DRAWER_SECONDARY_ITEM_OPACITY = 0.85;

export function NavigationAppBar(props: AppBarProps) {
    return <AppBar {...props} enableColorOnDark />;
}
