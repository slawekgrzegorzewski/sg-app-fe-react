import React, {useContext} from "react";
import {SettingsContext} from "../../utils/DrawerAppBar";
import {SuppliersManagement} from "./SuppliersManagement";
import Grid from "@mui/material/Grid2";
import {ClientsManagement} from "./ClientsManagement";
import {AccountsManagement} from "./AccountsManagement";
import {Tab, Tabs} from "@mui/material";
import {BillingCategoriesManagement} from "./BillingCategoriesManagement";
import {useQuery} from "@apollo/client";
import {GetFinanceManagement, GetFinanceManagementQuery, PiggyBank} from "../../types";
import {mapAccount, mapBillingCategory} from "../model/types";
import {mapCurrencyInfo} from "../../application/model/types";
import {PiggyBankDTO, PiggyBanksManagement} from "./PiggyBanksManagement";
import Decimal from "decimal.js";

export function AccountantSettings() {
    const ACCOUNTANT_SETTINGS_ACTIVE_TAB_LOCAL_STORAGE_KEY = 'accountantSettingsActiveTab';
    const ACCOUNTS_TAB_LABEL = 'konta';
    const EXPENSES_MANAGEMENT_TAB_LABEL = 'wydatki';
    const COMPANY_MANAGEMENT_TAB_LABEL = 'firma';
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
                    tabs[activeTabIndex] === COMPANY_MANAGEMENT_TAB_LABEL && <>
                        <Grid size={6}><ClientsManagement></ClientsManagement></Grid>
                        <Grid size={6}><SuppliersManagement></SuppliersManagement></Grid>
                    </>
                }
                {
                    tabs[activeTabIndex] === ACCOUNTS_TAB_LABEL && <>
                        <AccountsManagement accounts={[...data.financeManagement.accounts].map(mapAccount)}
                                            supportedCurrencies={[...data.financeManagement.supportedCurrencies].map(mapCurrencyInfo)}
                                            refetch={refetch}/>
                    </>
                }
                {
                    tabs[activeTabIndex] === EXPENSES_MANAGEMENT_TAB_LABEL && <>
                        <Grid size={{sm: 12, md: 6}}>
                            <BillingCategoriesManagement
                                billingCategories={[...data.financeManagement.billingCategories].map(mapBillingCategory)}
                                refetch={refetch}/>
                        </Grid>
                        <Grid size={{sm: 12, md: 6}}>
                            <PiggyBanksManagement
                                piggyBanks={[...data.financeManagement.piggyBanks].map(mapPiggyBank)}
                                supportedCurrencies={[...data.financeManagement.supportedCurrencies].map(currency => currency.code)}
                                refetch={refetch}/>
                        </Grid>
                    </>
                }
            </Grid>
        </>);
    } else {
        return <></>;
    }
}