import {Theme} from "@mui/material";
import {useCurrentUser} from "../../users/use-current-user";
import * as React from "react";
import {useState} from "react";
import {useApplication} from "../use-application";
import {SxProps} from "@mui/system";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import {ApplicationId} from "../applications-access";
import PickDialog from "../../dialogs/PickDialog";
export default function ApplicationPicker(properties: {
    sx?: SxProps<Theme>;
}) {
    const {currentApplicationId, changeCurrentApplicationId} = useApplication();
    const {user} = useCurrentUser();
    const application = user!.applications.find(application => application.id === currentApplicationId!)?.name || "";
    const [dialogOpen, setDialogOpen] = useState(false);

    function changeApplication(applicationId: ApplicationId) {
        changeCurrentApplicationId(applicationId);
        setDialogOpen(false);
    }

    return (<>
        <Button sx={{...properties.sx}} variant="text" onClick={() => setDialogOpen(true)} color="inherit">
            <Typography>{application}</Typography>
        </Button>
        <PickDialog
            options={user!.applications.map((application) => {
                return {
                    id: application.id,
                    value: application.name
                };
            })}
            selectedValue={currentApplicationId}
            open={dialogOpen}
            onClose={changeApplication}
        />
    </>);
}