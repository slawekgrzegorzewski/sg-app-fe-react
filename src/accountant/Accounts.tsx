import {ErrorDisplay, LoadingIndicator} from '../application/components/QueryState';
import {useMutation, useQuery} from '@apollo/client/react';
import {
    Account,
    GetFinanceManagement,
    GetFinanceManagementQuery,
    PiggyBank,
    UpdatePiggyBank,
    UpdatePiggyBankMutation,
} from '../types';
import React from 'react';
import {Chip, Paper, Stack, Tooltip, useTheme} from '@mui/material';
import {MultiCurrencySummary} from '../application/components/MultiCurrencySummary';
import {ComparatorBuilder} from '../utils/comparator-builder';
import Typography from '@mui/material/Typography';
import Decimal from 'decimal.js';
import {AccountView} from './AccountView';
import {compactListRow} from '../utils/theme/utils';
import {FormattedMoneyText} from '../application/components/FormattedMoneyText';
import {PiggyBankBalanceEditor} from './settings/PiggyBankBalanceEditor';
import type {Type} from './settings/PiggyBankBalanceEditor';
import type {PiggyBankDTO} from './settings/PiggyBanksManagement';
import {PiggyBankBalanceActions} from './PiggyBankBalanceActions';
import {AccountBalanceActionDialog} from './AccountBalanceActionDialog';
import type {AccountBalanceAction} from './AccountBalanceActionDialog';
import {StandOutText} from '../application/components/StandOutText';
import {useApplicationNavigation} from '../utils/use-application-navigation';
import {
    ACCOUNTANT_SETTINGS_ACTIVE_TAB_LOCAL_STORAGE_KEY,
    ACCOUNTS_TAB_LABEL,
} from './settings/accountant-settings-tabs';

