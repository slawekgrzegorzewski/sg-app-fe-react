import {useMutation} from "@apollo/client/react";
import {
    DeleteTask,
    DeleteTaskAttachment,
    DeleteTaskAttachmentMutation,
    DeleteTaskMutation,
    UpdateTask,
    UpdateTaskMutation,
    UploadTaskAttachment,
    UploadTaskAttachmentMutation
} from "../types";
import {Box, Stack, Theme} from "@mui/material";
import {Delete, Download, Edit, Loupe, Upload} from "@mui/icons-material";
import * as React from "react";
import {FormDialogButton} from "../utils/buttons/FormDialogButton";
import {DeleteButton} from "../utils/buttons/DeleteButton";
import * as Yup from "yup";
import IconButton from "@mui/material/IconButton";
import {TaskDTO} from "./model/types";
import {EditorField} from "../utils/forms/Form";
import {SxProps} from "@mui/system/styleFunctionSx";
import dayjs from "dayjs";
import {styled} from "@mui/system";
import {useCurrentUser} from "../utils/users/use-current-user";
import {ShowInformationButton} from "../utils/buttons/ShowInformationButton";
import {useParams} from "react-router-dom";

const sidePadding = {
    paddingLeft: '5px', paddingRight: '5px'
}

const VisuallyHiddenInput = styled('input')({
    clip: 'rect(0 0 0 0)',
    clipPath: 'inset(50%)',
    height: 1,
    overflow: 'hidden',
    position: 'absolute',
    bottom: 0,
    left: 0,
    whiteSpace: 'nowrap',
    width: 1,
});

