import {useResetMutationResults} from '../utils/use-reset-mutation-results';
import {useMutation} from '@apollo/client/react';
import {
    DeleteTask,
    DeleteTaskAttachment,
    DeleteTaskAttachmentMutation,
    DeleteTaskMutation,
    Task,
    UpdateTask,
    UpdateTaskMutation,
    UploadTaskAttachment,
    UploadTaskAttachmentMutation,
} from '../types';
import {Chip, Divider, IconButton, Paper, Stack, Tooltip, Typography} from '@mui/material';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import UploadFileRoundedIcon from '@mui/icons-material/UploadFileRounded';
import * as React from 'react';
import {FormDialogButton} from '../utils/buttons/FormDialogButton';
import {DeleteButton} from '../utils/buttons/DeleteButton';
import * as Yup from 'yup';
import {EditorField} from '../utils/forms/Form';
import dayjs from 'dayjs';
import 'dayjs/locale/pl';
import {styled} from '@mui/system';
import {useCurrentUser} from '../utils/users/use-current-user';
import {ShowInformationButton} from '../utils/buttons/ShowInformationButton';
import {useParams} from 'react-router-dom';
import {getBackendUrl} from '../utils/backend-url';

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

export function TaskView(properties: {
    task: Task;
    refetchDataCallback: () => void;
    dialogOptions: {title: string; editorFields: EditorField[]};
}) {
    const {task, refetchDataCallback, dialogOptions} = properties;
    const {domainPublicId} = useParams();
    const {user} = useCurrentUser();
    const [updateTaskMutation, updateTaskMutationResult] = useMutation<UpdateTaskMutation>(UpdateTask);
    const [deleteTaskMutation, deleteTaskMutationResult] = useMutation<DeleteTaskMutation>(DeleteTask);
    const [uploadTaskAttachmentMutation, uploadTaskAttachmentMutationResult] =
        useMutation<UploadTaskAttachmentMutation>(UploadTaskAttachment);
    const [deleteTaskAttachmentMutation, deleteTaskAttachmentMutationResult] =
        useMutation<DeleteTaskAttachmentMutation>(DeleteTaskAttachment);

    const uploadAttachments = async (files: FileList | null, taskId: number) => {
        if (!files?.length) return;
        await uploadTaskAttachmentMutation({variables: {file: files[0], taskId}});
        return refetchDataCallback();
    };

    const downloadAttachment = (attachmentName: string) => {
        fetch(`${getBackendUrl()}/task/${task.id}/attachment/${attachmentName}?domainId=${domainPublicId!}`, {
            method: 'POST',
            headers: {Authorization: `Bearer ${user!.jwtToken}`},
        })
            .then(response => response.blob())
            .then(blob => {
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', attachmentName);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
            });
    };

    const deleteTaskAttachment = async (data: {fileName: string; taskId: number}) => {
        await deleteTaskAttachmentMutation({variables: data});
        return refetchDataCallback();
    };

    const updateTask = async (taskToUpdate: Task): Promise<any> => {
        await updateTaskMutation({
            variables: {
                taskId: taskToUpdate.id,
                description: taskToUpdate.description,
                coAuthors: taskToUpdate.coAuthors,
            },
        });
        return refetchDataCallback();
    };

    const deleteTask = async (taskId: number) => {
        await deleteTaskMutation({variables: {taskId}});
        return refetchDataCallback();
    };

    useResetMutationResults(
        updateTaskMutationResult,
        deleteTaskMutationResult,
        uploadTaskAttachmentMutationResult,
        deleteTaskAttachmentMutationResult
    );

    const datesAsNumbers = (task.timeRecords || []).map(timeRecord => dayjs(timeRecord.date).valueOf());
    const minDate = datesAsNumbers.length > 0 ? new Date(Math.min(...datesAsNumbers)) : null;
    const maxDate = datesAsNumbers.length > 0 ? new Date(Math.max(...datesAsNumbers)) : null;
    const hours = (task.timeRecords || []).reduce((sum, timeRecord) => sum + timeRecord.numberOfHours, 0);
    const attachments = task.attachments || [];

    return (
        <Paper component="article" variant="outlined" sx={{p: {xs: 1.25, sm: 1.5}}}>
            <Stack spacing={1.25}>
                <Stack direction="row" alignItems="flex-start" justifyContent="space-between" gap={1}>
                    <Typography fontWeight={700} sx={{minWidth: 0, overflowWrap: 'anywhere', pt: 0.5}}>
                        {task.description}
                    </Typography>
                    <Stack direction="row" flexShrink={0}>
                        <FormDialogButton
                            title={dialogOptions.title}
                            buttonContent={
                                <Tooltip title="Edytuj zadanie">
                                    <IconButton size="small" aria-label={`Edytuj zadanie ${task.description}`}>
                                        <EditRoundedIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                            }
                            onConfirm={value => updateTask(value)}
                            onCancel={() => Promise.resolve()}
                            formProps={{
                                presentation: 'dialog',
                                submitLabel: 'Zapisz zmiany',
                                submitColor: 'secondary',
                                initialValues: task,
                                fields: dialogOptions.editorFields,
                                validationSchema: Yup.object({
                                    description: Yup.string().trim().required('Wymagane'),
                                    coAuthors: Yup.string(),
                                }),
                            }}
                        />
                        {(task.timeRecords || []).length === 0 && (
                            <DeleteButton
                                title="Usunąć zadanie?"
                                confirmationMessage={<>Zadanie „{task.description}” zostanie trwale usunięte.</>}
                                buttonContent={
                                    <Tooltip title="Usuń zadanie">
                                        <IconButton
                                            size="small"
                                            color="error"
                                            aria-label={`Usuń zadanie ${task.description}`}
                                        >
                                            <DeleteOutlineRoundedIcon fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                }
                                object={task.id}
                                onDelete={deleteTask}
                                onCancel={() => Promise.resolve()}
                            />
                        )}
                    </Stack>
                </Stack>

                {task.coAuthors && (
                    <Typography variant="body2" color="text.secondary">
                        Współautorzy: {task.coAuthors}
                    </Typography>
                )}

                <Divider />

                <Stack direction={{xs: 'column', md: 'row'}} gap={2}>
                    <Stack spacing={0.75} sx={{flex: 1, minWidth: 0}}>
                        <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1}>
                            <Stack direction="row" alignItems="center" gap={0.75} flexWrap="wrap">
                                <Typography variant="body2" fontWeight={600}>
                                    Zarejestrowany czas
                                </Typography>
                                <Chip size="small" variant="outlined" label={`${hours} godz.`} />
                            </Stack>
                            {hours > 0 && (
                                <ShowInformationButton
                                    title="Szczegóły czasu zadania"
                                    onClose={() => Promise.resolve()}
                                    buttonContent={
                                        <Tooltip title="Pokaż szczegóły czasu">
                                            <IconButton
                                                size="small"
                                                aria-label={`Pokaż szczegóły czasu zadania ${task.description}`}
                                            >
                                                <SearchRoundedIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    }
                                >
                                    <Stack spacing={1}>
                                        <Typography fontWeight={700}>{task.description}</Typography>
                                        {(task.timeRecords || []).map(timeRecord => (
                                            <Stack
                                                key={timeRecord.id}
                                                direction="row"
                                                justifyContent="space-between"
                                                gap={2}
                                            >
                                                <Typography>
                                                    {dayjs(timeRecord.date).locale('pl').format('D MMM YYYY')}
                                                </Typography>
                                                <Typography sx={{fontVariantNumeric: 'tabular-nums'}}>
                                                    {timeRecord.numberOfHours} godz.
                                                </Typography>
                                            </Stack>
                                        ))}
                                    </Stack>
                                </ShowInformationButton>
                            )}
                        </Stack>
                        {minDate && maxDate ? (
                            <Typography variant="body2" color="text.secondary">
                                {dayjs(minDate).locale('pl').format('D MMM YYYY')} –{' '}
                                {dayjs(maxDate).locale('pl').format('D MMM YYYY')}
                            </Typography>
                        ) : (
                            <Typography variant="body2" color="text.secondary">
                                Brak zarejestrowanego czasu.
                            </Typography>
                        )}
                    </Stack>

                    <Stack spacing={0.75} sx={{flex: 1, minWidth: 0}}>
                        <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1}>
                            <Stack direction="row" alignItems="center" gap={0.75}>
                                <Typography variant="body2" fontWeight={600}>
                                    Załączniki
                                </Typography>
                                <Chip size="small" variant="outlined" label={attachments.length} />
                            </Stack>
                            <Tooltip title="Dodaj załącznik">
                                <IconButton
                                    component="label"
                                    size="small"
                                    color="secondary"
                                    aria-label={`Dodaj załącznik do zadania ${task.description}`}
                                >
                                    <UploadFileRoundedIcon fontSize="small" />
                                    <VisuallyHiddenInput
                                        type="file"
                                        onChange={event => void uploadAttachments(event.target.files, task.id)}
                                    />
                                </IconButton>
                            </Tooltip>
                        </Stack>
                        {attachments.length === 0 ? (
                            <Typography variant="body2" color="text.secondary">
                                Brak załączników.
                            </Typography>
                        ) : (
                            <Stack divider={<Divider flexItem />}>
                                {attachments.map(attachmentName => (
                                    <Stack
                                        key={attachmentName}
                                        direction="row"
                                        alignItems="center"
                                        justifyContent="space-between"
                                        gap={1}
                                        sx={{py: 0.5}}
                                    >
                                        <Typography variant="body2" sx={{minWidth: 0, overflowWrap: 'anywhere'}}>
                                            {attachmentName}
                                        </Typography>
                                        <Stack direction="row" flexShrink={0}>
                                            <Tooltip title="Pobierz załącznik">
                                                <IconButton
                                                    onClick={() => downloadAttachment(attachmentName)}
                                                    size="small"
                                                    aria-label={`Pobierz ${attachmentName}`}
                                                >
                                                    <DownloadRoundedIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                            <DeleteButton
                                                title="Usunąć załącznik?"
                                                confirmationMessage={
                                                    <>Załącznik „{attachmentName}” zostanie trwale usunięty.</>
                                                }
                                                buttonContent={
                                                    <Tooltip title="Usuń załącznik">
                                                        <IconButton
                                                            size="small"
                                                            color="error"
                                                            aria-label={`Usuń załącznik ${attachmentName}`}
                                                        >
                                                            <DeleteOutlineRoundedIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                }
                                                object={{fileName: attachmentName, taskId: task.id}}
                                                onDelete={deleteTaskAttachment}
                                                onCancel={() => Promise.resolve()}
                                            />
                                        </Stack>
                                    </Stack>
                                ))}
                            </Stack>
                        )}
                    </Stack>
                </Stack>
            </Stack>
        </Paper>
    );
}
