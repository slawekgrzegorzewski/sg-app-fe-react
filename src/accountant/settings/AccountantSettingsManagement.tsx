import {useMutation} from "@apollo/client";
import {UpdateAccountantSettings, UpdateAccountantSettingsMutation} from "../../types";
import * as React from "react";
import * as Yup from "yup";
import Form, {BooleanEditorField} from "../../utils/forms/Form";

export type AccountantSettingsDTO = {
    isCompany: boolean;
}

const ACCOUNTANT_SETTINGS_FORM = (accountSettings: AccountantSettingsDTO) => {
    return {
        validationSchema: Yup.object({
            isCompany: Yup.boolean().required()
        }),
        initialValues: {
            isCompany: accountSettings.isCompany
        } as AccountantSettingsDTO,
        fields:
            [
                {
                    label: 'Dla firmy',
                    type: 'CHECKBOX',
                    key: 'isCompany',
                    editable: true
                } as BooleanEditorField
            ]
    };
};

export interface AccountantSettingsManagementProps {
    accountantSettings: AccountantSettingsDTO,
    refetch: () => void
}

export function AccountantSettingsManagement({accountantSettings, refetch}: AccountantSettingsManagementProps) {

    const [updateAccountantSettingsMutation] = useMutation<UpdateAccountantSettingsMutation>(UpdateAccountantSettings);

    const updateAccountantSettings = async (isCompany: boolean): Promise<any> => {
        return await updateAccountantSettingsMutation({
            variables: {
                isCompany: isCompany
            }
        })
            .finally(() => refetch());
    };

    return <Form
        {...ACCOUNTANT_SETTINGS_FORM(accountantSettings)}
        onSave={(v) => {
            updateAccountantSettings(v.isCompany)
        }}
        onCancel={() => {
        }}
        autoSubmit={true}
        showControlButtons={false}
    />
}