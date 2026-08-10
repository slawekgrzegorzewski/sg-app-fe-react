import {useMutation, useQuery} from '@apollo/client/react';
import {Stack, Typography} from '@mui/material';
import * as React from 'react';
import * as Yup from 'yup';
import {LoadingIndicator, ErrorDisplay} from '../application/components/QueryState';
import {SimpleCrudList} from '../application/components/SimpleCrudList';
import {StandOutText} from '../application/components/StandOutText';
import {
    AllTimeRecordCategories,
    AllTimeRecordCategoriesQuery,
    CreateTimeRecordCategory,
    CreateTimeRecordCategoryMutation,
    DeleteTimeRecordCategory,
    DeleteTimeRecordCategoryMutation,
    TimeRecordCategory,
    UpdateTimeRecordCategory,
    UpdateTimeRecordCategoryMutation,
} from '../types';
import {ComparatorBuilder} from '../utils/comparator-builder';
import {RegularEditorField} from '../utils/forms/Form';
import {useResetMutationResults} from '../utils/use-reset-mutation-results';

type TimeRecordFormObject = {
    id: number;
    name: string;
};

const TIME_RECORD_CATEGORY_FORM = (timeRecordCategory: TimeRecordFormObject | null) => ({
    presentation: 'dialog' as const,
    submitLabel: timeRecordCategory ? 'Zapisz zmiany' : 'Dodaj kategorię',
    submitColor: 'secondary' as const,
    validationSchema: Yup.object({
        name: Yup.string().trim().required('Wymagana'),
    }),
    initialValues: {
        id: timeRecordCategory?.id || -1,
        name: timeRecordCategory?.name || '',
    } as TimeRecordFormObject,
    fields: [
        {
            label: 'id',
            type: 'HIDDEN',
            key: 'id',
            editable: false,
        } as RegularEditorField,
        {
            label: 'Nazwa kategorii',
            type: 'TEXT',
            key: 'name',
            editable: true,
            additionalProps: {autoComplete: 'off'},
        } as RegularEditorField,
    ],
});

export function IntellectualPropertySettingsMainPage() {
    const {loading, error, data, refetch} = useQuery<AllTimeRecordCategoriesQuery>(AllTimeRecordCategories);
    const [updateTimeRecordMutation, updateTimeRecordMutationResult] =
        useMutation<UpdateTimeRecordCategoryMutation>(UpdateTimeRecordCategory);
    const [deleteTimeRecordMutation, deleteTimeRecordMutationResult] =
        useMutation<DeleteTimeRecordCategoryMutation>(DeleteTimeRecordCategory);
    const [createTimeRecordMutation, createTimeRecordMutationResult] =
        useMutation<CreateTimeRecordCategoryMutation>(CreateTimeRecordCategory);

    const createTimeRecordCategory = async (timeRecordCategory: TimeRecordCategory): Promise<any> => {
        await createTimeRecordMutation({variables: {name: timeRecordCategory.name}});
        return refetch();
    };

    const deleteTimeRecordCategory = async (timeRecordCategory: TimeRecordCategory): Promise<any> => {
        await deleteTimeRecordMutation({variables: {timeRecordCategoryId: timeRecordCategory.id}});
        return refetch();
    };

    const updateTimeRecordCategory = async (timeRecordCategory: TimeRecordCategory): Promise<any> => {
        await updateTimeRecordMutation({
            variables: {timeRecordCategoryId: timeRecordCategory.id, name: timeRecordCategory.name},
        });
        return refetch();
    };

    useResetMutationResults(
        updateTimeRecordMutationResult,
        deleteTimeRecordMutationResult,
        createTimeRecordMutationResult
    );

    if (loading) {
        return <LoadingIndicator label="Ładowanie ustawień raportów..." />;
    }

    if (error) {
        return <ErrorDisplay error={error} onRetry={() => void refetch()} />;
    }

    if (!data) {
        return <></>;
    }

    const categories = [...(data.allTimeRecordCategories as TimeRecordCategory[])]
        .sort(
            ComparatorBuilder.comparing<TimeRecordCategory>(category => category.name)
                .thenComparing(category => category.id)
                .build()
        )
        .map(category => ({id: category.id, name: category.name}) as TimeRecordFormObject);

    return (
        <Stack alignItems="center" sx={{width: '100%', px: {xs: 1, sm: 2}, py: 2}}>
            <Stack spacing={2.5} sx={{width: '100%', maxWidth: 960}}>
                <Stack spacing={0.5}>
                    <Typography variant="h3">
                        <StandOutText standOutBy="both">Ustawienia raportów</StandOutText>
                    </Typography>
                    <Typography color="text.secondary">
                        Zarządzaj kategoriami używanymi do klasyfikowania raportów czasu.
                    </Typography>
                </Stack>

                <SimpleCrudList
                    title="Kategorie raportów czasu"
                    presentation="settings"
                    emptyStateLabel="Nie dodano jeszcze żadnych kategorii raportów czasu."
                    editSettings={{
                        dialogTitle: 'Edytuj kategorię raportu czasu',
                        onUpdate: updateTimeRecordCategory,
                    }}
                    createSettings={{
                        dialogTitle: 'Dodaj kategorię raportu czasu',
                        buttonLabel: 'Dodaj kategorię',
                        onCreate: createTimeRecordCategory,
                    }}
                    deleteSettings={{
                        showControl: true,
                        confirmationTitle: category => `Usunąć kategorię „${category.name}”?`,
                        confirmationMessage: 'Kategoria zostanie trwale usunięta. Tej operacji nie można cofnąć.',
                        onDelete: deleteTimeRecordCategory,
                    }}
                    list={categories}
                    idExtractor={category => category.id.toString()}
                    formSupplier={category => TIME_RECORD_CATEGORY_FORM(category || null)}
                    entityDisplay={category => <Typography sx={{overflowWrap: 'anywhere'}}>{category.name}</Typography>}
                    enableDndReorder={false}
                />
            </Stack>
        </Stack>
    );
}
