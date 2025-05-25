import {useMutation} from "@apollo/client";
import {
    CreatePiggyBank,
    CreatePiggyBankMutation,
    DeletePiggyBank,
    DeletePiggyBankMutation,
    UpdatePiggyBank,
    UpdatePiggyBankMutation
} from "../../types";
import * as React from "react";
import * as Yup from "yup";
import {AutocompleteEditorField, BooleanEditorField, EditorField} from "../../utils/forms/Form";
import {SimpleCrudList} from "../../application/components/SimpleCrudList";
import {ComparatorBuilder} from "../../utils/comparator-builder";
import Box from "@mui/material/Box";
import {Card, Theme, useTheme} from "@mui/material";
import {SxProps} from "@mui/system";
import Decimal from "decimal.js";
import {formatBalance} from "../../utils/functions";
import Grid from "@mui/material/Grid2";
import Button from "@mui/material/Button";
import {PiggyBankBalanceEditor, Type} from "./PiggyBankBalanceEditor";

export type PiggyBankDTO = {
    publicId: string,
    name: string,
    balance: Decimal,
    monthlyTopUp: Decimal,
    description: string,
    currency: string,
    savings: boolean,
}

const PIGGY_BANK_FORM = (currencies: string[], piggyBank?: PiggyBankDTO) => {
        return {
            validationSchema: Yup.object({
                publicId: piggyBank ? Yup.string().required() : Yup.string(),
                name: Yup.string().required('Wymagana'),
                description: Yup.string(),
                currency: Yup.string()
                    .matches(
                        new RegExp(currencies.map(currency => "^" + currency + "$").join("|")),
                        "Waluta spoza dozwolonej listy")
                    .required('Wymagana'),
                monthlyTopUp: Yup.number().required(),
                balance: Yup.number().required(),
                savings: Yup.boolean().required()
            }),
            initialValues: {
                publicId: piggyBank?.publicId || '',
                name: piggyBank?.name || '',
                description: piggyBank?.description || '',
                currency: piggyBank?.currency || '',
                monthlyTopUp: piggyBank?.monthlyTopUp || 0,
                balance: piggyBank?.balance || 0,
                savings: piggyBank?.savings || false
            } as PiggyBankDTO,
            fields:
                [
                    {
                        label: 'PublicId',
                        type: 'HIDDEN',
                        key: 'publicId',
                        editable: false
                    } as EditorField,
                    {
                        label: 'Nazwa',
                        type: 'TEXT',
                        key: 'name',
                        editable: true
                    } as EditorField,
                    {
                        label: 'Opis',
                        type: 'TEXTAREA',
                        key: 'description',
                        editable: true
                    } as EditorField,
                    {
                        label: 'Waluta',
                        type: 'AUTOCOMPLETE',
                        options: currencies,
                        getOptionLabel: (option: any) => option,
                        isOptionEqualToValue: (option: any, value: any) => option === value,
                        key: 'currency',
                        editable: !piggyBank
                    } as AutocompleteEditorField,
                    {
                        label: 'Comiesięczne odkładanie',
                        type: 'NUMBER',
                        key: 'monthlyTopUp',
                        editable: true
                    } as EditorField,
                    {
                        label: 'Oszczędnościowa',
                        type: 'CHECKBOX',
                        key: 'savings',
                        editable: true
                    } as BooleanEditorField,
                ]
        };
    }
;

export interface PiggyBanksManagementProps {
    piggyBanks: PiggyBankDTO[],
    supportedCurrencies: string[],
    refetch: () => void
}

