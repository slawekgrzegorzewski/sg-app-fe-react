import {ErrorDisplay, LoadingIndicator} from '../application/components/QueryState';
import * as React from 'react';
import {useId, useState} from 'react';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import {CurrentUserDisplay} from '../application/components/CurrentUserDisplay';
import {useCurrentUser} from './users/use-current-user';
import {Collapse, List, ListItemButton, ListItemText, Menu, MenuItem, Stack, Tooltip} from '@mui/material';
import {useApplication} from './applications/use-application';
import {ApplicationId, ApplicationPage, applications} from './applications/applications-access';
import {useApplicationNavigation} from './use-application-navigation';
import {useApplicationAndDomain} from './use-application-and-domain';
import {ThemeMode, useThemeMode} from './ThemeContext';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import BrightnessAutoIcon from '@mui/icons-material/BrightnessAuto';
import PaletteIcon from '@mui/icons-material/Palette';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import {useMutation, useQuery} from '@apollo/client/react';
import {
    AcceptInvitationToDomain,
    AcceptInvitationToDomainMutation,
    Domain,
    DomainsData,
    DomainsDataQuery,
    RejectInvitationToDomain,
    RejectInvitationToDomainMutation,
} from '../types';
import {useApplicationFavicon} from './applications/use-application-favicon';
import {useApplicationTitle} from './applications/use-application-title';
import {useParams} from 'react-router-dom';

interface Props {
    window?: () => Window;
    children: React.ReactNode;
}

type DomainsContextType = {
    domains: Domain[];
    refreshDomains: () => void;
};

export const DomainsContext = React.createContext<DomainsContextType>({
    domains: [],
    refreshDomains: () => {},
});

