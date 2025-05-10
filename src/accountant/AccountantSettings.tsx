import React, {useContext} from "react";
import {SettingsContext} from "../utils/DrawerAppBar";
import {SuppliersManagement} from "./SuppliersManagement";
import Grid from "@mui/material/Grid2";
import {ClientsManagement} from "./ClientsManagement";
import {AccountsManagement} from "./AccountsManagement";
import {Box, Tab, Tabs} from "@mui/material";

export function AccountantSettings() {
    const settings = useContext(SettingsContext);
    const [index, setIndex] = React.useState(0);

    function getCompanySettingsTabIndex() {
        return settings.accountantSettings.isCompany ? 0 : -1;
    }

    function getAccountsManagementTabIndex() {
        return settings.accountantSettings.isCompany ? 1 : 0;
    }

    return (<>
        <Tabs
            value={index}
            onChange={(event: React.SyntheticEvent, newValue: number) => {
                setIndex(newValue)
            }}>
            {
                settings.accountantSettings.isCompany && <Tab label="Firma"/>
            }
            <Tab label="Konta"/>
        </Tabs>
        <Grid container>
            {
                index === getCompanySettingsTabIndex() && <Box>
                    <Grid size={12}><ClientsManagement></ClientsManagement></Grid>
                    <Grid size={12}><SuppliersManagement></SuppliersManagement></Grid>
                </Box>
            }
            {
                index === getAccountsManagementTabIndex() && <Grid size={{xs: 12, sm: 4}}>
                    <AccountsManagement/>
                </Grid>
            }
        </Grid>
    </>);
}