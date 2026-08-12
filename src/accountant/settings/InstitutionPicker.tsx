import * as React from 'react';
import {useQuery} from '@apollo/client/react';
import {GetAvailableInstitutions, GetAvailableInstitutionsQuery, Institution} from '../../types';
import PickDialog from '../../utils/dialogs/PickDialog';
import {SxProps} from '@mui/system';
import {Box, Card, CardActionArea, CardContent, CardMedia, Theme} from '@mui/material';
import Typography from '@mui/material/Typography';

export interface InstitutionPickerProps {
    open: boolean;
    onPick: (value: Institution) => void;
    onClose: () => void;
}

export function InstitutionPicker({open, onPick, onClose}: InstitutionPickerProps): React.JSX.Element {
    const {data} = useQuery<GetAvailableInstitutionsQuery>(GetAvailableInstitutions, {variables: {country: 'pl'}});

    const institutions = data?.bankPermissions?.availableInstitutions ?? [];

    return (
        <PickDialog
            title={'Wybierz bank do podłączenia'}
            options={institutions}
            open={open}
            onClose={() => onClose()}
            onPick={value => {
                onPick(value);
            }}
            idExtractor={function (institution: Institution | null): string {
                return institution ? institution.id : '';
            }}
            descriptionExtractor={function (institution: Institution | null): string {
                return institution ? institution.name : '';
            }}
            containerProvider={(sx: SxProps<Theme>, additionalProperties: any) => {
                return (
                    <Box
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: {
                                xs: '1fr',
                                sm: 'repeat(2, minmax(0, 1fr))',
                                md: 'repeat(3, minmax(0, 1fr))',
                            },
                            gap: 1.5,
                            ...sx,
                        }}
                        {...additionalProperties}
                    />
                );
            }}
            elementContainerProvider={(sx: SxProps<Theme>, additionalProperties: any, institution: Institution) => {
                const actionAreaProperties = {...additionalProperties};
                delete actionAreaProperties.key;
                return (
                    <Card key={institution.id} variant="outlined" sx={{...sx}}>
                        <CardActionArea {...actionAreaProperties} sx={{height: '100%'}}>
                            <CardMedia
                                component="img"
                                image={institution.logo}
                                alt=""
                                sx={{height: 88, objectFit: 'contain', p: 1.5}}
                            />
                            <CardContent>
                                <Typography fontWeight={600}>{institution.name}</Typography>
                                <Typography variant="body2" color="text.secondary">
                                    BIC: {institution.bic}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    {institution.id}
                                </Typography>
                            </CardContent>
                        </CardActionArea>
                    </Card>
                );
            }}
        />
    );
}
