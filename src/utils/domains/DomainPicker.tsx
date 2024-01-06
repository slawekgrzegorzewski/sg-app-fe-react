import {Menu, MenuItem, SelectChangeEvent, Theme, useTheme} from "@mui/material";
import * as React from "react";
import {useDomain} from "./use-domain";
import {useCurrentUser} from "../users/use-current-user";
import {SxProps} from "@mui/system";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";

export default function DomainPicker(properties: {
    sx?: SxProps<Theme>;
}) {
    const theme = useTheme();
    const {user} = useCurrentUser();
    const {currentDomainId, changeCurrentDomainId} = useDomain();
    const [menuAnchor, setMenuAnchor] = React.useState<null | HTMLElement>(null);
    const domain = user!.user.domains.find(domain => domain.id === currentDomainId!)?.name || "";
    const openMenu = (event: React.MouseEvent<HTMLElement>) => {
        setMenuAnchor(event.currentTarget);

    };
    const closeMenu = () => {
        setMenuAnchor(null);
    };

    function changeDomain(domainId: number) {
        changeCurrentDomainId(domainId);
        closeMenu();
    }


    return (<>
        <Button sx={{...properties.sx, color: theme.palette.primary.contrastText}} variant="text" onClick={openMenu}>
            {domain}
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
            onClose={closeMenu}
        >
            {user!.user.domains.map((domain) => (
                <MenuItem onClick={() => changeDomain(domain.id)}>
                    <Typography>{domain.name}</Typography>
                </MenuItem>
            ))}
        </Menu>
    </>);
}