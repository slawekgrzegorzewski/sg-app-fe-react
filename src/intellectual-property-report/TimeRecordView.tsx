import {useResetMutationResults} from '../utils/use-reset-mutation-results';
import {Stack} from '@mui/material';
import * as React from 'react';
import {EditorField} from '../utils/forms/Form';
import {FormDialogButton} from '../utils/buttons/FormDialogButton';
import IconButton from '@mui/material/IconButton';
import {Delete, Edit} from '@mui/icons-material';
import * as Yup from 'yup';
import {useMutation} from '@apollo/client/react';
import {
    AssignmentAction,
    DeleteTimeRecord,
    DeleteTimeRecordMutation,
    Task,
    TimeRecord,
    UpdateTimeRecord,
    UpdateTimeRecordMutation,
} from '../types';
import dayjs, {Dayjs} from 'dayjs';
import {DeleteButton} from '../utils/buttons/DeleteButton';

export function TimeRecordView(properties: {
    relatedTask: Task | null;
    timeRecord: TimeRecord;
    refetchDataCallback: () => void;
    dialogOptions: {title: string; editorFields: EditorField[]};
}) {
    const {
        relatedTask,
        timeRecord,
        refetchDataCallback,
        dialogOptions: {title, editorFields},
    } = properties;

    const [updateTimeRecordMutation, updateTimeRecordMutationResult] =
        useMutation<UpdateTimeRecordMutation>(UpdateTimeRecord);
    const [deleteTimeRecordMutation, deleteTimeRecordMutationResult] =
        useMutation<DeleteTimeRecordMutation>(DeleteTimeRecord);

    const updateTimeRecord = async (
        assignmentAction: AssignmentAction,
        date: Dayjs,
        description: string,
        numberOfHours: number,
        taskId: number | null,
        timeRecordId: number
    ): Promise<any> => {
        await updateTimeRecordMutation({
            variables: {
                assignmentAction: assignmentAction,
                date: date.format('YYYY-MM-DD'),
                description: description,
                numberOfHours: numberOfHours,
                taskId: taskId,
                timeRecordId: timeRecordId,
            },
        });
        return refetchDataCallback();
    };

    const deleteTimeRecord = async (timeRecordId: number): Promise<any> => {
        await deleteTimeRecordMutation({
            variables: {
                timeRecordId: timeRecordId,
            },
        });
        return refetchDataCallback();
    };

    useResetMutationResults(updateTimeRecordMutationResult, deleteTimeRecordMutationResult);

    return (
        <Stack direction="row">
            <FormDialogButton
                title={title}
                buttonContent={
                    <IconButton size="small" aria-label={'Edytuj'}>
                        <Edit fontSize="inherit" />
                    </IconButton>
                }
                onConfirm={value => {
                    let taskId: number | null = value.task?.id;
                    if (taskId === -1) taskId = null;
                    return updateTimeRecord(
                        taskId ? AssignmentAction.Assign : AssignmentAction.Unassign,
                        value.date,
                        value.description || '',
                        value.numberOfHours,
                        taskId,
                        value.id
                    );
                }}
                onCancel={() => {
                    return Promise.resolve();
                }}
                formProps={{
                    initialValues: {
                        task: {id: relatedTask?.id || -1, description: relatedTask?.description || '---'},
                        id: timeRecord.id,
                        date: dayjs(timeRecord.date),
                        description: timeRecord.description,
                        numberOfHours: timeRecord.numberOfHours,
                    },
                    fields: editorFields,
                    validationSchema: Yup.object({}),
                }}
            />
            <DeleteButton
                confirmationMessage={'Na pewno usunąć ' + timeRecord!.id + ' - ' + timeRecord!.description + '?'}
                buttonContent={
                    <IconButton size="small" aria-label={'Usuń'}>
                        <Delete fontSize="inherit" />
                    </IconButton>
                }
                object={timeRecord!.id}
                onDelete={deleteTimeRecord}
                onCancel={() => {
                    return Promise.resolve();
                }}
            />
            {timeRecord.numberOfHours} godzin {timeRecord.description}
        </Stack>
    );
}
