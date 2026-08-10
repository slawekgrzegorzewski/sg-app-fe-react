import {ErrorDisplay} from '../../application/components/QueryState';
import React, {useContext} from 'react';
import {SuppliersManagement} from './SuppliersManagement';
import Grid from '@mui/material/Grid';
import {ClientsManagement} from './ClientsManagement';
import {AccountsManagement} from './AccountsManagement';
import {Stack, Tab, Tabs} from '@mui/material';
import {BillingCategoriesManagement} from './BillingCategoriesManagement';
import {useQuery} from '@apollo/client/react';
import {
    Account,
    BankAccount,
    BillingCategory,
    GetAccountantSettings,
    GetAccountantSettingsQuery,
    GetFinanceManagementWithNotAssignedBankAccounts,
    GetFinanceManagementWithNotAssignedBankAccountsQuery,
    PiggyBank,
} from '../../types';
import {PiggyBankDTO, PiggyBanksManagement} from './PiggyBanksManagement';
import Decimal from 'decimal.js';
import {AccountantSettingsManagement} from './AccountantSettingsManagement';
import Box from '@mui/material/Box';
import DomainsManagement from './DomainsManagement';
import {AccountantSettingsContext} from '../../application/components/dispatchers/AccountantDispatcher';
import {BanksManagement} from './BanksManagement';
import {
    ACCOUNTANT_SETTINGS_ACTIVE_TAB_LOCAL_STORAGE_KEY,
    ACCOUNTS_TAB_LABEL,
    BANKS_MANAGEMENT_TAB_LABEL,
    COMPANY_MANAGEMENT_TAB_LABEL,
    DOMAIN_MANAGEMENT_TAB_LABEL,
    EXPENSES_MANAGEMENT_TAB_LABEL,
} from './accountant-settings-tabs';

export function AccountantSettings() {
    const accountantSettingsContext = useContext(AccountantSettingsContext);
    const tabs = accountantSettingsContext.accountantSettings.isCompany
        ? [
              COMPANY_MANAGEMENT_TAB_LABEL,
              ACCOUNTS_TAB_LABEL,
              EXPENSES_MANAGEMENT_TAB_LABEL,
              DOMAIN_MANAGEMENT_TAB_LABEL,
              BANKS_MANAGEMENT_TAB_LABEL,
          ]
        : [ACCOUNTS_TAB_LABEL, EXPENSES_MANAGEMENT_TAB_LABEL, DOMAIN_MANAGEMENT_TAB_LABEL, BANKS_MANAGEMENT_TAB_LABEL];
    const getActiveTab = () => {
        let tabFromLocalStorage = window.localStorage.getItem(ACCOUNTANT_SETTINGS_ACTIVE_TAB_LOCAL_STORAGE_KEY) || '';
        if (!tabs.includes(tabFromLocalStorage)) {
            tabFromLocalStorage = ACCOUNTS_TAB_LABEL;
        }
        return tabFromLocalStorage;
    };
    const setAndStoreActiveTab = (tab: string) => {
        window.localStorage.setItem(ACCOUNTANT_SETTINGS_ACTIVE_TAB_LOCAL_STORAGE_KEY, tab.toString());
        setActiveTabIndex(tab);
    };
    const [activeTabIndex, setActiveTabIndex] = React.useState(getActiveTab());

    const {
        loading: settingsLoading,
        error: settingsError,
        data: settingsData,
        refetch: settingsRefetch,
    } = useQuery<GetAccountantSettingsQuery>(GetAccountantSettings);
    const {
        loading: financeManagementLoading,
        error: financeManagementError,
        data: financeManagementData,
        refetch: financeManagementRefetch,
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
        return <></>;
    } else if (financeManagementError || settingsError) {
        return <ErrorDisplay error={financeManagementError || settingsError} />;
    } else if (financeManagementData && settingsData) {
        const columnSizing = {xs: 12, sm: 8, md: 6, lg: 6, xl: 4};
        const columnSizing2 = {xs: 12, sm: 8, md: 6, lg: 5, xl: 4};
        return (
            <Stack direction="column" sx={{px: {xs: 1, sm: 2}, py: 2}}>
                <Tabs
                    value={activeTabIndex}
                    variant="scrollable"
                    scrollButtons="auto"
                    textColor="secondary"
                    indicatorColor="secondary"
                    sx={{mb: 3, borderBottom: '1px solid', borderColor: 'divider'}}
                    onChange={(event: React.SyntheticEvent, newValue: string) => {
                        setAndStoreActiveTab(newValue);
                    }}
                >
                    {tabs.map(tab => (
                        <Tab label={tab} key={tab} value={tab} />
                    ))}
                </Tabs>
                <Grid container spacing={3} justifyContent="center" sx={{width: '100%', maxWidth: 1440, mx: 'auto'}}>
                    {activeTabIndex === COMPANY_MANAGEMENT_TAB_LABEL && (
                        <>
                            <Grid size={columnSizing}>
                                <ClientsManagement></ClientsManagement>
                            </Grid>
                            <Grid size={columnSizing}>
                                <SuppliersManagement></SuppliersManagement>
                            </Grid>
                        </>
                    )}
                    {activeTabIndex === ACCOUNTS_TAB_LABEL && (
                        <Grid size={columnSizing}>
                            <AccountsManagement
                                accounts={[...financeManagementData.financeManagement.accounts] as Account[]}
                                notAssignedBankAccounts={[
                                    ...(financeManagementData.bankPermissions
                                        .bankAccountsNotAssignedToAccount as BankAccount[]),
                                ]}
                                supportedCurrencies={[...financeManagementData.financeManagement.supportedCurrencies]}
                                refetch={financeManagementRefetch}
                            />
                        </Grid>
                    )}
                    {activeTabIndex === EXPENSES_MANAGEMENT_TAB_LABEL && (
                        <>
                            <Grid size={12}>
                                <Box sx={{width: '100%', maxWidth: 240}}>
                                    <AccountantSettingsManagement
                                        accountantSettings={{
                                            isCompany: accountantSettingsContext.accountantSettings.isCompany,
                                        }}
                                        refetch={settingsRefetch}
                                    />
                                </Box>
                            </Grid>
                            <Grid size={columnSizing2}>
                                <BillingCategoriesManagement
                                    billingCategories={[
                                        ...(financeManagementData.financeManagement
                                            .billingCategories as BillingCategory[]),
                                    ]}
                                    refetch={financeManagementRefetch}
                                />
                            </Grid>
                            <Grid size={columnSizing2}>
                                <PiggyBanksManagement
                                    piggyBanks={[...financeManagementData.financeManagement.piggyBanks].map(
                                        mapPiggyBank
                                    )}
                                    supportedCurrencies={[
                                        ...financeManagementData.financeManagement.supportedCurrencies,
                                    ].map(currency => currency.code)}
                                    refetch={financeManagementRefetch}
                                />
                            </Grid>
                        </>
                    )}
                    {activeTabIndex === DOMAIN_MANAGEMENT_TAB_LABEL && (
                        <Grid size={columnSizing}>
                            <DomainsManagement />
                        </Grid>
                    )}
                    {activeTabIndex === BANKS_MANAGEMENT_TAB_LABEL && (
                        <Grid size={columnSizing}>
                            <BanksManagement />
                        </Grid>
                    )}
                </Grid>
            </Stack>
        );
    } else {
        return <></>;
    }
}
