import {Menu, MenuItem, Theme, useTheme} from "@mui/material";
import {useCurrentUser} from "../../users/use-current-user";
import * as React from "react";
import {useApplication} from "../use-application";
import {SxProps} from "@mui/system";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";

export default function ApplicationPicker(properties: {
    sx?: SxProps<Theme>;
}) {
    const theme = useTheme();
    const {currentApplicationId, changeCurrentApplicationId} = useApplication();
    const {user} = useCurrentUser();
    const [menuAnchor, setMenuAnchor] = React.useState<null | HTMLElement>(null);
    const application = user!.applications.find(application => application.id === currentApplicationId!)?.name || "";

    const openMenu = (event: React.MouseEvent<HTMLElement>) => {
        setMenuAnchor(event.currentTarget);

    };
    const closeMenu = () => {
        setMenuAnchor(null);

    };

    function changeApplication(applicationId: string) {
        changeCurrentApplicationId(applicationId);
        closeMenu();

    }

    return (<>
        <Button sx={{...properties.sx, color: theme.palette.primary.contrastText}} variant="text" onClick={openMenu}>
            {application}
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
            {user!.applications.map((application) => (
                <MenuItem onClick={() => changeApplication(application.id)}>
                    <Typography>{application.name}</Typography>
                </MenuItem>
            ))}
        </Menu>
    </>);
}