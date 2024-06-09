import * as React from 'react';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import MenuIcon from '@mui/icons-material/Menu';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import {CurrentUserDisplay} from "../application/components/CurrentUserDisplay";
import ApplicationAndDomainPicker from "./ApplicationAndDomainPicker";
import {useCurrentUser} from "./users/use-current-user";
import {Backdrop, CircularProgress, Link, Menu, MenuItem, Stack, styled, useTheme} from "@mui/material";
import {useApplication} from "./applications/use-application";
import {applications} from "./applications/applications-access";
import {useApplicationNavigation} from "./use-application-navigation";
import {useState} from "react";
import {useQuery} from "@apollo/client";
import {Settings, SettingsQuery} from "../types";

interface Props {
    /**
     * Injected by the documentation to work in an iframe.
     * You won't need it on your project.
     */
    window?: () => Window;
    children: React.ReactNode;
}

export const SettingsContext = React.createContext<Settings>({accountantSettings: {isCompany: false}});

export const ShowBackdropContext = React.createContext<{
    showBackdrop: boolean,
    setShowBackdrop: (value: (((prevState: boolean) => boolean) | boolean)) => void
}>({showBackdrop: false, setShowBackdrop: () => false});

export default function DrawerAppBar(props: Props) {
    const {changePage} = useApplicationNavigation();
    const {currentApplicationId} = useApplication();
    const theme = useTheme();
    const {window, children} = props;
    const [mobileOpen, setMobileOpen] = React.useState(false);
    const {deleteCurrentUser} = useCurrentUser();
    const [menuAnchor, setMenuAnchor] = React.useState<null | HTMLElement>(null);
    const [showInfiniteBackdrop, setShowInfiniteBackdrop] = useState(false);
    const handleDrawerToggle = () => {
        setMobileOpen((prevState) => !prevState);
    };

    const {loading, error, data} = useQuery<SettingsQuery>(Settings);

    const container = window !== undefined ? () => window().document.body : undefined;

    const Offset = styled('div')(({theme}) => theme.mixins.toolbar);

    const hideWhenXS = {display: {xs: 'none', sm: 'block'}};
    if (!data) return (<></>);
    return (
        <SettingsContext.Provider value={data.settings}>
            <Stack direction="column" sx={{width: '100%'}}>
                <Backdrop
                    sx={{color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1}}
                    open={showInfiniteBackdrop}>
                    <CircularProgress color="inherit"/>
                </Backdrop>
                <AppBar position="sticky">
                    <Toolbar>
                        <IconButton
                            color="inherit"
                            aria-label="open drawer"
                            edge="start"
                            onClick={handleDrawerToggle}
                            sx={{mr: 2, display: {sm: 'none'}}}
                        >
                            <MenuIcon/>
                        </IconButton>
                        {
                            Array.from(applications.get(currentApplicationId)?.pages?.values() || []).map(page => (
                                <Button color="inherit" onClick={() => changePage(page.links[0])} key={page.id}>
                                    {page.label}
                                </Button>))
                        }
                        <Box sx={{flexGrow: 1}}/>
                        <ApplicationAndDomainPicker sx={hideWhenXS}/>
                        <Button key="account"
                                variant="text"
                                onClick={(event) => setMenuAnchor(event.currentTarget)}
                                color="inherit"
                                sx={hideWhenXS}>
                            <Typography>
                                <CurrentUserDisplay/>
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
                        <Link href={process.env.REACT_APP_OLD_APP_URL}
                              sx={{color: theme.palette.primary.contrastText, ...hideWhenXS}}>STARA APLIKACJA</Link>
                    </Toolbar>
                </AppBar>
                <Drawer
                    container={container}
                    variant="temporary"
                    open={mobileOpen}
                    onClose={handleDrawerToggle}
                >
                    {(
                        <Box
                            sx={{textAlign: 'center', backgroundColor: theme.palette.primary.main}}>
                            <Button key="logout" onClick={(event) => {
                                setMenuAnchor(event.currentTarget);
                                handleDrawerToggle();
                            }}
                                    sx={{color: theme.palette.primary.contrastText}}>
                                <Typography>
                                    <CurrentUserDisplay/>
                                </Typography>
                            </Button>
                            <Divider/>
                            <ApplicationAndDomainPicker onClose={handleDrawerToggle}
                                                        sx={{color: theme.palette.primary.contrastText}}/>
                            <Divider/>
                            <Link href={process.env.REACT_APP_OLD_APP_URL}
                                  sx={{color: theme.palette.primary.contrastText}}>STARA
                                APLIKACJA</Link>
                        </Box>
                    )}
                </Drawer>
                <Offset>
                    <ShowBackdropContext.Provider
                        value={{showBackdrop: showInfiniteBackdrop, setShowBackdrop: setShowInfiniteBackdrop}}>
                        {children}
                    </ShowBackdropContext.Provider>
                </Offset>
            </Stack>
        </SettingsContext.Provider>
    );
}