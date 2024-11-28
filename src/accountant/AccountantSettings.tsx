import React, {useContext} from "react";
import {SettingsContext} from "../utils/DrawerAppBar";
import {SuppliersManagement} from "./SuppliersManagement";
import {Box} from "@mui/material";
import Grid from "@mui/material/Grid2";
import {ClientsManagement} from "./ClientsManagement";
import {AccountsManagement} from "./AccountsManagement";

export function AccountantSettings() {
    const settings = useContext(SettingsContext);

    return (<>
        <Box justifyContent={'center'}>
            <Grid container spacing={{xs: 6}} direction={'column'} sx={{width: '300px'}}>
                {
                    settings.accountantSettings.isCompany
                        ? <Box>
                            <ClientsManagement></ClientsManagement>
                            <SuppliersManagement></SuppliersManagement>
                        </Box>
                        : null
                }
            </Grid>
            <Grid container spacing={{xs: 6}} direction={'column'} sx={{width: '300px'}}>
                <AccountsManagement/>
            </Grid>
        </Box>
    </>);

}