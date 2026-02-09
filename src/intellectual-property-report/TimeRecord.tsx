import {Stack} from "@mui/material";
import * as React from "react";
import {EditorField} from "../utils/forms/Form";
import {NON_EXISTING_ID, TaskDTO, TimeRecordDTO} from "./model/types";
import {FormDialogButton} from "../utils/buttons/FormDialogButton";
import IconButton from "@mui/material/IconButton";
import {Delete, Edit} from "@mui/icons-material";
import * as Yup from "yup";
import {useMutation} from "@apollo/client/react";
import {
    AssignmentAction,
    DeleteTimeRecord,
    DeleteTimeRecordMutation,
    UpdateTimeRecord,
    UpdateTimeRecordMutation
} from "../types";
import dayjs from "dayjs";
import {DeleteButton} from "../utils/buttons/DeleteButton";

export function TimeRecord(properties: {
    relatedTask: TaskDTO | null,
    timeRecord: TimeRecordDTO,
    refetchDataCallback: () => void,
    dialogOptions: { title: string, editorFields: EditorField[] }
}) {

    const {relatedTask, timeRecord, refetchDataCallback, dialogOptions: {title, editorFields}} = properties;


    const [updateTimeRecordMutation, updateTimeRecordMutationResult] = useMutation<UpdateTimeRecordMutation>(UpdateTimeRecord);
    const [deleteTimeRecordMutation, deleteTimeRecordMutationResult] = useMutation<DeleteTimeRecordMutation>(DeleteTimeRecord);

    const updateTimeRecord = async (assignmentAction: AssignmentAction,
                                    date: string,
                                    description: string,
                                    numberOfHours: number,
                                    taskId: number | null,
                                    timeRecordId: number): Promise<any> => {
        await updateTimeRecordMutation({
            variables: {
                assignmentAction: assignmentAction,
                date: date,
                description: description,
                numberOfHours: numberOfHours,
                taskId: taskId,
                timeRecordId: timeRecordId
            }
        });
        return refetchDataCallback();
    }

    const deleteTimeRecord = async (timeRecordId: number): Promise<any> => {
        await deleteTimeRecordMutation({
            variables: {
                timeRecordId: timeRecordId
            }
        });
        return refetchDataCallback();
    }

    updateTimeRecordMutationResult.called && updateTimeRecordMutationResult.reset();
    deleteTimeRecordMutationResult.called && deleteTimeRecordMutationResult.reset();

    return (
        <Stack direction="row">
            <FormDialogButton
                title={title}
                buttonContent={<IconButton size="small"><Edit fontSize='inherit'/></IconButton>}
                onSave={(value) => {
                    let taskId: number | null = value.task?.id;
                    if (taskId === NON_EXISTING_ID)
                        taskId = null;
                    return updateTimeRecord(
                        taskId ? AssignmentAction.Assign : AssignmentAction.Unassign,
                        value.date,
                        value.description,
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
                        task: {id: relatedTask?.id || NON_EXISTING_ID, description: relatedTask?.description || '---'},
                        id: timeRecord.id,
                        date: dayjs(timeRecord.date).format("YYYY-MM-DD"),
                        description: timeRecord.description,
                        numberOfHours: timeRecord.numberOfHours
                    },
                    fields: editorFields,
                    validationSchema: Yup.object({})
                }}
            />
            <DeleteButton
                confirmationMessage={'Na pewno usunąć ' + timeRecord!.id + ' - ' + timeRecord!.description + '?'}
                buttonContent={<IconButton size="small"><Delete fontSize='inherit'/></IconButton>}
                object={timeRecord!.id}
                onDelete={deleteTimeRecord}
                onCancel={() => {
                    return Promise.resolve();
                }}/>
            {timeRecord.numberOfHours} godzin {timeRecord.description}
        </Stack>

    );
}