export function Accounts() {
    const {loading, error, data, refetch} = useQuery<GetFinanceManagementQuery>(GetFinanceManagement);
    const [updatePiggyBankMutation] = useMutation<UpdatePiggyBankMutation>(UpdatePiggyBank);
    const [piggyBankBalanceDialogOptions, setPiggyBankBalanceDialogOptions] = React.useState<{
        type: Type;
        piggyBank: PiggyBankDTO;
    } | null>(null);
    const [accountBalanceAction, setAccountBalanceAction] = React.useState<AccountBalanceAction | null>(null);
    const theme = useTheme();
    const {changePage} = useApplicationNavigation();

    const navigateToAccountsManagement = () => {
        window.localStorage.setItem(ACCOUNTANT_SETTINGS_ACTIVE_TAB_LOCAL_STORAGE_KEY, ACCOUNTS_TAB_LABEL);
        changePage('settings');
    };

    const mapPiggyBank = (piggyBank: PiggyBank): PiggyBankDTO => ({
        publicId: piggyBank.publicId,
        name: piggyBank.name,
        balance: new Decimal(piggyBank.balance.amount),
        monthlyTopUp: new Decimal(piggyBank.monthlyTopUp.amount),
        description: piggyBank.description,
        currency: piggyBank.balance.currency.code,
        savings: piggyBank.savings,
    });

    const updatePiggyBank = async (piggyBank: PiggyBankDTO) => {
        await updatePiggyBankMutation({
            variables: {
                publicId: piggyBank.publicId,
                name: piggyBank.name,
                description: piggyBank.description,
                balance: piggyBank.balance,
                monthlyTopUp: piggyBank.monthlyTopUp,
                currency: piggyBank.currency,
                savings: piggyBank.savings,
            },
        });
        await refetch();
    };

    if (loading) {
        return <LoadingIndicator label="Ładowanie kont i skarbonek..." />;
    }

    if (error) {
        return <ErrorDisplay error={error} onRetry={() => void refetch()} />;
    }

    if (data) {
        const allAccounts = [...(data.financeManagement.accounts as Account[])].sort(
            ComparatorBuilder.comparing<Account>(a => a.order).build()
        );
        const accounts = allAccounts.filter(a => a.visible);
        const hiddenAccountsCount = allAccounts.length - accounts.length;

        const piggyBanks = [...(data.financeManagement.piggyBanks as PiggyBank[])].sort(
            ComparatorBuilder.comparing<PiggyBank>(pb => pb.name).build()
        );
        return (
            <>
                <Stack alignItems="center" sx={{width: '100%', px: {xs: 1, sm: 2}, py: 2}}>
                    <Stack spacing={3} sx={{width: '100%', maxWidth: 960}}>
                        <Typography variant="h3">
                            <StandOutText standOutBy="both">Konta</StandOutText>
                        </Typography>

                        <Stack
                            direction={{xs: 'column', md: 'row'}}
                            spacing={2}
                            alignItems={{xs: 'stretch', md: 'flex-start'}}
                        >
                            <Paper variant="outlined" sx={{flex: 1, minWidth: 0, p: {xs: 1.5, sm: 2}}}>
                                <Stack spacing={1.5}>
                                    <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1}>
                                        <Typography variant="h4">Twoje konta</Typography>
                                        <Stack direction="row" spacing={0.75} flexWrap="wrap" justifyContent="flex-end">
                                            <Chip
                                                size="small"
                                                variant="outlined"
                                                label={`Liczba kont: ${allAccounts.length}`}
                                            />
                                            <Tooltip title="Przejdź do Ustawienia → Konta">
                                                <Chip
                                                    clickable
                                                    size="small"
                                                    variant="outlined"
                                                    label={`Ukrytych: ${hiddenAccountsCount}`}
                                                    aria-label={`Ukrytych: ${hiddenAccountsCount}. Przejdź do Ustawienia, Konta`}
                                                    onClick={navigateToAccountsManagement}
                                                    sx={{color: 'text.secondary'}}
                                                />
                                            </Tooltip>
                                        </Stack>
                                    </Stack>

                                    <Paper variant="outlined" sx={{p: 1.5}}>
                                        <Stack
                                            direction={{xs: 'column', sm: 'row'}}
                                            alignItems={{xs: 'stretch', sm: 'flex-start'}}
                                            justifyContent="space-between"
                                            spacing={1}
                                        >
                                            <Typography variant="body2" color="text.secondary">
                                                Łączne saldo
                                            </Typography>
                                            <MultiCurrencySummary
                                                data={accounts}
                                                amountExtractor={account => new Decimal(account.currentBalance.amount)}
                                                currencyExtractor={account => account.currentBalance.currency.code}
                                                sx={{'& .MuiTypography-root': {color: 'text.primary', fontWeight: 600}}}
                                            />
                                        </Stack>
                                    </Paper>

                                    {accounts.length === 0 ? (
                                        <Typography color="text.secondary" textAlign="center" sx={{py: 3}}>
                                            Brak widocznych kont.
                                        </Typography>
                                    ) : (
                                        <Stack direction="column">
                                            {accounts.map(account => (
                                                <AccountView
                                                    key={'av' + account.publicId}
                                                    account={account}
                                                    accounts={accounts}
                                                    onTransfer={() => setAccountBalanceAction({account})}
                                                    onTransferCompleted={refetch}
                                                />
                                            ))}
                                        </Stack>
                                    )}
                                </Stack>
                            </Paper>

                            <Paper variant="outlined" sx={{flex: 1, minWidth: 0, p: {xs: 1.5, sm: 2}}}>
                                <Stack spacing={1.5}>
                                    <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1}>
                                        <Typography variant="h4">Skarbonki</Typography>
                                        <Chip
                                            size="small"
                                            variant="outlined"
                                            label={`Liczba skarbonek: ${piggyBanks.length}`}
                                        />
                                    </Stack>

                                    {piggyBanks.length === 0 ? (
                                        <Typography color="text.secondary" textAlign="center" sx={{py: 3}}>
                                            Brak skarbonek.
                                        </Typography>
                                    ) : (
                                        <Stack direction="column">
                                            {piggyBanks.map(piggyBank => (
                                                <Stack
                                                    key={piggyBank.publicId}
                                                    direction="row"
                                                    alignItems="center"
                                                    justifyContent="space-between"
                                                    spacing={1}
                                                    sx={compactListRow(theme)}
                                                >
                                                    <Typography sx={{minWidth: 0, overflowWrap: 'anywhere'}}>
                                                        {piggyBank.name}
                                                    </Typography>
                                                    <Stack direction="row" alignItems="center" spacing={0.5}>
                                                        <FormattedMoneyText
                                                            money={{
                                                                amount: piggyBank.balance.amount,
                                                                currency: piggyBank.balance.currency.code,
                                                            }}
                                                            parenthesizeNegative
                                                            sx={{color: 'text.primary', fontWeight: 600}}
                                                        >
                                                            {formattedValue => <>{formattedValue}</>}
                                                        </FormattedMoneyText>
                                                        <PiggyBankBalanceActions
                                                            piggyBankName={piggyBank.name}
                                                            onCredit={() => {
                                                                setPiggyBankBalanceDialogOptions({
                                                                    type: 'CREDIT',
                                                                    piggyBank: mapPiggyBank(piggyBank),
                                                                });
                                                            }}
                                                            onDebit={() => {
                                                                setPiggyBankBalanceDialogOptions({
                                                                    type: 'DEBIT',
                                                                    piggyBank: mapPiggyBank(piggyBank),
                                                                });
                                                            }}
                                                        />
                                                    </Stack>
                                                </Stack>
                                            ))}
                                        </Stack>
                                    )}
                                </Stack>
                            </Paper>
                        </Stack>
                    </Stack>
                </Stack>
                {accountBalanceAction && (
                    <AccountBalanceActionDialog
                        action={accountBalanceAction}
                        accounts={accounts}
                        onClose={() => setAccountBalanceAction(null)}
                        onCompleted={refetch}
                    />
                )}
                {piggyBankBalanceDialogOptions && (
                    <PiggyBankBalanceEditor
                        type={piggyBankBalanceDialogOptions.type}
                        piggyBank={piggyBankBalanceDialogOptions.piggyBank}
                        onSave={async piggyBank => {
                            await updatePiggyBank(piggyBank);
                            setPiggyBankBalanceDialogOptions(null);
                        }}
                        onCancel={() => setPiggyBankBalanceDialogOptions(null)}
                    />
                )}
            </>
        );
    }

    return <></>;
}
