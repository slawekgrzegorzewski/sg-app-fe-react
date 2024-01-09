import {Stack, Theme} from "@mui/material";
import {useCurrentUser} from "./users/use-current-user";
import * as React from "react";
import {useState} from "react";
import {SxProps} from "@mui/system";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import {ApplicationId} from "./applications/applications-access";
import MultiPickDialog from "./dialogs/MultiPickDialog";
import {useApplicationAndDomain} from "./use-application-and-domain";

export default function ApplicationAndDomainPicker(properties: {
    sx?: SxProps<Theme>;
    fullScreen?: boolean;
    onClose?: () => void;
}) {
    const {currentApplicationId, currentDomainId, changeCurrentSettings} = useApplicationAndDomain();
    const {user} = useCurrentUser();
    const [dialogOpen, setDialogOpen] = useState(false);

    const application = user!.applications.find(application => application.id === currentApplicationId!)!;
    const domain = user!.user.domains.find(domain => domain.id === currentDomainId)!;

    function changeSettings(selected: string[]) {
        const applicationId = selected[0] as ApplicationId;
        const domainId = Number(selected[1]);
        console.log(applicationId);
        console.log(domainId);
        changeCurrentSettings(applicationId, domainId);
        setDialogOpen(false);
        properties.onClose?.();
    }

    function cancel() {
        setDialogOpen(false);
        properties.onClose?.();
    }

    return (<>
        <Button sx={{...properties.sx}} variant="text" onClick={() => {
            setDialogOpen(true);
        }} color="inherit">
            <Stack direction="column">
                <Typography sx={{textAlign: 'left'}}>Aplikacja: {application.name}</Typography>
                <Typography sx={{textAlign: 'left'}}>Domena: {domain.name}</Typography>
            </Stack>
        </Button>
        <MultiPickDialog
            options={[
                user!.applications.map((application) => {
                    return {
                        id: application.id,
                        value: application.name
                    };
                }),
                user!.user.domains.map((application) => {
                    return {
                        id: application.id.toString(),
                        value: application.name
                    }
                })
            ]}
            selectedValue={[currentApplicationId, currentDomainId.toString()]}
            open={dialogOpen}
            onClose={changeSettings}
            onCancel={cancel}
            fullScreen={properties.fullScreen || false}
        />
    </>);
}