import React, {useContext} from "react";
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
    GetFinanceManagementWithNotAssignedBankAccounts,
    GetFinanceManagementWithNotAssignedBankAccountsQuery,
    PiggyBank
} from "../../types";
import {mapAccount, mapBankAccount, mapBillingCategory, mapCurrencyInfo} from "../model/types";
import {PiggyBankDTO, PiggyBanksManagement} from "./PiggyBanksManagement";
import Decimal from "decimal.js";
import {AccountantSettingsManagement} from "./AccountantSettingsManagement";
import Box from "@mui/material/Box";
import {DomainsManagement} from "./DomainsManagement";
import {AccountantSettingsContext} from "../../application/components/dispatchers/AccountantDispatcher";
import {BanksManagement} from "./BanksManagement";

export function AccountantSettings() {
    const ACCOUNTANT_SETTINGS_ACTIVE_TAB_LOCAL_STORAGE_KEY = 'newApp_accountantSettingsActiveTab';
    const ACCOUNTS_TAB_LABEL = 'konta';
    const EXPENSES_MANAGEMENT_TAB_LABEL = 'wydatki';
    const COMPANY_MANAGEMENT_TAB_LABEL = 'firma';
    const DOMAIN_MANAGEMENT_TAB_LABEL = 'domeny';
    const BANKS_MANAGEMENT_TAB_LABEL = 'banki';
    const accountantSettingsContext = useContext(AccountantSettingsContext);
    const tabs = accountantSettingsContext.accountantSettings.isCompany
        ? [COMPANY_MANAGEMENT_TAB_LABEL, ACCOUNTS_TAB_LABEL, EXPENSES_MANAGEMENT_TAB_LABEL, DOMAIN_MANAGEMENT_TAB_LABEL, BANKS_MANAGEMENT_TAB_LABEL]
        : [ACCOUNTS_TAB_LABEL, EXPENSES_MANAGEMENT_TAB_LABEL, DOMAIN_MANAGEMENT_TAB_LABEL, BANKS_MANAGEMENT_TAB_LABEL]
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
    } = useQuery<GetFinanceManagementWithNotAssignedBankAccountsQuery>(GetFinanceManagementWithNotAssignedBankAccounts);

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
        const columnSizing = {xs: 12, sm: 8, md: 6, lg: 6, xl: 4};
        const columnSizing2 = {xs: 12, sm: 8, md: 6, lg: 5, xl: 4};
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
            <Grid container dir={'row'} justifyContent={'space-evenly'}>
                {
                    activeTabIndex === COMPANY_MANAGEMENT_TAB_LABEL && <>
                        <Grid size={columnSizing}><ClientsManagement></ClientsManagement></Grid>
                        <Grid size={columnSizing}><SuppliersManagement></SuppliersManagement></Grid>
                    </>
                }
                {
                    activeTabIndex === ACCOUNTS_TAB_LABEL && <Grid size={columnSizing}>
                        <AccountsManagement accounts={[...financeManagementData.financeManagement.accounts].map(mapAccount)}
                                            notAssignedBankAccounts={[...financeManagementData.bankPermissions.bankAccountsNotAssignedToAccount.map(mapBankAccount)]}
                                            supportedCurrencies={[...financeManagementData.financeManagement.supportedCurrencies].map(mapCurrencyInfo)}
                                            refetch={financeManagementRefetch}/>
                    </Grid>
                }
                {
                    activeTabIndex === EXPENSES_MANAGEMENT_TAB_LABEL && <>
                        <Grid size={12}>
                            <Box sx={{width: '120px'}}>
                                <AccountantSettingsManagement
                                    accountantSettings={{isCompany: accountantSettingsContext.accountantSettings.isCompany}}
                                    refetch={settingsRefetch}
                                />
                            </Box>
                        </Grid>
                        <Grid size={columnSizing2}>
                            <BillingCategoriesManagement
                                billingCategories={[...financeManagementData.financeManagement.billingCategories].map(mapBillingCategory)}
                                refetch={financeManagementRefetch}/>
                        </Grid>
                        <Grid size={columnSizing2}>
                            <PiggyBanksManagement
                                piggyBanks={[...financeManagementData.financeManagement.piggyBanks].map(mapPiggyBank)}
                                supportedCurrencies={[...financeManagementData.financeManagement.supportedCurrencies].map(currency => currency.code)}
                                refetch={financeManagementRefetch}/>
                        </Grid>
                    </>
                }
                {
                    activeTabIndex === DOMAIN_MANAGEMENT_TAB_LABEL && <Grid size={columnSizing}>
                        <DomainsManagement/>
                    </Grid>
                }
                {
                    activeTabIndex === BANKS_MANAGEMENT_TAB_LABEL && <Grid size={columnSizing}>
                        <BanksManagement/>
                    </Grid>
                }
            </Grid>
        </>);
    } else {
        return <></>;
    }
}