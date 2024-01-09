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
import {CurrentUserDisplay} from "../application/CurrentUserDisplay";
import ApplicationAndDomainPicker from "./ApplicationAndDomainPicker";
import {useCurrentUser} from "./users/use-current-user";
import {Menu, MenuItem, Stack, styled, useTheme} from "@mui/material";

interface Props {
    /**
     * Injected by the documentation to work in an iframe.
     * You won't need it on your project.
     */
    window?: () => Window;
    children: React.ReactNode;
}

export default function DrawerAppBar(props: Props) {
    const theme = useTheme();
    const {window, children} = props;
    const [mobileOpen, setMobileOpen] = React.useState(false);
    const {deleteCurrentUser} = useCurrentUser();
    const [menuAnchor, setMenuAnchor] = React.useState<null | HTMLElement>(null);
    const handleDrawerToggle = () => {
        setMobileOpen((prevState) => !prevState);
    };

    const container = window !== undefined ? () => window().document.body : undefined;

    const Offset = styled('div')(({theme}) => theme.mixins.toolbar);

    const hideWhenXS = {display: {xs: 'none', sm: 'block'}};
    return (
        <Stack direction="column" sx={{width: '100%'}}>
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
                    </Box>
                )}
            </Drawer>
            <Offset>
                {children}
            </Offset>
        </Stack>
    )
        ;
}