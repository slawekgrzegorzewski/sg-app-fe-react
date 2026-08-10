import * as React from 'react';
import {useMutation, useQuery} from '@apollo/client/react';
import {
    BankPermission,
    GetBankPermissions,
    GetBankPermissionsQuery,
    Institution,
    StartPermissionRequest,
    StartPermissionRequestMutation,
} from '../../types';
import {Box, Button, Chip, Divider, Paper, Stack, Typography} from '@mui/material';
import {InstitutionPickerButton} from './InstitutionPickerButton';
import {FetchBankAccountDataButton} from './FetchBankAccountDataButton';
import {ErrorDisplay, LoadingIndicator} from '../../application/components/QueryState';
import dayjs from 'dayjs';
import 'dayjs/locale/pl';

function SettingsSection({
    title,
    count,
    emptyLabel,
    children,
}: {
    title: string;
    count: number;
    emptyLabel: string;
    children: React.ReactNode;
}) {
    return (
        <Paper component="section" variant="outlined" sx={{p: {xs: 1.5, sm: 2}}}>
            <Stack spacing={1.5}>
                <Stack direction="row" alignItems="center" spacing={1}>
                    <Typography variant="h4">{title}</Typography>
                    <Chip size="small" variant="outlined" label={`Liczba: ${count}`} />
                </Stack>
                {count === 0 ? (
                    <Typography color="text.secondary" textAlign="center" sx={{py: 3}}>
                        {emptyLabel}
                    </Typography>
                ) : (
                    children
                )}
            </Stack>
        </Paper>
    );
}

function InstitutionIdentity({institution}: {institution: Institution}) {
    return (
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{minWidth: 0}}>
            <Box
                component="img"
                src={institution.logo}
                alt=""
                sx={{width: 48, height: 48, objectFit: 'contain', borderRadius: 1, flexShrink: 0}}
            />
            <Stack sx={{minWidth: 0}}>
                <Typography fontWeight={600} sx={{overflowWrap: 'anywhere'}}>
                    {institution.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    BIC: {institution.bic}
                </Typography>
            </Stack>
        </Stack>
    );
}

export function BanksPermissionsManagement() {
    const [startPermissionRequestMutation] = useMutation<StartPermissionRequestMutation>(StartPermissionRequest);
    const {loading, error, data, refetch} = useQuery<GetBankPermissionsQuery>(GetBankPermissions);

    const startConfirmationProcess = async (institution: Institution) => {
        await startPermissionRequestMutation({
            variables: {
                institutionId: institution.id,
                maxHistoricalDays: institution.transactionTotalDays,
                redirect: document.location.href,
                userLanguage: 'pl',
            },
        });
        return refetch();
    };

    if (loading) {
        return <LoadingIndicator label="Ładowanie połączeń bankowych..." />;
    }

    if (error) {
        return <ErrorDisplay error={error} onRetry={() => void refetch()} />;
    }

    if (!data) {
        return <></>;
    }

    const granted = [...(data.bankPermissions.granted as BankPermission[])].sort((left, right) =>
        left.institutionId.localeCompare(right.institutionId)
    );
    const toProcess = [...(data.bankPermissions.toProcess as BankPermission[])].sort((left, right) =>
        left.institutionId.localeCompare(right.institutionId)
    );
    const toRecreate = [...(data.bankPermissions.toRecreate as Institution[])].sort((left, right) =>
        left.name.localeCompare(right.name)
    );

    return (
        <Stack spacing={2}>
            <Paper component="section" variant="outlined" sx={{p: {xs: 1.5, sm: 2}}}>
                <Stack
                    direction={{xs: 'column', sm: 'row'}}
                    alignItems={{xs: 'stretch', sm: 'center'}}
                    justifyContent="space-between"
                    gap={1.5}
                >
                    <Stack>
                        <Typography variant="h4">Połączenia bankowe</Typography>
                        <Typography variant="body2" color="text.secondary">
                            Zarządzaj dostępem do rachunków i ręcznie pobieraj najnowsze dane.
                        </Typography>
                    </Stack>
                    <InstitutionPickerButton label="Dodaj bank" onPick={startConfirmationProcess} />
                </Stack>
            </Paper>

            <SettingsSection
                title="Aktywne dostępy"
                count={granted.length}
                emptyLabel="Brak aktywnych dostępów bankowych."
            >
                <Stack divider={<Divider flexItem />}>
                    {granted.map(permission => (
                        <Stack key={permission.publicId} spacing={1.25} sx={{py: 1}}>
                            <Stack
                                direction={{xs: 'column', sm: 'row'}}
                                alignItems={{xs: 'flex-start', sm: 'center'}}
                                justifyContent="space-between"
                                gap={1}
                            >
                                <InstitutionIdentity institution={permission.institution!} />
                                <Typography variant="body2" color="text.secondary">
                                    Dostęp od {dayjs(permission.givenAt).locale('pl').format('D MMM YYYY, HH:mm')}
                                </Typography>
                            </Stack>
                            <Stack spacing={0.5} sx={{pl: {xs: 0, sm: 7.5}}}>
                                {permission.bankAccounts.map(bankAccount => (
                                    <Stack
                                        key={bankAccount.publicId}
                                        direction={{xs: 'column', sm: 'row'}}
                                        alignItems={{xs: 'stretch', sm: 'center'}}
                                        justifyContent="space-between"
                                        gap={0.5}
                                        sx={{p: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1}}
                                    >
                                        <Typography variant="body2" sx={{overflowWrap: 'anywhere'}}>
                                            {bankAccount.iban}
                                        </Typography>
                                        <FetchBankAccountDataButton bankAccount={bankAccount} />
                                    </Stack>
                                ))}
                            </Stack>
                        </Stack>
                    ))}
                </Stack>
            </SettingsSection>

            <SettingsSection
                title="Oczekujące na autoryzację"
                count={toProcess.length}
                emptyLabel="Brak dostępów oczekujących na autoryzację."
            >
                <Stack divider={<Divider flexItem />}>
                    {toProcess.map(permission => (
                        <Stack
                            key={permission.publicId}
                            direction={{xs: 'column', sm: 'row'}}
                            alignItems={{xs: 'stretch', sm: 'center'}}
                            justifyContent="space-between"
                            gap={1.5}
                            sx={{py: 1}}
                        >
                            <InstitutionIdentity institution={permission.institution!} />
                            <Button
                                variant="contained"
                                color="secondary"
                                onClick={() => window.location.replace(permission.confirmationLink!)}
                            >
                                Autoryzuj dostęp
                            </Button>
                        </Stack>
                    ))}
                </Stack>
            </SettingsSection>

            <SettingsSection title="Wygasłe dostępy" count={toRecreate.length} emptyLabel="Brak wygasłych dostępów.">
                <Stack divider={<Divider flexItem />}>
                    {toRecreate.map(institution => (
                        <Stack
                            key={institution.id}
                            direction={{xs: 'column', sm: 'row'}}
                            alignItems={{xs: 'stretch', sm: 'center'}}
                            justifyContent="space-between"
                            gap={1.5}
                            sx={{py: 1}}
                        >
                            <InstitutionIdentity institution={institution} />
                            <Button
                                variant="outlined"
                                color="secondary"
                                onClick={() => startConfirmationProcess(institution)}
                            >
                                Odnów dostęp
                            </Button>
                        </Stack>
                    ))}
                </Stack>
            </SettingsSection>
        </Stack>
    );
}
