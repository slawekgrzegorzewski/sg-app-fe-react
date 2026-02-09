import * as React from "react";
import {useState} from "react";
import {useQuery} from "@apollo/client/react";
import {GetAvailableInstitutions, GetAvailableInstitutionsQuery, Institution} from "../../types";
import PickDialog from "../../utils/dialogs/PickDialog";
import {SxProps} from "@mui/system";
import {Card, CardContent, CardMedia, Stack, Theme} from "@mui/material";
import Typography from "@mui/material/Typography";

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
        fullScreen={true}
        title={'Wybierz bank do podłączenia'}
        options={pickNewInstitutionDialogOptions.options}
        open={pickNewInstitutionDialogOptions.open}
        onClose={() => onClose()}
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
                          sx={{flexWrap: 'wrap', ...sx}}
                          {...additionalProperties}>
            </Stack>;
        }}
        elementContainerProvider={
            (sx: SxProps<Theme>, additionalProperties: any, institution: Institution) => {
                return <Card sx={{marginBottom: '10px', maxWidth: '150px', ...sx}} {...additionalProperties}>
                    <CardMedia component="img" image={institution.logo} sx={{maxWidth: "150px"}}></CardMedia>
                    <CardContent>
                        <Typography variant="body1">
                            {institution.id}
                        </Typography>
                        <Typography variant="body2" sx={{color: "text.secondary"}}>
                            {institution.bic}
                        </Typography>
                        <Typography variant="body2" sx={{color: "text.secondary"}}>
                            {institution.name}
                        </Typography>
                    </CardContent>
                </Card>;
            }
        }
    />
}