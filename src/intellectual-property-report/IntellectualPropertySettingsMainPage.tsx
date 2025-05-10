import {useMutation, useQuery} from "@apollo/client";
import {
    AllTimeRecordCategories,
    AllTimeRecordCategoriesQuery,
    CreateTimeRecordCategory,
    CreateTimeRecordMutation,
    DeleteTimeRecordCategory,
    DeleteTimeRecordMutation,
    UpdateTimeRecordCategory,
    UpdateTimeRecordMutation
} from "../types";
import * as React from "react";
import {Stack} from "@mui/material";
import {SimpleCrudList} from "../application/components/SimpleCrudList";
import {ComparatorBuilder} from "../utils/comparator-builder";
import {mapTimeRecordCategory, NON_EXISTING_ID, TimeRecordCategoryDTO} from "./model/types";
import * as Yup from "yup";
import {RegularEditorField} from "../utils/forms/Form";

const TIME_RECORD_CATEGORY_FORM = (timeRecordCategory: TimeRecordCategoryDTO | null) => {
        return {
            validationSchema: Yup.object({
                name: Yup.string().required('Wymagana')
            }),
            initialValues: {
                timeRecordId: timeRecordCategory?.timeRecordId || NON_EXISTING_ID,
                id: timeRecordCategory?.id || NON_EXISTING_ID,
                name: timeRecordCategory?.name || ''
            } as TimeRecordCategoryDTO,
            fields:
                [
                    {
                        label: 'timeRecordId',
                        type: 'HIDDEN',
                        key: 'timeRecordId',
                        editable: false
                    } as RegularEditorField,
                    {
                        label: 'id',
                        type: 'HIDDEN',
                        key: 'id',
                        editable: false
                    } as RegularEditorField,
                    {
                        label: 'Nazwa',
                        type: 'TEXT',
                        key: 'name',
                        editable: true
                    } as RegularEditorField
                ]
        };
    }
;

export function IntellectualPropertySettingsMainPage() {

    const {
        loading,
        error,
        data,
        refetch
    } = useQuery<AllTimeRecordCategoriesQuery>(AllTimeRecordCategories);

    const [updateTimeRecordMutation, updateTimeRecordMutationResult] = useMutation<UpdateTimeRecordMutation>(UpdateTimeRecordCategory);
    const [deleteTimeRecordMutation, deleteTimeRecordMutationResult] = useMutation<DeleteTimeRecordMutation>(DeleteTimeRecordCategory);
    const [createTimeRecordMutation, createTimeRecordMutationResult] = useMutation<CreateTimeRecordMutation>(CreateTimeRecordCategory);

    const createTimeRecordCategory = async (timeRecordCategory: TimeRecordCategoryDTO): Promise<any> => {
        await createTimeRecordMutation({
            variables: {
                name: timeRecordCategory.name
            }
        });
        return refetch();
    }
    const deleteTimeRecordCategory = async (timeRecordCategory: TimeRecordCategoryDTO): Promise<any> => {
        await deleteTimeRecordMutation({
            variables: {
                timeRecordCategoryId: timeRecordCategory.id
            }
        });
        return refetch();
    }
    const updateTimeRecordCategory = async (timeRecordCategory: TimeRecordCategoryDTO): Promise<any> => {
        await updateTimeRecordMutation({
            variables: {
                timeRecordCategoryId: timeRecordCategory.id,
                name: timeRecordCategory.name
            }
        });
        return refetch();
    }

    updateTimeRecordMutationResult.called && updateTimeRecordMutationResult.reset();
    deleteTimeRecordMutationResult.called && deleteTimeRecordMutationResult.reset();
    createTimeRecordMutationResult.called && createTimeRecordMutationResult.reset();

    if (loading) {
        return <>Loading...</>
    } else if (error) {
        return <>Error...</>
    } else if (data) {
        return <Stack direction={'column'} sx={{width: '400px'}}>
            <SimpleCrudList
                title={'Kategorie raportów czasowych'}
                editTitle={'Edytuj kategorię raportu czasowego'}
                createTitle={'Dodaj kategorię raportu czasowego'}
                list={
                    [...data.allTimeRecordCategories]
                        .map(timeRecordCategory => mapTimeRecordCategory(NON_EXISTING_ID, timeRecordCategory))
                        .sort(ComparatorBuilder.comparing<TimeRecordCategoryDTO>(timeRecordCategory => timeRecordCategory.name).thenComparing(timeRecordCategory => timeRecordCategory.id).build())
                }
                idExtractor={timeRecordCategory => timeRecordCategory.id.toString()}
                onCreate={timeRecordCategory => createTimeRecordCategory(timeRecordCategory)}
                onUpdate={timeRecordCategory => updateTimeRecordCategory(timeRecordCategory)}
                onDelete={timeRecordCategory => deleteTimeRecordCategory(timeRecordCategory)}
                formSupplier={timeRecordCategory => TIME_RECORD_CATEGORY_FORM(timeRecordCategory || null)}
                entityDisplay={timeRecordCategory => <>{timeRecordCategory.name}</>}
                enableDndReorder={false}
            />
        </Stack>
    } else {
        return <></>;
    }
}