export function Task(properties: {
    task: TaskDTO,
    refetchDataCallback: () => void,
    dialogOptions: { title: string, editorFields: EditorField[] },
    sx?: SxProps<Theme>
}) {
    const {task, refetchDataCallback, dialogOptions, sx} = properties;
    const {domainPublicId} = useParams();
    const {user} = useCurrentUser();
    const [updateTaskMutation, updateTaskMutationResult] = useMutation<UpdateTaskMutation>(UpdateTask);
    const [deleteTaskMutation, deleteTaskMutationResult] = useMutation<DeleteTaskMutation>(DeleteTask);
    const [uploadTaskAttachmentMutation, uploadTaskAttachmentMutationResult] = useMutation<UploadTaskAttachmentMutation>(UploadTaskAttachment);
    const [deleteTaskAttachmentMutation, deleteTaskAttachmentMutationResult] = useMutation<DeleteTaskAttachmentMutation>(DeleteTaskAttachment);

    const onSubmitScriptMultipart = async (fileInput: any, taskId: number) => {
        await uploadTaskAttachmentMutation({
            variables: {file: fileInput[0], taskId: taskId},
        });
        return refetchDataCallback();
    };


    const downloadAttachment = (attachmentName: string) => {
        fetch(process.env.REACT_APP_BACKEND_URL + '/task/' + task.id + '/attachment/' + attachmentName + '?domainId=' + domainPublicId! + '&authorization=' + user!.jwtToken, {
            method: 'GET'
        })
            .then((response) => response.blob())
            .then((blob) => {
                const url = window.URL.createObjectURL(
                    new Blob([blob]),
                );
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute(
                    'download',
                    attachmentName,
                );
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            });
    }

    const deleteTaskAttachment = async (deleteTaskAttachmentData: { fileName: string, taskId: number }) => {
        await deleteTaskAttachmentMutation({
            variables: deleteTaskAttachmentData,
        });
        return refetchDataCallback();
    };


    const updateTask = async (taskDTO: TaskDTO): Promise<any> => {
        await updateTaskMutation({
            variables: {
                taskId: taskDTO.id,
                description: taskDTO.description,
                coAuthors: taskDTO.coAuthors,
            }
        });
        return refetchDataCallback();
    };

    const deleteTask = async (taskId: number) => {
        await deleteTaskMutation({variables: {taskId: taskId}});
        return refetchDataCallback();
    };

    updateTaskMutationResult.called && updateTaskMutationResult.reset();
    deleteTaskMutationResult.called && deleteTaskMutationResult.reset();
    uploadTaskAttachmentMutationResult.called && uploadTaskAttachmentMutationResult.reset();
    deleteTaskAttachmentMutationResult.called && deleteTaskAttachmentMutationResult.reset();

    const datesAsNumbers = task.timeRecords.map(timeRecord => timeRecord.date.getTime());
    const minDate = new Date(Math.min(...datesAsNumbers));
    const maxDate = new Date(Math.max(...datesAsNumbers));
    const hours = task.timeRecords.map(timeRecord => timeRecord.numberOfHours).reduce((hours1, hours2) => hours1 + hours2, 0);

    return (
        <Stack sx={sx || {}} direction="column">
            <Stack direction="row" justifyContent="space-between">
                <div>
                    {task.description}
                </div>
                <Stack direction="row">
                    <FormDialogButton
                        title={dialogOptions.title}
                        buttonContent={
                            <IconButton size={'small'}>
                                <Edit fontSize='inherit'/>
                            </IconButton>
                        }
                        onConfirm={(value) => updateTask(value)}
                        onCancel={() => {
                            return Promise.resolve();
                        }}
                        formProps={{
                            initialValues: task,
                            fields: dialogOptions.editorFields,
                            validationSchema: Yup.object({})
                        }}
                    />
                    {
                        (task.timeRecords || []).length === 0 && (
                            <DeleteButton
                                confirmationMessage={'Na pewno usunąć ' + task!.id + ' - ' + task!.description + '?'}
                                buttonContent={<IconButton size={'small'}><Delete fontSize='inherit'/></IconButton>}
                                object={task!.id}
                                onDelete={deleteTask}
                                onCancel={() => {
                                    return Promise.resolve();
                                }}/>
                        )
                    }
                </Stack>
            </Stack>
            <Stack direction="row" justifyContent="space-between">
                <Stack direction="column"
                       sx={{width: '50%', borderRight: '#8e8e8e dotted', ...sidePadding}}>
                    {
                        task.coAuthors && (
                            <div>
                                Współautorzy: {task.coAuthors}
                            </div>
                        )
                    }
                    {
                        (hours > 0) && (
                            <Stack direction="row" justifyContent="space-between">
                                <div>Zarejestrowany czas:</div>
                                <div>{dayjs(minDate).format("YYYY-MM-DD")} - {dayjs(maxDate).format("YYYY-MM-DD")} - {hours} godzin</div>
                                <ShowInformationButton title={'Szczegóły zadania'} onClose={() => Promise.resolve()}
                                                       buttonContent={<IconButton size={'small'}><Loupe fontSize='inherit'/></IconButton>}>
                                    <Stack direction="column">
                                        <b>{task.description}</b>
                                        {
                                            task.timeRecords.map(timeRecord => (
                                                <Box
                                                    key={timeRecord.id}>{dayjs(timeRecord.date).format("YYYY-MM-DD")}: {timeRecord.numberOfHours} godzin</Box>))
                                        }
                                    </Stack>
                                </ShowInformationButton>
                            </Stack>
                        )
                    }

                </Stack>
                <Stack direction="column" sx={{width: '50%', ...sidePadding}}>
                    <Stack direction="row" justifyContent="space-between">
                        <div>{task.attachments.length === 0 ? 'Brak załączników' : 'Załączniki:'}</div>
                        <IconButton
                            component="label"
                            size="small">
                            <Upload fontSize='inherit'/>
                            <VisuallyHiddenInput
                                type="file"
                                onChange={(event) => onSubmitScriptMultipart(event.target.files, task.id)}
                                multiple
                            />
                        </IconButton>
                    </Stack>
                    {
                        task.attachments.map(attachmentName => (
                            <Stack direction="row" key={attachmentName} justifyContent="space-between">
                                <div>{attachmentName}</div>
                                <Stack direction="row">
                                    <DeleteButton
                                        confirmationMessage={'Na pewno usunąć \'' + attachmentName + '\'?'}
                                        buttonContent={<IconButton size={'small'}><Delete
                                            fontSize='inherit'/></IconButton>}
                                        object={{fileName: attachmentName, taskId: task.id}}
                                        onDelete={deleteTaskAttachment}
                                        onCancel={() => {
                                            return Promise.resolve();
                                        }}/>
                                    <IconButton onClick={() => downloadAttachment(attachmentName)} size="small">
                                        <Download fontSize='inherit'/>
                                    </IconButton>
                                </Stack>
                            </Stack>))
                    }
                </Stack>
            </Stack>
        </Stack>
    );
}