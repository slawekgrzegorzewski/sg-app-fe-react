import {useMutation} from '@apollo/client/react';
import {UpdateAccountantSettings, UpdateAccountantSettingsMutation} from '../../types';
import * as React from 'react';
import {Paper, Stack, Switch, Typography} from '@mui/material';

export type AccountantSettingsDTO = {
    isCompany: boolean;
};

export interface AccountantSettingsManagementProps {
    accountantSettings: AccountantSettingsDTO;
    refetch: () => void;
}

export function AccountantSettingsManagement({accountantSettings, refetch}: AccountantSettingsManagementProps) {
    const [updateAccountantSettingsMutation, updateResult] =
        useMutation<UpdateAccountantSettingsMutation>(UpdateAccountantSettings);

    const updateAccountantSettings = async (isCompany: boolean): Promise<any> => {
        return await updateAccountantSettingsMutation({variables: {isCompany}}).finally(() => refetch());
    };

    return (
        <Paper component="section" variant="outlined" sx={{p: {xs: 1.5, sm: 2}}}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
                <Stack>
                    <Typography variant="h4">Tryb firmowy</Typography>
                    <Typography variant="body2" color="text.secondary">
                        Włącza ustawienia klientów i dostawców.
                    </Typography>
                </Stack>
                <Switch
                    checked={accountantSettings.isCompany}
                    disabled={updateResult.loading}
                    onChange={event => void updateAccountantSettings(event.target.checked)}
                    slotProps={{input: {'aria-label': 'Tryb firmowy'}}}
                />
            </Stack>
        </Paper>
    );
}