export function PiggyBanksManagement({piggyBanks, supportedCurrencies, refetch}: PiggyBanksManagementProps) {

    const [piggyBankBalanceDialogOptions, setPiggyBankBalanceDialogOptions] = React.useState<{
        type: Type,
        piggyBank: PiggyBankDTO
    } | null>(null);

    const [createPiggyBankMutation] = useMutation<CreatePiggyBankMutation>(CreatePiggyBank);
    const [updatePiggyBankMutation] = useMutation<UpdatePiggyBankMutation>(UpdatePiggyBank);
    const [deletePiggyBankMutation] = useMutation<DeletePiggyBankMutation>(DeletePiggyBank);

    const theme = useTheme();

    const createPiggyBank = async (piggyBank: PiggyBankDTO): Promise<any> => {
        return await createPiggyBankMutation({
            variables: {
                name: piggyBank.name,
                description: piggyBank.description,
                monthlyTopUp: piggyBank.monthlyTopUp,
                currency: piggyBank.currency,
                savings: piggyBank.savings
            }
        })
            .finally(() => refetch());
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
                savings: piggyBank.savings
            }
        })
            .finally(() => refetch());
    };

    const deletePiggyBank = async (publicId: string): Promise<any> => {
        return await deletePiggyBankMutation({variables: {publicId: publicId}})
            .finally(() => refetch());
    };

    return <>
        <SimpleCrudList
            title={'SKARBONKI'}
            editTitle={'Edytuj'}
            createTitle={'Dodaj'}
            list={
                piggyBanks
                    .sort(ComparatorBuilder.comparing<PiggyBankDTO>(piggyBank => piggyBank.name).build())
            }
            idExtractor={piggyBank => piggyBank.publicId}
            onCreate={piggyBank => createPiggyBank(piggyBank)}
            onUpdate={piggyBank => updatePiggyBank(piggyBank)}
            onDelete={piggyBank => deletePiggyBank(piggyBank.publicId)}
            formSupplier={piggyBank => piggyBank ? PIGGY_BANK_FORM(supportedCurrencies, piggyBank) : PIGGY_BANK_FORM(supportedCurrencies)}
            rowContainerProvider={(sx: SxProps<Theme>, additionalProperties: any) => {
                return <Card sx={{marginBottom: '10px', ...sx}} {...additionalProperties}></Card>;
            }}

            entityDisplay={(piggyBank, index) => {
                return <Grid container>
                    <Grid size={8}>
                        <Box dir={'column'} key={piggyBank.publicId} sx={{paddingLeft: '15px'}}>
                            <div>{piggyBank.name}</div>
                            <div style={{
                                color: theme.palette.text.disabled,
                                paddingLeft: '15px'
                            }}>{piggyBank.description}</div>
                            <div style={{
                                color: piggyBank.balance.toNumber() < 0 ? theme.palette.error.main : theme.palette.text.disabled,
                                paddingLeft: '15px'
                            }}>Stan: {formatBalance(piggyBank.currency, piggyBank.balance)}</div>
                            {
                                piggyBank.monthlyTopUp.toNumber() > 0 && (<div style={{
                                    color: theme.palette.text.disabled,
                                    paddingLeft: '15px'
                                }}>Miesięczne uznania: {formatBalance(piggyBank.currency, piggyBank.monthlyTopUp)}</div>)
                            }
                            {
                                piggyBank.savings && (<div style={{
                                    color: theme.palette.warning.main,
                                    paddingLeft: '15px'
                                }}>Do przechowywania oszczędności</div>)
                            }
                        </Box>
                    </Grid>
                    <Grid size={4}>
                        <Button variant="text" onClick={(event) => {
                            event.stopPropagation();
                            setPiggyBankBalanceDialogOptions({type: 'CREDIT', piggyBank: piggyBank});
                        }} color="inherit">
                            Uznaj
                        </Button>
                        <Button variant="text" onClick={(event) => {
                            event.stopPropagation();
                            setPiggyBankBalanceDialogOptions({type: 'DEBIT', piggyBank: piggyBank});
                        }} color="inherit">
                            Obciąż
                        </Button>
                    </Grid>
                </Grid>;
            }}
            enableDndReorder={false}
        />
        {piggyBankBalanceDialogOptions?.piggyBank && (
            <PiggyBankBalanceEditor
                type={piggyBankBalanceDialogOptions.type}
                piggyBank={piggyBankBalanceDialogOptions.piggyBank}
                onSave={(piggyBank) => {
                    updatePiggyBank(piggyBank);
                    setPiggyBankBalanceDialogOptions(null);
                }}
                onCancel={() => {
                    setPiggyBankBalanceDialogOptions(null)
                }}
            />)}
    </>
}