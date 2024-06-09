import {useContext} from "react";
import {SettingsContext} from "../utils/DrawerAppBar";
import Grid from "@mui/material/Unstable_Grid2";
import {SuppliersManagement} from "./SuppliersManagement";
import {Box} from "@mui/material";
import {ClientsManagement} from "./ClientsManagement";

export function AccountantSettings() {
    const settings = useContext(SettingsContext);

    return (<>
        <Grid container justifyContent={'center'}>
            <Grid container xs={6} direction={'column'} sx={{width: '300px'}}>
                {
                    settings.accountantSettings.isCompany
                        ? <Box>
                            <ClientsManagement></ClientsManagement>
                            <SuppliersManagement></SuppliersManagement>
                        </Box>
                        : null
                }
            </Grid>
            <Grid container xs={6} direction={'column'} sx={{width: '300px'}}>

            </Grid>
        </Grid>
    </>);

}