import {ErrorDisplay} from '../application/components/QueryState';
import * as React from 'react';
import {useState} from 'react';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import MenuIcon from '@mui/icons-material/Menu';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import {CurrentUserDisplay} from '../application/components/CurrentUserDisplay';
import {useCurrentUser} from './users/use-current-user';
import {Link, Menu, MenuItem, Stack, styled, useTheme} from '@mui/material';
import {useApplication} from './applications/use-application';
import {ApplicationId, applications} from './applications/applications-access';
import {useApplicationNavigation} from './use-application-navigation';
import {useApplicationAndDomain} from './use-application-and-domain';
import {ThemeMode, useThemeMode} from './ThemeContext';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import BrightnessAutoIcon from '@mui/icons-material/BrightnessAuto';
import PaletteIcon from '@mui/icons-material/Palette';
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
import Grid from '@mui/material/Grid';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import {useApplicationFavicon} from './applications/use-application-favicon';
import {StandOutText} from '../application/components/StandOutText';

interface Props {
    /**
     * Injected by the documentation to work in an iframe.
     * You won't need it on your project.
     */
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
    const {currentDomainPublicId, changeCurrentSettings} = useApplicationAndDomain();
    const theme = useTheme();
    const {mode, setMode, themeVariantId, setThemeVariant, availableVariants} = useThemeMode();
    const {window, children} = props;
    const [mobileOpen, setMobileOpen] = React.useState(false);
    const {user, deleteCurrentUser} = useCurrentUser();
    const [menuAnchor, setMenuAnchor] = React.useState<null | HTMLElement>(null);
    const [appMenuAnchor, setAppMenuAnchor] = React.useState<null | HTMLElement>(null);
    const [domainMenuAnchor, setDomainMenuAnchor] = React.useState<null | HTMLElement>(null);
    const [themeVariantAnchor, setThemeVariantAnchor] = React.useState<null | HTMLElement>(null);
    const [drawerAppExpanded, setDrawerAppExpanded] = useState(false);
    const [drawerDomainExpanded, setDrawerDomainExpanded] = useState(false);
    const [drawerUserExpanded, setDrawerUserExpanded] = useState(false);
    const handleDrawerToggle = () => {
        setMobileOpen(prevState => !prevState);
    };

    const cycleThemeMode = () => {
        const modes: ThemeMode[] = ['light', 'dark', 'auto'];
        const currentIndex = modes.indexOf(mode);
        setMode(modes[(currentIndex + 1) % modes.length]);
    };

    const themeIcon =
        mode === 'light' ? <LightModeIcon /> : mode === 'dark' ? <DarkModeIcon /> : <BrightnessAutoIcon />;

    const {
        loading: domainsDataLoading,
        error: domainsDataError,
        data: domainsData,
        refetch: domainsDataRefetch,
    } = useQuery<DomainsDataQuery>(DomainsData);

    const [acceptInvitationToDomainMutation] = useMutation<AcceptInvitationToDomainMutation>(AcceptInvitationToDomain);
    const [rejectInvitationToDomainMutation] = useMutation<RejectInvitationToDomainMutation>(RejectInvitationToDomain);

    const container = window !== undefined ? () => window().document.body : undefined;

    const Offset = styled('div')(({theme}) => theme.mixins.toolbar);

    const hideWhenXS = {display: {xs: 'none', sm: 'block'}};

