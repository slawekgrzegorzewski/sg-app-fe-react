import React, {useContext} from "react";
import {SettingsContext} from "../../utils/DrawerAppBar";
import {SuppliersManagement} from "./SuppliersManagement";
import Grid from "@mui/material/Grid2";
import {ClientsManagement} from "./ClientsManagement";
import {AccountsManagement} from "./AccountsManagement";
import {Tab, Tabs} from "@mui/material";
import {BillingCategoriesManagement} from "./BillingCategoriesManagement";
import {useQuery} from "@apollo/client";
import {
    GetAccountantSettings,
    GetAccountantSettingsQuery,
    GetFinanceManagement,
    GetFinanceManagementQuery,
    PiggyBank
} from "../../types";
import {mapAccount, mapBillingCategory} from "../model/types";
import {mapCurrencyInfo} from "../../application/model/types";
import {PiggyBankDTO, PiggyBanksManagement} from "./PiggyBanksManagement";
import Decimal from "decimal.js";
import {AccountantSettingsManagement} from "./AccountantSettingsManagement";
import Box from "@mui/material/Box";

export function AccountantSettings() {
    const ACCOUNTANT_SETTINGS_ACTIVE_TAB_LOCAL_STORAGE_KEY = 'accountantSettingsActiveTab';
    const ACCOUNTS_TAB_LABEL = 'konta';
    const EXPENSES_MANAGEMENT_TAB_LABEL = 'wydatki';
    const COMPANY_MANAGEMENT_TAB_LABEL = 'firma';
    const settings = useContext(SettingsContext);
    const tabs = settings.accountantSettings.isCompany
        ? [COMPANY_MANAGEMENT_TAB_LABEL, ACCOUNTS_TAB_LABEL, EXPENSES_MANAGEMENT_TAB_LABEL]
        : [ACCOUNTS_TAB_LABEL, EXPENSES_MANAGEMENT_TAB_LABEL]
    const getActiveTab = () => {
        let tabFromLocalStorage = window.localStorage.getItem(ACCOUNTANT_SETTINGS_ACTIVE_TAB_LOCAL_STORAGE_KEY) || '';
        if (!tabs.includes(tabFromLocalStorage)) {
            tabFromLocalStorage = ACCOUNTS_TAB_LABEL;
        }
        return tabFromLocalStorage;
    }
    const setAndStoreActiveTab = (tab: string) => {
        window.localStorage.setItem(ACCOUNTANT_SETTINGS_ACTIVE_TAB_LOCAL_STORAGE_KEY, tab.toString());
        setActiveTabIndex(tab);
    }
    const [activeTabIndex, setActiveTabIndex] = React.useState(getActiveTab());

    const {
        loading: settingsLoading,
        error: settingsError,
        data: settingsData,
        refetch: settingsRefetch
    } = useQuery<GetAccountantSettingsQuery>(GetAccountantSettings);
    const {
        loading: financeManagementLoading,
        error: financeManagementError,
        data: financeManagementData,
        refetch: financeManagementRefetch
    } = useQuery<GetFinanceManagementQuery>(GetFinanceManagement);

    function mapPiggyBank(piggyBank: PiggyBank) {
        return {
            publicId: piggyBank.publicId,
            name: piggyBank.name,
            balance: new Decimal(piggyBank.balance.amount),
            monthlyTopUp: new Decimal(piggyBank.monthlyTopUp.amount),
            description: piggyBank.description,
            currency: piggyBank.monthlyTopUp.currency.code,
            savings: piggyBank.savings,
        } as PiggyBankDTO;
    }

    if (financeManagementLoading || settingsLoading) {
        return <>Loading...</>
    } else if (financeManagementError || settingsError) {
        return <>Error...</>
    } else if (financeManagementData && settingsData) {
        return (<>
            <Tabs
                value={activeTabIndex}
                onChange={(event: React.SyntheticEvent, newValue: string) => {
                    setAndStoreActiveTab(newValue)
                }}>
                {
                    tabs.map((tab, index) => (<Tab label={tab} key={tab} value={tab}/>))
                }
            </Tabs>
            <Grid container>
                {
                    activeTabIndex === COMPANY_MANAGEMENT_TAB_LABEL && <>
                        <Grid size={6}><ClientsManagement></ClientsManagement></Grid>
                        <Grid size={6}><SuppliersManagement></SuppliersManagement></Grid>
                    </>
                }
                {
                    activeTabIndex === ACCOUNTS_TAB_LABEL && <>
                        <AccountsManagement accounts={[...financeManagementData.financeManagement.accounts].map(mapAccount)}
                                            supportedCurrencies={[...financeManagementData.financeManagement.supportedCurrencies].map(mapCurrencyInfo)}
                                            refetch={financeManagementRefetch}/>
                    </>
                }
                {
                    activeTabIndex === EXPENSES_MANAGEMENT_TAB_LABEL && <>
                        <Grid size={12}>
                            <Box sx={{width: '120px'}}>
                                <AccountantSettingsManagement
                                    accountantSettings={{isCompany: settingsData.settings.accountantSettings.isCompany}}
                                    refetch={settingsRefetch}
                                />
                            </Box>
                        </Grid>
                        <Grid size={{sm: 12, md: 6}}>
                            <BillingCategoriesManagement
                                billingCategories={[...financeManagementData.financeManagement.billingCategories].map(mapBillingCategory)}
                                refetch={financeManagementRefetch}/>
                        </Grid>
                        <Grid size={{sm: 12, md: 6}}>
                            <PiggyBanksManagement
                                piggyBanks={[...financeManagementData.financeManagement.piggyBanks].map(mapPiggyBank)}
                                supportedCurrencies={[...financeManagementData.financeManagement.supportedCurrencies].map(currency => currency.code)}
                                refetch={financeManagementRefetch}/>
                        </Grid>
                    </>
                }
            </Grid>
        </>);
    } else {
        return <></>;
    }
}