import {ErrorDisplay} from "../application/components/QueryState";
import {useResetMutationResults} from "../utils/use-reset-mutation-results";
import {useMutation, useQuery} from "@apollo/client/react";
import {
    AllTimeRecordCategories,
    AllTimeRecordCategoriesQuery,
    CreateTimeRecordCategory,
    CreateTimeRecordMutation,
    DeleteTimeRecordCategory,
    DeleteTimeRecordMutation,
    TimeRecordCategory,
    UpdateTimeRecordCategory,
    UpdateTimeRecordMutation
} from "../types";
import * as React from "react";
import {Stack} from "@mui/material";
import {SimpleCrudList} from "../application/components/SimpleCrudList";
import {ComparatorBuilder} from "../utils/comparator-builder";
import * as Yup from "yup";
import {RegularEditorField} from "../utils/forms/Form";

type TimeRecordFormObject = {
    id: number,
    name: string
}

const TIME_RECORD_CATEGORY_FORM = (timeRecordCategory: TimeRecordFormObject | null) => {
        return {
            validationSchema: Yup.object({
                name: Yup.string().required('Wymagana')
            }),
            initialValues: {
                id: timeRecordCategory?.id || -1,
                name: timeRecordCategory?.name || ''
            } as TimeRecordFormObject,
            fields:
                [
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
    };

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

    const createTimeRecordCategory = async (timeRecordCategory: TimeRecordCategory): Promise<any> => {
        await createTimeRecordMutation({
            variables: {
                name: timeRecordCategory.name
            }
        });
        return refetch();
    }
    const deleteTimeRecordCategory = async (timeRecordCategory: TimeRecordCategory): Promise<any> => {
        await deleteTimeRecordMutation({
            variables: {
                timeRecordCategoryId: timeRecordCategory.id
            }
        });
        return refetch();
    }
    const updateTimeRecordCategory = async (timeRecordCategory: TimeRecordCategory): Promise<any> => {
        await updateTimeRecordMutation({
            variables: {
                timeRecordCategoryId: timeRecordCategory.id,
                name: timeRecordCategory.name
            }
        });
        return refetch();
    }

    useResetMutationResults(updateTimeRecordMutationResult, deleteTimeRecordMutationResult, createTimeRecordMutationResult);

    if (loading) {
        return <></>
    } else if (error) {
        return <ErrorDisplay error={error}/>
    } else if (data) {
        return <Stack direction={'column'} sx={{width: '400px'}}>
            <SimpleCrudList
                title={'Kategorie raportów czasowych'}
                editSettings={{
                    dialogTitle: 'Edytuj kategorię raportu czasowego',
                    onUpdate: updateTimeRecordCategory,
                }}
                createSettings={{
                    dialogTitle: 'Dodaj kategorię raportu czasowego',
                    onCreate: createTimeRecordCategory,
                }}
                deleteSettings={{
                    showControl: true,
                    onDelete: deleteTimeRecordCategory,
                }}
                list={
                    [...data.allTimeRecordCategories as TimeRecordCategory[]]
                        .sort(ComparatorBuilder.comparing<TimeRecordCategory>(timeRecordCategory => timeRecordCategory.name).thenComparing(timeRecordCategory => timeRecordCategory.id).build())
                        .map(timeRecordCategory => {
                            return {
                                id: timeRecordCategory.id,
                                name: timeRecordCategory.name
                            } as TimeRecordFormObject
                        })
                }
                idExtractor={timeRecordCategory => timeRecordCategory.id.toString()}
                formSupplier={timeRecordCategory => TIME_RECORD_CATEGORY_FORM(timeRecordCategory || null)}
                entityDisplay={timeRecordCategory => <>{timeRecordCategory.name}</>}
                enableDndReorder={false}
            />
        </Stack>
    } else {
        return <></>;
    }
}