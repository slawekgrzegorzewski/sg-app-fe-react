import {ErrorDisplay, LoadingIndicator} from '../../application/components/QueryState';
import React, {useContext} from 'react';
import {SuppliersManagement} from './SuppliersManagement';
import {ClientsManagement} from './ClientsManagement';
import {AccountsManagement} from './AccountsManagement';
import {Paper, Stack, Tab, Tabs, Typography} from '@mui/material';
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
import {StandOutText} from '../../application/components/StandOutText';

const TAB_DISPLAY_LABELS: Record<string, string> = {
    [COMPANY_MANAGEMENT_TAB_LABEL]: 'Firma',
    [ACCOUNTS_TAB_LABEL]: 'Konta',
    [EXPENSES_MANAGEMENT_TAB_LABEL]: 'Wydatki',
    [DOMAIN_MANAGEMENT_TAB_LABEL]: 'Domeny',
    [BANKS_MANAGEMENT_TAB_LABEL]: 'Banki',
};

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

    React.useEffect(() => {
        window.scrollTo({top: 0});
    }, [activeTabIndex]);

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
        return <LoadingIndicator label="Ładowanie ustawień..." />;
    } else if (financeManagementError || settingsError) {
        return (
            <ErrorDisplay
                error={financeManagementError || settingsError}
                onRetry={() => {
                    void settingsRefetch();
                    void financeManagementRefetch();
                }}
            />
        );
    } else if (financeManagementData && settingsData) {
        return (
            <Stack alignItems="center" sx={{width: '100%', px: {xs: 1, sm: 2}, py: 2}}>
                <Stack spacing={2.5} sx={{width: '100%', maxWidth: 960}}>
                    <Typography variant="h3">
                        <StandOutText standOutBy="both">Ustawienia</StandOutText>
                    </Typography>

                    <Paper variant="outlined" sx={{p: 0.5}}>
                        <Tabs
                            value={activeTabIndex}
                            variant="scrollable"
                            scrollButtons="auto"
                            textColor="secondary"
                            indicatorColor="secondary"
                            aria-label="Sekcje ustawień"
                            onChange={(_: React.SyntheticEvent, newValue: string) => {
                                setAndStoreActiveTab(newValue);
                            }}
                            sx={{
                                minHeight: 42,
                                '& .MuiTab-root': {minHeight: 42, textTransform: 'none', fontWeight: 600},
                            }}
                        >
                            {tabs.map(tab => (
                                <Tab label={TAB_DISPLAY_LABELS[tab]} key={tab} value={tab} />
                            ))}
                        </Tabs>
                    </Paper>

                    <Stack
                        role="tabpanel"
                        aria-label={TAB_DISPLAY_LABELS[activeTabIndex]}
                        spacing={2}
                        sx={{width: '100%'}}
                    >
                        {activeTabIndex === COMPANY_MANAGEMENT_TAB_LABEL && (
                            <Stack direction={{xs: 'column', md: 'row'}} spacing={2} alignItems="flex-start">
                                <ClientsManagement />
                                <SuppliersManagement />
                            </Stack>
                        )}
                        {activeTabIndex === ACCOUNTS_TAB_LABEL && (
                            <AccountsManagement
                                accounts={[...financeManagementData.financeManagement.accounts] as Account[]}
                                notAssignedBankAccounts={[
                                    ...(financeManagementData.bankPermissions
                                        .bankAccountsNotAssignedToAccount as BankAccount[]),
                                ]}
                                supportedCurrencies={[...financeManagementData.financeManagement.supportedCurrencies]}
                                refetch={financeManagementRefetch}
                            />
                        )}
                        {activeTabIndex === EXPENSES_MANAGEMENT_TAB_LABEL && (
                            <>
                                <AccountantSettingsManagement
                                    accountantSettings={{
                                        isCompany: accountantSettingsContext.accountantSettings.isCompany,
                                    }}
                                    refetch={settingsRefetch}
                                />
                                <Stack direction={{xs: 'column', md: 'row'}} spacing={2} alignItems="flex-start">
                                    <BillingCategoriesManagement
                                        billingCategories={[
                                            ...(financeManagementData.financeManagement
                                                .billingCategories as BillingCategory[]),
                                        ]}
                                        refetch={financeManagementRefetch}
                                    />
                                    <PiggyBanksManagement
                                        piggyBanks={[...financeManagementData.financeManagement.piggyBanks].map(
                                            mapPiggyBank
                                        )}
                                        supportedCurrencies={[
                                            ...financeManagementData.financeManagement.supportedCurrencies,
                                        ].map(currency => currency.code)}
                                        refetch={financeManagementRefetch}
                                    />
                                </Stack>
                            </>
                        )}
                        {activeTabIndex === DOMAIN_MANAGEMENT_TAB_LABEL && <DomainsManagement />}
                        {activeTabIndex === BANKS_MANAGEMENT_TAB_LABEL && <BanksManagement />}
                    </Stack>
                </Stack>
            </Stack>
        );
    } else {
        return <></>;
    }
}
