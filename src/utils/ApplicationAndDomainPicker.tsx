import {Stack, Theme} from "@mui/material";
import {useCurrentUser} from "./users/use-current-user";
import * as React from "react";
import {useContext, useState} from "react";
import {SxProps} from "@mui/system";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import {ApplicationId} from "./applications/applications-access";
import MultiPickDialog from "./dialogs/MultiPickDialog";
import {useApplicationAndDomain} from "./use-application-and-domain";
import {DomainsContext} from "./DrawerAppBar";

export default function ApplicationAndDomainPicker(properties: {
    sx?: SxProps<Theme>;
    fullScreen?: boolean;
    onClose?: () => void;
}) {
    const {currentApplicationId, currentDomainPublicId, changeCurrentSettings} = useApplicationAndDomain();
    const {user} = useCurrentUser();
    const [dialogOpen, setDialogOpen] = useState(false);

    const {domains} = useContext(DomainsContext);

    const application = user!.applications.find(application => application.id === currentApplicationId!)!;
    const domain = domains
        .filter(domain => domain.name !== '')
        .find(domain => domain.publicId === currentDomainPublicId)!;

    function changeSettings(selected: string[]) {
        const applicationId = selected[0] as ApplicationId;
        const domainPublicId = selected[1];
        changeCurrentSettings(applicationId, domainPublicId);
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
                {domain && <Typography sx={{textAlign: 'left'}}>Domena: {domain.name}</Typography>}
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
                domains
                    .map((domain) => {
                        return {
                            id: domain.publicId,
                            value: domain.name
                        }
                    })
            ]}
            selectedValue={[currentApplicationId, currentDomainPublicId!]}
            open={dialogOpen}
            onClose={changeSettings}
            onCancel={cancel}
            fullScreen={properties.fullScreen || false}
        />
    </>);
}