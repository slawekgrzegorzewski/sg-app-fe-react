import {ErrorDisplay} from '../application/components/QueryState';
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
import {Stack, useTheme} from '@mui/material';
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

export function Accounts() {
    const {loading, error, data, refetch} = useQuery<GetFinanceManagementQuery>(GetFinanceManagement);
    const [updatePiggyBankMutation] = useMutation<UpdatePiggyBankMutation>(UpdatePiggyBank);
    const [piggyBankBalanceDialogOptions, setPiggyBankBalanceDialogOptions] = React.useState<{
        type: Type;
        piggyBank: PiggyBankDTO;
    } | null>(null);
    const [accountBalanceAction, setAccountBalanceAction] = React.useState<AccountBalanceAction | null>(null);
    const theme = useTheme();

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
        return <></>;
    }

    if (error) {
        return <ErrorDisplay error={error} />;
    }

    if (data) {
        const accounts = [...(data.financeManagement.accounts as Account[])]
            .filter(a => a.visible)
            .sort(ComparatorBuilder.comparing<Account>(a => a.order).build());

        const piggyBanks = [...(data.financeManagement.piggyBanks as PiggyBank[])].sort(
            ComparatorBuilder.comparing<PiggyBank>(pb => pb.name).build()
        );
        return (
            <>
                <Stack
                    direction={{xs: 'column', md: 'row'}}
                    spacing={{xs: 3, md: 5}}
                    justifyContent="center"
                    alignItems={{xs: 'stretch', md: 'flex-start'}}
                    sx={{
                        px: {xs: 1, sm: 2},
                        py: 2,
                    }}
                >
                    <Stack
                        direction="column"
                        sx={{
                            width: '100%',
                            maxWidth: 800,
                        }}
                    >
                        <Typography
                            variant="h4"
                            textAlign="center"
                            sx={{
                                mb: 1.5,
                                color: 'secondary.main',
                            }}
                        >
                            Twoje konta
                        </Typography>

                        <MultiCurrencySummary
                            data={accounts}
                            amountExtractor={account => new Decimal(account.currentBalance.amount)}
                            currencyExtractor={account => account.currentBalance.currency.code}
                            header="Suma:"
                            sx={{
                                mb: 1,
                                ...compactListRow(theme),
                            }}
                        />

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
                    </Stack>

                    <Stack
                        direction="column"
                        sx={{
                            width: '100%',
                            maxWidth: 800,
                        }}
                    >
                        <Typography
                            variant="h4"
                            textAlign="center"
                            sx={{
                                mb: 1.5,
                                color: 'secondary.main',
                            }}
                        >
                            Skarbonki
                        </Typography>

                        <Stack direction="column">
                            {piggyBanks.map(piggyBank => (
                                <Stack
                                    key={piggyBank.publicId}
                                    direction="row"
                                    alignItems="center"
                                    justifyContent="space-between"
                                    sx={compactListRow(theme)}
                                >
                                    <Typography>{piggyBank.name}</Typography>
                                    <Stack direction="row" alignItems="center" spacing={0.5}>
                                        <FormattedMoneyText
                                            money={{
                                                amount: piggyBank.balance.amount,
                                                currency: piggyBank.balance.currency.code,
                                            }}
                                            parenthesizeNegative
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
