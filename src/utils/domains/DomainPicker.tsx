import {Theme} from "@mui/material";
import * as React from "react";
import {useState} from "react";
import {useDomain} from "./use-domain";
import {useCurrentUser} from "../users/use-current-user";
import {SxProps} from "@mui/system";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import PickDialog from "../dialogs/PickDialog";

export default function DomainPicker(properties: {
    sx?: SxProps<Theme>;
}) {
    const {user} = useCurrentUser();
    const {currentDomainId, changeCurrentDomainId} = useDomain();
    const [dialogOpen, setDialogOpen] = useState(false);
    const domain = user!.user.domains.find(domain => domain.id === currentDomainId!)?.name || "";

    function changeDomain(domainId: string) {
        changeCurrentDomainId(Number(domainId));
        setDialogOpen(false);
    }


    return (<>
        <Button sx={{...properties.sx}} variant="text" onClick={() => setDialogOpen(true)} color="inherit">
            <Typography>{domain}</Typography>
        </Button>
        <PickDialog
            options={user!.user.domains.map((application) => {
                return {
                    id: application.id.toString(),
                    value: application.name
                };
            })}
            selectedValue={currentDomainId.toString()}
            open={dialogOpen}
            onClose={changeDomain}
        />
    </>);
}