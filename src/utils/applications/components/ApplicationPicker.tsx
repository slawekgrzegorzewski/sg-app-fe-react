import {Menu, MenuItem, Theme} from "@mui/material";
import {useCurrentUser} from "../../users/use-current-user";
import * as React from "react";
import {useApplication} from "../use-application";
import {SxProps} from "@mui/system";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import {ApplicationId} from "../applications-access";

export default function ApplicationPicker(properties: {
    sx?: SxProps<Theme>;
}) {
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

    function changeApplication(applicationId: ApplicationId) {
        changeCurrentApplicationId(applicationId);
        closeMenu();

    }

    return (<>
        <Button sx={{...properties.sx}} variant="text" onClick={openMenu} color="inherit">
            <Typography>{application}</Typography>
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