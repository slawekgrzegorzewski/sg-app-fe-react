import React, {useContext} from "react";
import {SettingsContext} from "../../utils/DrawerAppBar";
import {SuppliersManagement} from "./SuppliersManagement";
import Grid from "@mui/material/Grid2";
import {ClientsManagement} from "./ClientsManagement";
import {AccountsManagement} from "./AccountsManagement";
import {Box, Tab, Tabs} from "@mui/material";
import {ExpensesManagement} from "./ExpensesManagement";
import {useQuery} from "@apollo/client";
import {GetFinanceManagement, GetFinanceManagementQuery} from "../../types";
import {mapAccount, mapBillingCategory} from "../model/types";
import {mapCurrencyInfo} from "../../application/model/types";

export function AccountantSettings() {
    const ACCOUNTANT_SETTINGS_ACTIVE_TAB_LOCAL_STORAGE_KEY = 'accountantSettingsActiveTab';
    const ACCOUNTS_TAB_LABEL = 'Konta';
    const EXPENSES_MANAGEMENT_TAB_LABEL = 'Zarządzanie wydatkami';
    const COMPANY_MANAGEMENT_TAB_LABEL = 'Firma';
    const settings = useContext(SettingsContext);
    const tabs = settings.accountantSettings.isCompany
        ? [COMPANY_MANAGEMENT_TAB_LABEL, ACCOUNTS_TAB_LABEL, EXPENSES_MANAGEMENT_TAB_LABEL]
        : [ACCOUNTS_TAB_LABEL, EXPENSES_MANAGEMENT_TAB_LABEL]
    const getActiveTabIndex = () => {
        let indexFromLocalStorage = Number(window.localStorage.getItem(ACCOUNTANT_SETTINGS_ACTIVE_TAB_LOCAL_STORAGE_KEY) || '0');
        if (indexFromLocalStorage >= tabs.length) {
            indexFromLocalStorage = 0;
        }
        return indexFromLocalStorage;
    }
    const setAndStoreActiveTabIndex = (index: number) => {
        window.localStorage.setItem(ACCOUNTANT_SETTINGS_ACTIVE_TAB_LOCAL_STORAGE_KEY, index.toString());
        setActiveTabIndex(index);
    }
    const [activeTabIndex, setActiveTabIndex] = React.useState(getActiveTabIndex());

    const {loading, error, data, refetch} = useQuery<GetFinanceManagementQuery>(GetFinanceManagement);


    if (loading) {
        return <>Loading...</>
    } else if (error) {
        return <>Error...</>
    } else if (data) {
        return (<>
            <Tabs
                value={activeTabIndex}
                onChange={(event: React.SyntheticEvent, newValue: number) => {
                    setAndStoreActiveTabIndex(newValue)
                }}>
                {
                    tabs.map((tab, index) => (<Tab label={tab} key={tab}/>))
                }
            </Tabs>
            <Grid container>
                {
                    tabs[activeTabIndex] === COMPANY_MANAGEMENT_TAB_LABEL && <Box>
                        <Grid size={12}><ClientsManagement></ClientsManagement></Grid>
                        <Grid size={12}><SuppliersManagement></SuppliersManagement></Grid>
                    </Box>
                }
                {
                    tabs[activeTabIndex] === ACCOUNTS_TAB_LABEL && <Grid size={{xs: 12, sm: 4}}>
                        <AccountsManagement accounts={[...data.financeManagement.accounts].map(mapAccount)}
                                            supportedCurrencies={[...data.financeManagement.supportedCurrencies].map(mapCurrencyInfo)}
                                            refetch={refetch}/>
                    </Grid>
                }
                {
                    tabs[activeTabIndex] === EXPENSES_MANAGEMENT_TAB_LABEL && <Grid size={{xs: 12, sm: 4}}>
                        <ExpensesManagement
                            billingCategories={[...data.financeManagement.billingCategories].map(mapBillingCategory)}
                            refetch={refetch}/>
                    </Grid>
                }
            </Grid>
        </>);
    } else {
        return <></>;
    }
}