export default function DrawerAppBar(props: Props) {
    const {changePage} = useApplicationNavigation();
    const {currentApplicationId} = useApplication();
    useApplicationFavicon(currentApplicationId);
    useApplicationTitle(currentApplicationId);
    const {currentDomainPublicId, changeCurrentSettings} = useApplicationAndDomain();
    const {mode, setMode, themeVariantId, setThemeVariant, availableVariants} = useThemeMode();
    const {window: windowProp, children} = props;
    const {page: currentPage} = useParams();
    const [mobileOpen, setMobileOpen] = React.useState(false);
    const {user, deleteCurrentUser} = useCurrentUser();
    const [menuAnchor, setMenuAnchor] = React.useState<null | HTMLElement>(null);
    const [appMenuAnchor, setAppMenuAnchor] = React.useState<null | HTMLElement>(null);
    const [domainMenuAnchor, setDomainMenuAnchor] = React.useState<null | HTMLElement>(null);
    const [themeVariantAnchor, setThemeVariantAnchor] = React.useState<null | HTMLElement>(null);
    const [drawerAppExpanded, setDrawerAppExpanded] = useState(false);
    const [drawerDomainExpanded, setDrawerDomainExpanded] = useState(false);
    const [drawerUserExpanded, setDrawerUserExpanded] = useState(false);

    const appMenuId = useId();
    const domainMenuId = useId();
    const userMenuId = useId();
    const themeVariantMenuId = useId();
    const drawerAppSectionId = useId();
    const drawerDomainSectionId = useId();
    const drawerUserSectionId = useId();

    const handleDrawerToggle = () => {
        setMobileOpen(prevState => !prevState);
    };

    const cycleThemeMode = () => {
        const modes: ThemeMode[] = ['light', 'dark', 'auto'];
        const currentIndex = modes.indexOf(mode);
        setMode(modes[(currentIndex + 1) % modes.length]);
    };

    const themeModeLabel = mode === 'light' ? 'Jasny' : mode === 'dark' ? 'Ciemny' : 'Automatyczny';
    const themeIcon =
        mode === 'light' ? <LightModeIcon /> : mode === 'dark' ? <DarkModeIcon /> : <BrightnessAutoIcon />;

    const isPageActive = (page: ApplicationPage): boolean => {
        const normalizedCurrent = currentPage || '';
        return page.links.includes(normalizedCurrent);
    };

    const {
        loading: domainsDataLoading,
        error: domainsDataError,
        data: domainsData,
        refetch: domainsDataRefetch,
    } = useQuery<DomainsDataQuery>(DomainsData);

    const [acceptInvitationToDomainMutation] = useMutation<AcceptInvitationToDomainMutation>(AcceptInvitationToDomain);
    const [rejectInvitationToDomainMutation] = useMutation<RejectInvitationToDomainMutation>(RejectInvitationToDomain);

    const container = windowProp !== undefined ? () => windowProp().document.body : undefined;

    if (domainsDataLoading) {
        return (
            <Stack direction="column" sx={{width: '100%', minHeight: '100dvh'}}>
                <AppBar position="sticky">
                    <Toolbar>
                        <LoadingIndicator label="Ładowanie..." />
                    </Toolbar>
                </AppBar>
            </Stack>
        );
    }

    if (domainsDataError) {
        return <ErrorDisplay error={domainsDataError} onRetry={() => void domainsDataRefetch()} />;
    }

    if (!domainsData) {
        return <></>;
    }

    const domains = [...(domainsData.settings.domains as Domain[])].filter(d => d.name !== '');
    const currentDomain = domains.find(d => d.publicId === currentDomainPublicId);
    const pages = Array.from(applications.get(currentApplicationId)?.pages?.values() || []);

    const drawerDivider = <Divider sx={{borderColor: 'rgba(255,255,255,0.2)'}} />;

    const drawer = (
        <Stack sx={{height: '100%', bgcolor: 'primary.main', color: 'primary.contrastText'}}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{px: 2, py: 1}}>
                <Typography variant="h6" component="span">
                    {applications.get(currentApplicationId)?.name || currentApplicationId}
                </Typography>
                <IconButton
                    onClick={handleDrawerToggle}
                    aria-label="Zamknij menu"
                    sx={{color: 'primary.contrastText'}}
                >
                    <CloseIcon />
                </IconButton>
            </Stack>
            {drawerDivider}

            {/* Pages navigation */}
            <List component="nav" aria-label="Nawigacja stron" disablePadding>
                {pages.map(page => {
                    const active = isPageActive(page);
                    return (
                        <ListItemButton
                            key={page.id}
                            selected={active}
                            aria-current={active ? 'page' : undefined}
                            onClick={() => {
                                changePage(page.links[0]);
                                handleDrawerToggle();
                            }}
                            sx={{
                                color: 'primary.contrastText',
                                py: 1,
                                '&.Mui-selected': {
                                    bgcolor: 'rgba(255,255,255,0.15)',
                                    '&:hover': {bgcolor: 'rgba(255,255,255,0.2)'},
                                },
                            }}
                        >
                            <ListItemText
                                primary={page.label}
                                slotProps={{primary: {fontWeight: active ? 700 : 400}}}
                            />
                        </ListItemButton>
                    );
                })}
            </List>

            {drawerDivider}

            {/* Application section */}
            <ListItemButton
                onClick={() => setDrawerAppExpanded(!drawerAppExpanded)}
                aria-expanded={drawerAppExpanded}
                aria-controls={drawerAppSectionId}
                sx={{color: 'primary.contrastText', py: 1}}
            >
                <ListItemText
                    primary={`Aplikacja: ${applications.get(currentApplicationId)?.name || currentApplicationId}`}
                />
                {drawerAppExpanded ? <ExpandLess /> : <ExpandMore />}
            </ListItemButton>
            <Collapse in={drawerAppExpanded} id={drawerAppSectionId}>
                <List disablePadding>
                    {user!.applications.map(app => (
                        <ListItemButton
                            key={app.id}
                            selected={app.id === currentApplicationId}
                            onClick={() => {
                                changeCurrentSettings(app.id as ApplicationId, currentDomainPublicId!);
                                setDrawerAppExpanded(false);
                                handleDrawerToggle();
                            }}
                            sx={{
                                color: 'primary.contrastText',
                                pl: 4,
                                py: 0.75,
                                opacity: app.id === currentApplicationId ? 1 : 0.8,
                                '&.Mui-selected': {
                                    bgcolor: 'rgba(255,255,255,0.12)',
                                    '&:hover': {bgcolor: 'rgba(255,255,255,0.18)'},
                                },
                            }}
                        >
                            <ListItemText
                                primary={app.name}
                                slotProps={{primary: {fontWeight: app.id === currentApplicationId ? 700 : 400}}}
                            />
                        </ListItemButton>
                    ))}
                </List>
            </Collapse>

            {/* Domain section */}
            {domains.length > 0 && (
                <>
                    {drawerDivider}
                    <ListItemButton
                        onClick={() => setDrawerDomainExpanded(!drawerDomainExpanded)}
                        aria-expanded={drawerDomainExpanded}
                        aria-controls={drawerDomainSectionId}
                        sx={{color: 'primary.contrastText', py: 1}}
                    >
                        <ListItemText primary={`Domena: ${currentDomain?.name || '—'}`} />
                        {drawerDomainExpanded ? <ExpandLess /> : <ExpandMore />}
                    </ListItemButton>
                    <Collapse in={drawerDomainExpanded} id={drawerDomainSectionId}>
                        <List disablePadding>
                            {domains.map(domain => (
                                <ListItemButton
                                    key={domain.publicId}
                                    selected={domain.publicId === currentDomainPublicId}
                                    onClick={() => {
                                        changeCurrentSettings(currentApplicationId, domain.publicId);
                                        setDrawerDomainExpanded(false);
                                        handleDrawerToggle();
                                    }}
                                    sx={{
                                        color: 'primary.contrastText',
                                        pl: 4,
                                        py: 0.75,
                                        opacity: domain.publicId === currentDomainPublicId ? 1 : 0.8,
                                        '&.Mui-selected': {
                                            bgcolor: 'rgba(255,255,255,0.12)',
                                            '&:hover': {bgcolor: 'rgba(255,255,255,0.18)'},
                                        },
                                    }}
                                >
                                    <ListItemText
                                        primary={domain.name}
                                        slotProps={{primary: {fontWeight: domain.publicId === currentDomainPublicId ? 700 : 400}}}
                                    />
                                </ListItemButton>
                            ))}
                        </List>
                    </Collapse>
                </>
            )}

            {drawerDivider}

            {/* User section */}
            <ListItemButton
                onClick={() => setDrawerUserExpanded(!drawerUserExpanded)}
                aria-expanded={drawerUserExpanded}
                aria-controls={drawerUserSectionId}
                sx={{color: 'primary.contrastText', py: 1}}
            >
                <ListItemText>
                    <CurrentUserDisplay />
                </ListItemText>
                {drawerUserExpanded ? <ExpandLess /> : <ExpandMore />}
            </ListItemButton>
            <Collapse in={drawerUserExpanded} id={drawerUserSectionId}>
                <List disablePadding>
                    <ListItemButton
                        onClick={() => {
                            deleteCurrentUser();
                            handleDrawerToggle();
                        }}
                        sx={{color: 'primary.contrastText', pl: 4, py: 0.75, opacity: 0.85}}
                    >
                        <ListItemText primary="Wyloguj" />
                    </ListItemButton>
                </List>
            </Collapse>
        </Stack>
    );

    return (
        <DomainsContext.Provider
            value={{
                domains: [...(domainsData.settings.domains as Domain[])],
                refreshDomains: domainsDataRefetch,
            }}
        >
            <Stack direction="column" sx={{width: '100%', minHeight: '100dvh'}}>
                <AppBar position="sticky">
                    {domainsData.domainInvitations.length > 0 && (
                        <Toolbar
                            sx={{
                                bgcolor: 'info.main',
                                color: 'info.contrastText',
                                flexWrap: 'wrap',
                                gap: 1,
                                py: 1,
                            }}
                        >
                            <Stack spacing={1} sx={{width: '100%'}}>
                                <Typography variant="body2" fontWeight={600}>
                                    {domainsData.domainInvitations.length > 1
                                        ? 'Nowe zaproszenia do następujących domen:'
                                        : 'Nowe zaproszenie do domeny:'}
                                </Typography>
                                {domainsData.domainInvitations.map(invitation => (
                                    <Stack
                                        key={invitation.publicId}
                                        direction="row"
                                        alignItems="center"
                                        justifyContent="space-between"
                                        gap={1}
                                        sx={{minWidth: 0}}
                                    >
                                        <Typography
                                            variant="body2"
                                            sx={{minWidth: 0, overflowWrap: 'anywhere'}}
                                        >
                                            {invitation.name}
                                        </Typography>
                                        <Stack direction="row" spacing={0.5} sx={{flexShrink: 0}}>
                                            <Tooltip title="Akceptuj zaproszenie">
                                                <IconButton
                                                    size="small"
                                                    aria-label={`Akceptuj zaproszenie do domeny ${invitation.name}`}
                                                    onClick={() => {
                                                        acceptInvitationToDomainMutation({
                                                            variables: {domainPublicId: invitation.publicId},
                                                        }).then(deleteCurrentUser);
                                                    }}
                                                    sx={{color: 'inherit'}}
                                                >
                                                    <CheckRoundedIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title="Odrzuć zaproszenie">
                                                <IconButton
                                                    size="small"
                                                    aria-label={`Odrzuć zaproszenie do domeny ${invitation.name}`}
                                                    onClick={() => {
                                                        rejectInvitationToDomainMutation({
                                                            variables: {domainPublicId: invitation.publicId},
                                                        }).then(domainsDataRefetch);
                                                    }}
                                                    sx={{color: 'inherit'}}
                                                >
                                                    <CloseRoundedIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        </Stack>
                                    </Stack>
                                ))}
                            </Stack>
                        </Toolbar>
                    )}
                    <Toolbar>
                        <IconButton
                            color="inherit"
                            aria-label="Otwórz menu"
                            edge="start"
                            onClick={handleDrawerToggle}
                            sx={{mr: 2, display: {sm: 'none'}}}
                        >
                            <MenuIcon />
                        </IconButton>

                        {/* Desktop navigation */}
                        <Box
                            component="nav"
                            aria-label="Nawigacja aplikacji"
                            sx={{
                                display: {xs: 'none', sm: 'flex'},
                                flexWrap: 'wrap',
                                gap: 0.5,
                                alignItems: 'center',
                            }}
                        >
                            <Button
                                onClick={e => setAppMenuAnchor(e.currentTarget)}
                                aria-haspopup="true"
                                aria-expanded={Boolean(appMenuAnchor)}
                                aria-controls={Boolean(appMenuAnchor) ? appMenuId : undefined}
                                endIcon={<ArrowDropDownIcon />}
                                sx={{
                                    color: 'primary.contrastText',
                                    whiteSpace: 'nowrap',
                                    px: 1.5,
                                    py: 0.5,
                                    mr: 1,
                                    fontWeight: 700,
                                }}
                            >
                                {applications.get(currentApplicationId)?.name || currentApplicationId}
                            </Button>
                            <Menu
                                id={appMenuId}
                                anchorEl={appMenuAnchor}
                                open={Boolean(appMenuAnchor)}
                                onClose={() => setAppMenuAnchor(null)}
                            >
                                {user!.applications.map(app => (
                                    <MenuItem
                                        key={app.id}
                                        selected={app.id === currentApplicationId}
                                        onClick={() => {
                                            changeCurrentSettings(app.id as ApplicationId, currentDomainPublicId!);
                                            setAppMenuAnchor(null);
                                        }}
                                    >
                                        {app.name}
                                    </MenuItem>
                                ))}
                            </Menu>
                            {pages.map(page => {
                                const active = isPageActive(page);
                                return (
                                    <Button
                                        key={page.id}
                                        onClick={() => changePage(page.links[0])}
                                        aria-current={active ? 'page' : undefined}
                                        sx={{
                                            color: 'secondary.light',
                                            whiteSpace: 'nowrap',
                                            px: 2,
                                            py: 0.5,
                                            fontWeight: active ? 700 : 400,
                                            bgcolor: active ? 'action.selected' : 'transparent',
                                            '&:hover': {
                                                bgcolor: 'action.hover',
                                            },
                                        }}
                                    >
                                        {page.label}
                                    </Button>
                                );
                            })}
                        </Box>

                        <Box sx={{flexGrow: 1}} />

                        {/* Theme mode toggle */}
                        <Tooltip title={`Zmień tryb motywu (${themeModeLabel})`}>
                            <IconButton
                                color="inherit"
                                onClick={cycleThemeMode}
                                aria-label={`Zmień tryb motywu, aktualny: ${themeModeLabel}`}
                            >
                                {themeIcon}
                            </IconButton>
                        </Tooltip>

                        {/* Theme variant picker */}
                        <Tooltip title="Zmień wariant motywu">
                            <IconButton
                                color="inherit"
                                onClick={e => setThemeVariantAnchor(e.currentTarget)}
                                aria-label="Zmień wariant motywu"
                                aria-haspopup="true"
                                aria-expanded={Boolean(themeVariantAnchor)}
                                aria-controls={Boolean(themeVariantAnchor) ? themeVariantMenuId : undefined}
                            >
                                <PaletteIcon />
                            </IconButton>
                        </Tooltip>
                        <Menu
                            id={themeVariantMenuId}
                            anchorEl={themeVariantAnchor}
                            open={Boolean(themeVariantAnchor)}
                            onClose={() => setThemeVariantAnchor(null)}
                        >
                            {availableVariants.map(variant => (
                                <MenuItem
                                    key={variant.id}
                                    selected={variant.id === themeVariantId}
                                    onClick={() => {
                                        setThemeVariant(variant.id);
                                        setThemeVariantAnchor(null);
                                    }}
                                >
                                    {variant.label}
                                </MenuItem>
                            ))}
                        </Menu>

                        {/* User menu (desktop) */}
                        <Button
                            variant="text"
                            onClick={event => setMenuAnchor(event.currentTarget)}
                            color="inherit"
                            aria-haspopup="true"
                            aria-expanded={Boolean(menuAnchor)}
                            aria-controls={Boolean(menuAnchor) ? userMenuId : undefined}
                            endIcon={<ArrowDropDownIcon />}
                            sx={{display: {xs: 'none', sm: 'inline-flex'}}}
                        >
                            <CurrentUserDisplay />
                        </Button>
                        <Menu
                            id={userMenuId}
                            anchorEl={menuAnchor}
                            anchorOrigin={{vertical: 'bottom', horizontal: 'right'}}
                            transformOrigin={{vertical: 'top', horizontal: 'right'}}
                            open={Boolean(menuAnchor)}
                            onClose={() => setMenuAnchor(null)}
                        >
                            <MenuItem onClick={deleteCurrentUser}>
                                <Typography>Wyloguj</Typography>
                            </MenuItem>
                        </Menu>

                        {/* Domain picker (desktop) */}
                        {domains.length > 0 && (
                            <>
                                <Button
                                    onClick={e => setDomainMenuAnchor(e.currentTarget)}
                                    aria-haspopup="true"
                                    aria-expanded={Boolean(domainMenuAnchor)}
                                    aria-controls={Boolean(domainMenuAnchor) ? domainMenuId : undefined}
                                    endIcon={<ArrowDropDownIcon />}
                                    sx={{
                                        display: {xs: 'none', sm: 'inline-flex'},
                                        color: 'secondary.light',
                                        ml: 1,
                                        px: 1.5,
                                        py: 0.5,
                                    }}
                                >
                                    {currentDomain?.name || 'Domena'}
                                </Button>
                                <Menu
                                    id={domainMenuId}
                                    anchorEl={domainMenuAnchor}
                                    open={Boolean(domainMenuAnchor)}
                                    onClose={() => setDomainMenuAnchor(null)}
                                >
                                    {domains.map(domain => (
                                        <MenuItem
                                            key={domain.publicId}
                                            selected={domain.publicId === currentDomainPublicId}
                                            onClick={() => {
                                                changeCurrentSettings(currentApplicationId, domain.publicId);
                                                setDomainMenuAnchor(null);
                                            }}
                                        >
                                            {domain.name}
                                        </MenuItem>
                                    ))}
                                </Menu>
                            </>
                        )}
                    </Toolbar>
                </AppBar>

                <Drawer
                    container={container}
                    variant="temporary"
                    open={mobileOpen}
                    onClose={handleDrawerToggle}
                    ModalProps={{keepMounted: true}}
                    sx={{
                        '& .MuiDrawer-paper': {
                            width: {xs: '100%', sm: 300},
                            height: '100%',
                        },
                    }}
                >
                    {drawer}
                </Drawer>

                <Box component="main" sx={{flexGrow: 1, minWidth: 0, width: '100%'}}>
                    {children}
                </Box>
            </Stack>
        </DomainsContext.Provider>
    );
}
