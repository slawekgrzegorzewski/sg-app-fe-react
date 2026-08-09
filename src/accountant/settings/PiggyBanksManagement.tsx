import {useMutation} from '@apollo/client/react';
import {
    CreatePiggyBank,
    CreatePiggyBankMutation,
    DeletePiggyBank,
    DeletePiggyBankMutation,
    UpdatePiggyBank,
    UpdatePiggyBankMutation,
} from '../../types';
import * as React from 'react';
import * as Yup from 'yup';
import {AutocompleteEditorField, BooleanEditorField, EditorField} from '../../utils/forms/Form';
import {SimpleCrudList} from '../../application/components/SimpleCrudList';
import {ComparatorBuilder} from '../../utils/comparator-builder';
import {Chip, Stack, Typography} from '@mui/material';
import Decimal from 'decimal.js';
import {formatBalance} from '../../utils/functions';
import Grid from '@mui/material/Grid';
import {PiggyBankBalanceEditor, Type} from './PiggyBankBalanceEditor';
import {StandOutText} from '../../application/components/StandOutText';
import {PiggyBankBalanceActions} from '../PiggyBankBalanceActions';

export type PiggyBankDTO = {
    publicId: string;
    name: string;
    balance: Decimal;
    monthlyTopUp: Decimal;
    description: string;
    currency: string;
    savings: boolean;
};

const PIGGY_BANK_FORM = (currencies: string[], piggyBank?: PiggyBankDTO) => {
    return {
        validationSchema: Yup.object({
            publicId: piggyBank ? Yup.string().required() : Yup.string(),
            name: Yup.string().required('Wymagana'),
            description: Yup.string(),
            currency: Yup.string()
                .matches(
                    new RegExp(currencies.map(currency => '^' + currency + '$').join('|')),
                    'Waluta spoza dozwolonej listy'
                )
                .required('Wymagana'),
            monthlyTopUp: Yup.number().required(),
            balance: Yup.number().required(),
            savings: Yup.boolean().required(),
        }),
        initialValues: {
            publicId: piggyBank?.publicId || '',
            name: piggyBank?.name || '',
            description: piggyBank?.description || '',
            currency: piggyBank?.currency || '',
            monthlyTopUp: piggyBank?.monthlyTopUp || 0,
            balance: piggyBank?.balance || 0,
            savings: piggyBank?.savings || false,
        } as PiggyBankDTO,
        fields: [
            {
                label: 'PublicId',
                type: 'HIDDEN',
                key: 'publicId',
                editable: false,
            } as EditorField,
            {
                label: 'Nazwa',
                type: 'TEXT',
                key: 'name',
                editable: true,
            } as EditorField,
            {
                label: 'Opis',
                type: 'TEXTAREA',
                key: 'description',
                editable: true,
            } as EditorField,
            {
                label: 'Waluta',
                type: 'AUTOCOMPLETE',
                options: currencies,
                getOptionLabel: (option: any) => option,
                isOptionEqualToValue: (option: any, value: any) => option === value,
                key: 'currency',
                editable: !piggyBank,
            } as AutocompleteEditorField,
            {
                label: 'Comiesięczne odkładanie',
                type: 'NUMBER',
                key: 'monthlyTopUp',
                editable: true,
            } as EditorField,
            {
                label: 'Oszczędnościowa',
                type: 'CHECKBOX',
                key: 'savings',
                editable: true,
            } as BooleanEditorField,
        ],
    };
};

export interface PiggyBanksManagementProps {
    piggyBanks: PiggyBankDTO[];
    supportedCurrencies: string[];
    refetch: () => void;
}

