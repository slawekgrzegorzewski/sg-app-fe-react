import * as React from 'react';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import CssBaseline from '@mui/material/CssBaseline';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import MenuIcon from '@mui/icons-material/Menu';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import {CurrentUserDisplay} from "../application/CurrentUserDisplay";
import ApplicationPicker from "./applications/components/ApplicationPicker";
import DomainPicker from './domains/DomainPicker';
import {useCurrentUser} from "./users/use-current-user";
import {useTheme} from "@mui/material";

interface Props {
    /**
     * Injected by the documentation to work in an iframe.
     * You won't need it on your project.
     */
    window?: () => Window;
    children: React.ReactNode;
}

const drawerWidth = 240;

export default function DrawerAppBar(props: Props) {
    const theme = useTheme();
    const {window, children} = props;
    const [mobileOpen, setMobileOpen] = React.useState(false);
    const {deleteCurrentUser} = useCurrentUser();

    const navItems = [{
        id: 'logout', label: 'Wyloguj', action: deleteCurrentUser
    }];

    const handleDrawerToggle = () => {
        setMobileOpen((prevState) => !prevState);
    };

    const drawer = (
        <Box onClick={handleDrawerToggle} sx={{textAlign: 'center', backgroundColor: theme.palette.primary.main}}>
            <Typography variant="h6" sx={{my: 2}}>
                <CurrentUserDisplay/>
            </Typography>
            <Divider/>
            <ApplicationPicker/>
            <DomainPicker/>
            <List>
                {navItems.map((item) => (
                    <ListItem key={item.id} disablePadding>
                        <ListItemButton sx={{textAlign: 'center'}} onClick={item.action}>
                            <ListItemText primary={item.label}/>
                        </ListItemButton>
                    </ListItem>
                ))}
            </List>
        </Box>
    );

    const container = window !== undefined ? () => window().document.body : undefined;

    const hideWhenXS = {display: {xs: 'none', sm: 'block'}};
    return (
        <Box sx={{display: 'flex'}}>
            <CssBaseline/>
            <AppBar component="nav">
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
                    <ApplicationPicker sx={hideWhenXS}/>
                    <DomainPicker sx={hideWhenXS}/>
                    <Box sx={{display: {xs: 'none', sm: 'block'}}}>
                        {navItems.map((item) => (
                            <Button key={item.id} sx={{color: '#fff'}} onClick={item.action}>
                                {item.label}
                            </Button>
                        ))}
                    </Box>
                </Toolbar>
            </AppBar>
            <Box component="nav">
                <Drawer
                    container={container}
                    variant="temporary"
                    open={mobileOpen}
                    onClose={handleDrawerToggle}
                    ModalProps={{
                        keepMounted: true, // Better open performance on mobile.
                    }}
                    sx={{
                        display: {xs: 'block', sm: 'none'},
                        '& .MuiDrawer-paper': {boxSizing: 'border-box', width: drawerWidth},
                    }}
                >
                    {drawer}
                </Drawer>
            </Box>
            <Box component="main" sx={{p: 3}}>
                <Toolbar/>
                <Box>
                    {children}
                </Box>
            </Box>
        </Box>
    )
        ;
}