    if (domainsDataLoading) {
        return <></>;
    } else if (domainsDataError) {
        return <ErrorDisplay error={domainsDataError} />;
    } else if (domainsData) {
        return (
            <DomainsContext.Provider
                value={{
                    domains: [...(domainsData.settings.domains as Domain[])],
                    refreshDomains: domainsDataRefetch,
                }}
            >
                <Stack direction="column" sx={{width: '100dvw', height: '100dvh'}}>
                    <AppBar position="sticky">
                        {domainsData.domainInvitations.length > 0 && (
                            <Toolbar sx={{backgroundColor: theme.palette.info.main}}>
                                <Grid
                                    container
                                    sx={{width: domainsData.domainInvitations.length > 1 ? '350px' : '250px'}}
                                >
                                    <Grid size={12}>
                                        Nowe zaproszenia do{' '}
                                        {domainsData.domainInvitations.length > 1
                                            ? ' następujących domen:'
                                            : ' domeny:'}
                                    </Grid>
                                    {domainsData.domainInvitations.map(invitation => (
                                        <Grid container justifyContent={'space-between'} style={{width: '100%'}}>
                                            <Grid>{invitation.name}</Grid>
                                            <Grid container direction={'row'}>
                                                <Grid
                                                    onClick={() => {
                                                        acceptInvitationToDomainMutation({
                                                            variables: {domainPublicId: invitation.publicId},
                                                        }).then(deleteCurrentUser);
                                                    }}
                                                >
                                                    <CheckIcon />
                                                </Grid>
                                                <Grid
                                                    onClick={() => {
                                                        rejectInvitationToDomainMutation({
                                                            variables: {domainPublicId: invitation.publicId},
                                                        }).then(domainsDataRefetch);
                                                    }}
                                                >
                                                    <CloseIcon />
                                                </Grid>
                                            </Grid>
                                        </Grid>
                                    ))}
                                </Grid>
                            </Toolbar>
                        )}
                        <Toolbar>
                            <IconButton
                                color="inherit"
                                aria-label="open drawer"
                                edge="start"
                                onClick={handleDrawerToggle}
                                sx={{mr: 2, display: {sm: 'none'}}}
                            >
                                <MenuIcon />
                            </IconButton>
                            <Box
                                sx={{
                                    display: {xs: 'none', sm: 'flex'},
                                    flexWrap: 'wrap',
                                    gap: 0.5,
                                    alignItems: 'center',
                                }}
                            >
                                <Button
                                    onClick={e => setAppMenuAnchor(e.currentTarget)}
                                    sx={t => ({
                                        color:
                                            themeVariantId === 'aurora'
                                                ? t.palette.secondary.main
                                                : t.palette.secondary.light,
                                        backgroundColor:
                                            themeVariantId === 'aurora'
                                                ? 'transparent'
                                                : `${t.palette.secondary.light}50`,
                                        whiteSpace: 'nowrap',
                                        px: 2,
                                        py: 0.5,
                                        '&:hover': {
                                            backgroundColor:
                                                themeVariantId === 'aurora'
                                                    ? 'transparent'
                                                    : `${t.palette.secondary.light}40`,
                                            textDecoration: themeVariantId === 'aurora' ? 'underline' : 'none',
                                            textUnderlineOffset: '4px',
                                        },
                                    })}
                                >
                                    {themeVariantId === 'aurora' ? (
                                        <StandOutText standOutBy="bold">
                                            {applications.get(currentApplicationId)?.name || currentApplicationId}
                                        </StandOutText>
                                    ) : (
                                        applications.get(currentApplicationId)?.name || currentApplicationId
                                    )}
                                </Button>
                                <Menu
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
                                {Array.from(applications.get(currentApplicationId)?.pages?.values() || []).map(page => (
                                    <Button
                                        onClick={() => changePage(page.links[0])}
                                        key={page.id}
                                        sx={t => ({
                                            color:
                                                themeVariantId === 'aurora'
                                                    ? t.palette.secondary.main
                                                    : t.palette.secondary.light,
                                            backgroundColor:
                                                themeVariantId === 'aurora'
                                                    ? 'transparent'
                                                    : `${t.palette.secondary.light}25`,
                                            whiteSpace: 'nowrap',
                                            px: 2,
                                            py: 0.5,
                                            '&:hover': {
                                                backgroundColor:
                                                    themeVariantId === 'aurora'
                                                        ? 'transparent'
                                                        : `${t.palette.secondary.light}50`,
                                                textDecoration: themeVariantId === 'aurora' ? 'underline' : 'none',
                                                textUnderlineOffset: '4px',
                                            },
                                        })}
                                    >
                                        {page.label}
                                    </Button>
                                ))}
                            </Box>
                            <Box sx={{flexGrow: 1}} />
                            <IconButton
                                color="inherit"
                                onClick={cycleThemeMode}
                                aria-label="Toggle theme"
                                title={`Theme: ${mode}`}
                            >
                                {themeIcon}
                            </IconButton>
                            <IconButton
                                color="inherit"
                                onClick={e => setThemeVariantAnchor(e.currentTarget)}
                                aria-label="Change theme variant"
                                title={`Variant: ${availableVariants.find(v => v.id === themeVariantId)?.label}`}
                            >
                                <PaletteIcon />
                            </IconButton>
                            <Menu
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
                            <Button
                                key="account"
                                variant="text"
                                onClick={event => setMenuAnchor(event.currentTarget)}
                                color="inherit"
                                sx={hideWhenXS}
                            >
                                <Typography>
                                    <CurrentUserDisplay />
                                </Typography>
                            </Button>
                            <Menu
                                id="menu-appbar"
                                anchorEl={menuAnchor}
                                anchorOrigin={{
                                    vertical: 'top',
                                    horizontal: 'right',
                                }}
                                keepMounted
                                transformOrigin={{
                                    vertical: 'top',
                                    horizontal: 'right',
                                }}
                                open={Boolean(menuAnchor)}
                                onClose={() => {
                                    setMenuAnchor(null);
                                }}
                            >
                                <MenuItem onClick={deleteCurrentUser}>
                                    <Typography>Wyloguj</Typography>
                                </MenuItem>
                            </Menu>
                            <Link
                                href={process.env.REACT_APP_OLD_APP_URL}
                                sx={{color: 'primary.contrastText', ...hideWhenXS}}
                            >
                                STARA APLIKACJA
                            </Link>
                            {(() => {
                                const domains = [...(domainsData.settings.domains as Domain[])].filter(
                                    d => d.name !== ''
                                );
                                const currentDomain = domains.find(d => d.publicId === currentDomainPublicId);
                                return domains.length > 0 ? (
                                    <>
                                        <Button
                                            onClick={e => setDomainMenuAnchor(e.currentTarget)}
                                            sx={t => ({
                                                ...hideWhenXS,
                                                color:
                                                    themeVariantId === 'aurora'
                                                        ? t.palette.secondary.main
                                                        : t.palette.secondary.light,
                                                backgroundColor:
                                                    themeVariantId === 'aurora'
                                                        ? 'transparent'
                                                        : `${t.palette.secondary.light}22`,
                                                ml: 1,
                                                px: 2,
                                                py: 0.5,
                                                '&:hover': {
                                                    backgroundColor:
                                                        themeVariantId === 'aurora'
                                                            ? 'transparent'
                                                            : `${t.palette.secondary.light}40`,
                                                    textDecoration: themeVariantId === 'aurora' ? 'underline' : 'none',
                                                    textUnderlineOffset: '4px',
                                                },
                                            })}
                                        >
                                            {currentDomain?.name || 'Domena'}
                                        </Button>
                                        <Menu
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
                                ) : null;
                            })()}
                        </Toolbar>
                    </AppBar>
                    <Drawer container={container} variant="temporary" open={mobileOpen} onClose={handleDrawerToggle}>
                        {
                            <Box sx={{textAlign: 'center', backgroundColor: 'primary.main', minWidth: 250}}>
                                <Button
                                    onClick={() => setDrawerUserExpanded(!drawerUserExpanded)}
                                    sx={{color: 'primary.contrastText', width: '100%', py: 1.5}}
                                >
                                    <Typography>
                                        <CurrentUserDisplay />
                                    </Typography>
                                </Button>
                                {drawerUserExpanded && (
                                    <Button
                                        onClick={() => {
                                            deleteCurrentUser();
                                            handleDrawerToggle();
                                        }}
                                        sx={{
                                            color: 'primary.contrastText',
                                            width: '100%',
                                            py: 0.5,
                                            pl: 4,
                                            opacity: 0.7,
                                        }}
                                    >
                                        Wyloguj
                                    </Button>
                                )}
                                <Divider sx={{borderColor: 'rgba(255,255,255,0.2)'}} />
                                <Button
                                    onClick={() => setDrawerAppExpanded(!drawerAppExpanded)}
                                    sx={{color: 'primary.contrastText', width: '100%', py: 1}}
                                >
                                    Aplikacja: {applications.get(currentApplicationId)?.name || currentApplicationId}
                                </Button>
                                {drawerAppExpanded &&
                                    user!.applications.map(app => (
                                        <Button
                                            key={app.id}
                                            onClick={() => {
                                                changeCurrentSettings(app.id as ApplicationId, currentDomainPublicId!);
                                                setDrawerAppExpanded(false);
                                                handleDrawerToggle();
                                            }}
                                            sx={{
                                                color: 'primary.contrastText',
                                                width: '100%',
                                                py: 0.5,
                                                pl: 4,
                                                opacity: app.id === currentApplicationId ? 1 : 0.7,
                                            }}
                                        >
                                            {app.id === currentApplicationId ? (
                                                <StandOutText standOutBy="bold">{app.name}</StandOutText>
                                            ) : (
                                                app.name
                                            )}
                                        </Button>
                                    ))}
                                <Divider sx={{borderColor: 'rgba(255,255,255,0.2)'}} />
                                {Array.from(applications.get(currentApplicationId)?.pages?.values() || []).map(page => (
                                    <Button
                                        key={page.id}
                                        onClick={() => {
                                            changePage(page.links[0]);
                                            handleDrawerToggle();
                                        }}
                                        sx={{color: 'primary.contrastText', width: '100%', py: 1}}
                                    >
                                        {page.label}
                                    </Button>
                                ))}
                                <Divider sx={{borderColor: 'rgba(255,255,255,0.2)'}} />
                                <Link
                                    href={process.env.REACT_APP_OLD_APP_URL}
                                    sx={{color: 'primary.contrastText', display: 'block', py: 1}}
                                >
                                    STARA APLIKACJA
                                </Link>
                                {(() => {
                                    const domains = [...(domainsData.settings.domains as Domain[])].filter(
                                        d => d.name !== ''
                                    );
                                    const currentDomain = domains.find(d => d.publicId === currentDomainPublicId);
                                    return domains.length > 0 ? (
                                        <>
                                            <Divider sx={{borderColor: 'rgba(255,255,255,0.2)'}} />
                                            <Button
                                                onClick={() => setDrawerDomainExpanded(!drawerDomainExpanded)}
                                                sx={{color: 'primary.contrastText', width: '100%', py: 1}}
                                            >
                                                Domena: {currentDomain?.name || '—'}
                                            </Button>
                                            {drawerDomainExpanded &&
                                                domains.map(domain => (
                                                    <Button
                                                        key={domain.publicId}
                                                        onClick={() => {
                                                            changeCurrentSettings(
                                                                currentApplicationId,
                                                                domain.publicId
                                                            );
                                                            setDrawerDomainExpanded(false);
                                                            handleDrawerToggle();
                                                        }}
                                                        sx={{
                                                            color: 'primary.contrastText',
                                                            width: '100%',
                                                            py: 0.5,
                                                            pl: 4,
                                                            opacity:
                                                                domain.publicId === currentDomainPublicId ? 1 : 0.7,
                                                        }}
                                                    >
                                                        {domain.publicId === currentDomainPublicId ? (
                                                            <StandOutText standOutBy="bold">{domain.name}</StandOutText>
                                                        ) : (
                                                            domain.name
                                                        )}
                                                    </Button>
                                                ))}
                                        </>
                                    ) : null;
                                })()}
                            </Box>
                        }
                    </Drawer>
                    <Offset sx={{flexGrow: 1}}>{children}</Offset>
                </Stack>
            </DomainsContext.Provider>
        );
    } else {
        return <></>;
    }
}