export function PiggyBanksManagement({piggyBanks, supportedCurrencies, refetch}: PiggyBanksManagementProps) {
    const [piggyBankBalanceDialogOptions, setPiggyBankBalanceDialogOptions] = React.useState<{
        type: Type;
        piggyBank: PiggyBankDTO;
    } | null>(null);

    const [createPiggyBankMutation] = useMutation<CreatePiggyBankMutation>(CreatePiggyBank);
    const [updatePiggyBankMutation] = useMutation<UpdatePiggyBankMutation>(UpdatePiggyBank);
    const [deletePiggyBankMutation] = useMutation<DeletePiggyBankMutation>(DeletePiggyBank);

    const createPiggyBank = async (piggyBank: PiggyBankDTO): Promise<any> => {
        return await createPiggyBankMutation({
            variables: {
                name: piggyBank.name,
                description: piggyBank.description,
                monthlyTopUp: piggyBank.monthlyTopUp,
                currency: piggyBank.currency,
                savings: piggyBank.savings,
            },
        }).finally(() => refetch());
    };

    const updatePiggyBank = async (piggyBank: PiggyBankDTO): Promise<any> => {
        return await updatePiggyBankMutation({
            variables: {
                publicId: piggyBank.publicId,
                name: piggyBank.name,
                description: piggyBank.description,
                balance: piggyBank.balance,
                monthlyTopUp: piggyBank.monthlyTopUp,
                currency: piggyBank.currency,
                savings: piggyBank.savings,
            },
        }).finally(() => refetch());
    };

    const deletePiggyBank = async (piggyBank: PiggyBankDTO): Promise<any> => {
        return await deletePiggyBankMutation({variables: {publicId: piggyBank.publicId}}).finally(() => refetch());
    };

    return (
        <>
            <SimpleCrudList
                title={'SKARBONKI'}
                editSettings={{
                    dialogTitle: 'Edytuj',
                    onUpdate: updatePiggyBank,
                }}
                createSettings={{
                    dialogTitle: 'Dodaj',
                    onCreate: createPiggyBank,
                }}
                deleteSettings={{
                    showControl: true,
                    onDelete: deletePiggyBank,
                }}
                list={piggyBanks.sort(ComparatorBuilder.comparing<PiggyBankDTO>(piggyBank => piggyBank.name).build())}
                idExtractor={piggyBank => piggyBank.publicId}
                formSupplier={piggyBank =>
                    piggyBank ? PIGGY_BANK_FORM(supportedCurrencies, piggyBank) : PIGGY_BANK_FORM(supportedCurrencies)
                }
                entityDisplay={piggyBank => {
                    return (
                        <Grid container width="100%" alignItems="flex-start" spacing={1}>
                            <Grid size={8}>
                                <Stack direction="column" key={piggyBank.publicId} sx={{minWidth: 0}}>
                                    <Typography>
                                        <StandOutText standOutBy="bold">{piggyBank.name}</StandOutText>
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        {piggyBank.description}
                                    </Typography>
                                    <Typography
                                        variant="body2"
                                        sx={{
                                            color: piggyBank.balance.toNumber() < 0 ? 'error.main' : 'text.secondary',
                                            fontVariantNumeric: 'tabular-nums',
                                        }}
                                    >
                                        <StandOutText standOutBy="bold">
                                            Stan: {formatBalance(piggyBank.currency, piggyBank.balance)}
                                        </StandOutText>
                                    </Typography>
                                    {piggyBank.monthlyTopUp.toNumber() > 0 && (
                                        <Typography variant="body2" color="text.secondary">
                                            Miesięczne uznania:{' '}
                                            {formatBalance(piggyBank.currency, piggyBank.monthlyTopUp)}
                                        </Typography>
                                    )}
                                    {piggyBank.savings && (
                                        <Chip
                                            size="small"
                                            variant="outlined"
                                            color="secondary"
                                            label="Do przechowywania oszczędności"
                                            sx={{mt: 0.5, alignSelf: 'flex-start'}}
                                        />
                                    )}
                                </Stack>
                            </Grid>
                            <Grid size={4} sx={{textAlign: 'right'}}>
                                <PiggyBankBalanceActions
                                    piggyBankName={piggyBank.name}
                                    onCredit={() => {
                                        setPiggyBankBalanceDialogOptions({type: 'CREDIT', piggyBank: piggyBank});
                                    }}
                                    onDebit={() => {
                                        setPiggyBankBalanceDialogOptions({type: 'DEBIT', piggyBank: piggyBank});
                                    }}
                                />
                            </Grid>
                        </Grid>
                    );
                }}
                enableDndReorder={false}
            />
            {piggyBankBalanceDialogOptions?.piggyBank && (
                <PiggyBankBalanceEditor
                    type={piggyBankBalanceDialogOptions.type}
                    piggyBank={piggyBankBalanceDialogOptions.piggyBank}
                    onSave={piggyBank => {
                        updatePiggyBank(piggyBank);
                        setPiggyBankBalanceDialogOptions(null);
                    }}
                    onCancel={() => {
                        setPiggyBankBalanceDialogOptions(null);
                    }}
                />
            )}
        </>
    );
}
