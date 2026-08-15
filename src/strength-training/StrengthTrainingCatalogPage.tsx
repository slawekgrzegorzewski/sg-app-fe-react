import {useQuery} from '@apollo/client/react';
import {Stack, Typography} from '@mui/material';
import {ErrorDisplay, LoadingIndicator} from '../application/components/QueryState';
import {GetStrengthTrainingExerciseCatalog, GetStrengthTrainingExerciseCatalogQuery} from '../types';
import {StandOutText} from '../application/components/StandOutText';
import {StrengthTrainingCatalogManagement} from './StrengthTrainingCatalogManagement';
import {useApplicationNavigation} from '../utils/use-application-navigation';
import {useParams} from 'react-router-dom';

export function StrengthTrainingCatalogPage() {
    const {page, param1} = useParams();
    const {changePage} = useApplicationNavigation();
    const {loading, error, data, refetch} = useQuery<GetStrengthTrainingExerciseCatalogQuery>(
        GetStrengthTrainingExerciseCatalog
    );

    if (loading) {
        return <LoadingIndicator label="Ładowanie katalogu ćwiczeń..." />;
    }

    if (error) {
        return <ErrorDisplay error={error} onRetry={() => void refetch()} />;
    }

    if (!data) {
        return <></>;
    }

    return (
        <Stack alignItems="center" sx={{width: '100%', px: {xs: 1, sm: 2}, py: 2}}>
            <Stack spacing={3} sx={{width: '100%', maxWidth: 960}}>
                <Typography variant="h3">
                    <StandOutText standOutBy="both">Katalog ćwiczeń</StandOutText>
                </Typography>
                <StrengthTrainingCatalogManagement
                    catalog={data.strengthTraining}
                    refetch={refetch}
                    selectedFamilyPublicId={param1}
                    selectedVariantDimensionPublicId={page === 'variant-dimensions' ? param1 : undefined}
                    onSelectFamily={familyPublicId => changePage('catalog', [familyPublicId])}
                    onSelectVariantDimension={dimensionPublicId =>
                        changePage('variant-dimensions', [dimensionPublicId])
                    }
                    onBackToCatalog={() => changePage('catalog')}
                />
            </Stack>
        </Stack>
    );
}
