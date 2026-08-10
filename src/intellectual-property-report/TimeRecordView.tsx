import {useResetMutationResults} from '../utils/use-reset-mutation-results';
import {Chip, Divider, IconButton, Paper, Stack, Tooltip, Typography} from '@mui/material';
import * as React from 'react';
import {EditorField} from '../utils/forms/Form';
import {FormDialogButton} from '../utils/buttons/FormDialogButton';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
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
    const {relatedTask, timeRecord, refetchDataCallback, dialogOptions} = properties;
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
                assignmentAction,
                date: date.format('YYYY-MM-DD'),
                description,
                numberOfHours,
                taskId,
                timeRecordId,
            },
        });
        return refetchDataCallback();
    };

    const deleteTimeRecord = async (timeRecordId: number): Promise<any> => {
        await deleteTimeRecordMutation({variables: {timeRecordId}});
        return refetchDataCallback();
    };

    useResetMutationResults(updateTimeRecordMutationResult, deleteTimeRecordMutationResult);

    return (
        <Paper component="article" variant="outlined" sx={{p: 1.25}}>
            <Stack direction="row" alignItems="flex-start" justifyContent="space-between" gap={1}>
                <Stack spacing={0.5} sx={{minWidth: 0}}>
                    <Stack direction="row" alignItems="center" flexWrap="wrap" gap={0.75}>
                        <Chip
                            size="small"
                            color="secondary"
                            variant="outlined"
                            label={`${timeRecord.numberOfHours} godz.`}
                        />
                        {relatedTask && <Chip size="small" variant="outlined" label="Przypisane do zadania" />}
                    </Stack>
                    <Typography sx={{overflowWrap: 'anywhere'}}>{timeRecord.description || 'Bez opisu'}</Typography>
                    {relatedTask && (
                        <Typography variant="body2" color="text.secondary" sx={{overflowWrap: 'anywhere'}}>
                            Zadanie: {relatedTask.description}
                        </Typography>
                    )}
                </Stack>
                <Stack direction="row" flexShrink={0} divider={<Divider orientation="vertical" flexItem />}>
                    <FormDialogButton
                        title={dialogOptions.title}
                        buttonContent={
                            <Tooltip title="Edytuj raport czasu">
                                <IconButton
                                    size="small"
                                    aria-label={`Edytuj raport czasu ${timeRecord.description || timeRecord.id}`}
                                >
                                    <EditRoundedIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
                        }
                        onConfirm={value => {
                            const taskId = value.task?.id === -1 ? null : value.task?.id || null;
                            return updateTimeRecord(
                                taskId ? AssignmentAction.Assign : AssignmentAction.Unassign,
                                value.date,
                                value.description || '',
                                value.numberOfHours,
                                taskId,
                                value.id
                            );
                        }}
                        onCancel={() => Promise.resolve()}
                        formProps={{
                            presentation: 'dialog',
                            submitLabel: 'Zapisz zmiany',
                            submitColor: 'secondary',
                            initialValues: {
                                task: {id: relatedTask?.id || -1, description: relatedTask?.description || ''},
                                id: timeRecord.id,
                                date: dayjs(timeRecord.date),
                                description: timeRecord.description || '',
                                numberOfHours: timeRecord.numberOfHours,
                            },
                            fields: dialogOptions.editorFields,
                            validationSchema: Yup.object({
                                task: Yup.object().nullable(),
                                date: Yup.mixed<Dayjs>().required('Wymagana'),
                                description: Yup.string(),
                                numberOfHours: Yup.number().moreThan(0, 'Wartość musi być większa od zera').required(),
                            }),
                        }}
                    />
                    <DeleteButton
                        title="Usunąć raport czasu?"
                        confirmationMessage={
                            <>Raport „{timeRecord.description || 'Bez opisu'}” zostanie trwale usunięty.</>
                        }
                        buttonContent={
                            <Tooltip title="Usuń raport czasu">
                                <IconButton
                                    size="small"
                                    color="error"
                                    aria-label={`Usuń raport czasu ${timeRecord.description || timeRecord.id}`}
                                >
                                    <DeleteOutlineRoundedIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
                        }
                        object={timeRecord.id}
                        onDelete={deleteTimeRecord}
                        onCancel={() => Promise.resolve()}
                    />
                </Stack>
            </Stack>
        </Paper>
    );
}
