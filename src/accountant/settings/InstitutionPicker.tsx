import * as React from "react";
import {useState} from "react";
import {useQuery} from "@apollo/client";
import {GetAvailableInstitutions, GetAvailableInstitutionsQuery, Institution} from "../../types";
import PickDialog from "../../utils/dialogs/PickDialog";
import {SxProps} from "@mui/system";
import {Card, Stack, Theme} from "@mui/material";
import {InstitutionCardContent} from "./InstitutionCardContent";

export interface InstitutionPickerProps {
    onPick: (value: Institution) => void;
    onClose: () => void;
}

export function InstitutionPicker({onPick, onClose}: InstitutionPickerProps): React.JSX.Element {

    const [pickNewInstitutionDialogOptions, setPickNewInstitutionDialogOptions] = useState<{
        options: Institution[],
        open: boolean
    }>({
        options: [],
        open: false
    });

    const {data} = useQuery<GetAvailableInstitutionsQuery>(GetAvailableInstitutions, {variables: {country: 'pl'}});

    if (data && pickNewInstitutionDialogOptions.options.length !== data.bankPermissions.availableInstitutions.length) {
        setPickNewInstitutionDialogOptions({
            options: data.bankPermissions!.availableInstitutions!,
            open: true
        })
    }
    return <PickDialog
        title={'Wybierz bank do podłączenia'}
        options={pickNewInstitutionDialogOptions.options}
        open={pickNewInstitutionDialogOptions.open}
        onClose={()=>onClose()}
        onPick={(value) => {
            setPickNewInstitutionDialogOptions({options: [], open: false});
            onPick(value);
        }}
        idExtractor={function (institution: Institution | null): string {
            return institution ? institution.id : "";
        }}
        descriptionExtractor={function (institution: Institution | null): string {
            return institution ? institution.name : "";
        }}
        containerProvider={(sx: SxProps<Theme>, additionalProperties: any) => {
            return <Stack direction={'row'}
                          useFlexGap
                          sx={{flexWrap: 'wrap'}}
                          {...additionalProperties}>
            </Stack>;
        }}
        elementContainerProvider={
            (sx: SxProps<Theme>, additionalProperties: any, institution: Institution) => {
                return <Card sx={{marginBottom: '10px', maxWidth: '150px', ...sx}} {...additionalProperties}>
                    <InstitutionCardContent institution={institution}/>
                </Card>;
            }
        }
    />
}