import {useMutation, useQuery} from "@apollo/client";
import {
    AllIpRs,
    AllIpRsQuery,
    CreateIntellectualPropertyReport,
    CreateIntellectualPropertyReportMutation,
    CreateTask,
    CreateTaskMutation,
    DeleteIntellectualPropertyReport,
    DeleteIntellectualPropertyReportMutation,
    DeleteTask,
    DeleteTaskMutation,
    UpdateIntellectualPropertyReport,
    UpdateIntellectualPropertyReportMutation,
    UpdateTask,
    UpdateTaskMutation
} from "../types";
import {Accordion, AccordionDetails, AccordionSummary, Box, Button, Stack} from "@mui/material";
import {Delete, Edit, ExpandMore} from "@mui/icons-material";
import * as React from "react";
import {useState} from "react";
import {FormDialogButton} from "../utils/buttons/FormDialogButton";
import {DeleteButton} from "../utils/buttons/DeleteButton";
import * as Yup from "yup";
import {EditorField} from "../utils/forms/Form";
import IconButton from "@mui/material/IconButton";

export type IntellectualPropertyDTO = {
    id: number;
    description: string
}

export type TaskDTO = {
    intellectualPropertyId: number;
    id: number;
    description: string;
    coAuthors: string;
    timeRecords: TimeRecordDTO[];
}

export type TimeRecordDTO = {
    date: Date;
    description: string;
    id: number;
    numberOfHours: number;
    timeRecordCategory: TimeRecordCategoryDTO
}

export type TimeRecordCategoryDTO = {
    id: number;
    name: string;
}


const notExistingIPR: IntellectualPropertyDTO = {
    id: -1,
    description: ''
};
const emptyIPRProvider: () => IntellectualPropertyDTO = () => {
    return {...notExistingIPR};
}

const iprEditorFields: EditorField[] = [
    {
        label: 'Opis',
        type: 'TEXTAREA',
        key: 'description',
        editable: true
    }
];

const taskEditorFields: EditorField[] = [
    {
        label: 'Opis',
        type: 'TEXTAREA',
        key: 'description',
        editable: true
    },
    {
        label: 'Współautorzy',
        type: 'TEXTAREA',
        key: 'coAuthors',
        editable: true
    }
];

const iprDialogTitle = 'Dane własności intelektualnej';
const taskDialogTitle = 'Dane zadania';
const EXPANDED_TAB_ID_LOCAL_STORAGE_KEY = "IPR_accordion_expandedTabId";

export function IntellectualPropertyReports() {
    const {loading, error, data, refetch} = useQuery<AllIpRsQuery>(AllIpRs);
    const [expandedTabId, _setExpandedTabId] = useState<number>(Number.parseInt(localStorage.getItem(EXPANDED_TAB_ID_LOCAL_STORAGE_KEY) || "-1"));
    const setExpandedTabId = (expandedTabId: number) => {
        _setExpandedTabId(expandedTabId);
        localStorage.setItem(EXPANDED_TAB_ID_LOCAL_STORAGE_KEY, JSON.stringify(expandedTabId));
    }

    const [createIntellectualPropertyReportMutation, createIntellectualPropertyReportMutationResult] = useMutation<CreateIntellectualPropertyReportMutation>(CreateIntellectualPropertyReport);
    const [updateIntellectualPropertyReportMutation, updateIntellectualPropertyReportMutationResult] = useMutation<UpdateIntellectualPropertyReportMutation>(UpdateIntellectualPropertyReport);
    const [deleteIntellectualPropertyReportMutation, deleteIntellectualPropertyReportMutationResult] = useMutation<DeleteIntellectualPropertyReportMutation>(DeleteIntellectualPropertyReport);

    const [createTaskMutation, createTaskMutationResult] = useMutation<CreateTaskMutation>(CreateTask);
    const [updateTaskMutation, updateTaskMutationResult] = useMutation<UpdateTaskMutation>(UpdateTask);
    const [deleteTaskMutation, deleteTaskMutationResult] = useMutation<DeleteTaskMutation>(DeleteTask);

    const performEdit = async (iprDTO: IntellectualPropertyDTO): Promise<any> => {
        const createVariables = {variables: {description: iprDTO.description}};
        const updateVariables = {
            variables: {
                intellectualPropertyId: iprDTO.id,
                description: iprDTO.description
            }
        };
        await (iprDTO.id === notExistingIPR.id
            ? createIntellectualPropertyReportMutation(createVariables)
            : updateIntellectualPropertyReportMutation(updateVariables));
        return refetch();
    };

    const performDelete = async (ipr: number) => {
        await deleteIntellectualPropertyReportMutation({variables: {intellectualPropertyId: ipr}});
        return refetch();
    };


    const performEditTask = async (taskDTO: TaskDTO): Promise<any> => {
        const createVariables = {variables: {intellectualPropertyId: taskDTO.intellectualPropertyId}};
        const updateVariables = {
            variables: {
                taskId: taskDTO.id,
                description: taskDTO.description,
                coAuthors: taskDTO.coAuthors,
            }
        };
        await (taskDTO.id === notExistingIPR.id
            ? createTaskMutation(createVariables)
            : updateTaskMutation(updateVariables));
        return refetch();
    };

    const performTaskDelete = async (taskId: number) => {
        await deleteTaskMutation({variables: {taskId: taskId}});
        return refetch();
    };

    const changeTab = (tabId: number) => {
        setExpandedTabId(tabId === expandedTabId ? notExistingIPR.id : tabId);
    };

    createIntellectualPropertyReportMutationResult.called && createIntellectualPropertyReportMutationResult.reset();
    updateIntellectualPropertyReportMutationResult.called && updateIntellectualPropertyReportMutationResult.reset();
    deleteIntellectualPropertyReportMutationResult.called && deleteIntellectualPropertyReportMutationResult.reset();

    createTaskMutationResult.called && createTaskMutationResult.reset();
    updateTaskMutationResult.called && updateTaskMutationResult.reset();
    deleteTaskMutationResult.called && deleteTaskMutationResult.reset();

    if (loading) {
        return <>Loading...</>
    } else if (error) {
        return <>Error...</>
    } else if (data) {
        if (data.allIPRs.length === 0) {
            return <>No data</>
        }
        if (!data.allIPRs.map(ipr => ipr.id).find(id => id === expandedTabId)) {
            setExpandedTabId(-1);
        }
        if (expandedTabId === -1) {
            setExpandedTabId(data.allIPRs.length === 0 ? notExistingIPR.id : data.allIPRs[0].id);
            return <></>
        }
        return (
            <Box component="section" sx={{width: 1000, m: 'auto'}}>
                <Stack direction="row">
                    <FormDialogButton
                        title={iprDialogTitle}
                        buttonContent={
                            <Button variant={'text'} size={'small'}>
                                stwórz własność intelektualną
                            </Button>
                        }
                        onSave={(value) => performEdit(value)}
                        onCancel={() => {
                            return Promise.resolve();
                        }}
                        formProps={{
                            initialValues: emptyIPRProvider(),
                            fields: iprEditorFields,
                            validationSchema: Yup.object({})
                        }}
                    />
                </Stack>

                {
                    [...data.allIPRs].sort((ipr1, ipr2) => ipr2.id - ipr1.id)
                        .map(ipr => {
                            return {...ipr};
                        })
                        .map(ipr => (
                            <Accordion key={ipr.id} expanded={expandedTabId === ipr.id}
                                       onChange={() => changeTab(ipr.id)}
                                       disableGutters
                            >
                                <AccordionSummary expandIcon={<ExpandMore/>} sx={{fontWeight: 'bolder'}}>
                                    <Stack direction="row" sx={{width: '100%'}}>
                                        {ipr.description}
                                        <Box sx={{flexGrow: 1}}/>
                                        <FormDialogButton
                                            title={iprDialogTitle}
                                            buttonContent={
                                                <IconButton size={'small'}>
                                                    <Edit/>
                                                </IconButton>
                                            }
                                            onSave={(value) => performEdit(value)}
                                            onCancel={() => {
                                                return Promise.resolve();
                                            }}
                                            formProps={{
                                                initialValues: ipr,
                                                fields: iprEditorFields,
                                                validationSchema: Yup.object({})
                                            }}
                                        />
                                        {
                                            (ipr.tasks || []).length === 0 && (
                                                <DeleteButton
                                                    confirmationMessage={'Na pewno usunąć ' + ipr!.id + ' - ' + ipr!.description + '?'}
                                                    buttonContent={<Delete/>}
                                                    object={ipr!.id}
                                                    onDelete={performDelete}
                                                    onCancel={() => {
                                                        return Promise.resolve();
                                                    }}/>
                                            )
                                        }
                                    </Stack>
                                </AccordionSummary>
                                <AccordionDetails>
                                    <Stack direction="column">
                                        {(ipr.tasks || [])
                                            .map(task => {
                                                return {
                                                    intellectualPropertyId: ipr.id,
                                                    id: task.id,
                                                    description: task.description,
                                                    coAuthors: task.coAuthors,
                                                    timeRecords: (task.timeRecords || []).map(timeRecord => {
                                                        return {
                                                            id: timeRecord.id,
                                                            date: timeRecord.date,
                                                            description: timeRecord.description,
                                                            numberOfHours: timeRecord.numberOfHours,
                                                            timeRecordCategory: timeRecord.timeRecordCategory
                                                                ? {
                                                                    id: timeRecord.timeRecordCategory.id,
                                                                    name: timeRecord.timeRecordCategory.name
                                                                }
                                                                : {}
                                                        };
                                                    })
                                                }
                                            })
                                            .map(task => (
                                                <div key={task.id}>
                                                    <div>
                                                        {task.description}
                                                    </div>
                                                    <div>
                                                        {task.coAuthors}
                                                    </div>
                                                    <FormDialogButton
                                                        title={taskDialogTitle}
                                                        buttonContent={
                                                            <IconButton size={'small'}>
                                                                <Edit/>
                                                            </IconButton>
                                                        }
                                                        onSave={(value) => performEditTask(value)}
                                                        onCancel={() => {
                                                            return Promise.resolve();
                                                        }}
                                                        formProps={{
                                                            initialValues: task,
                                                            fields: taskEditorFields,
                                                            validationSchema: Yup.object({})
                                                        }}
                                                    />
                                                    {
                                                        (task.timeRecords || []).length === 0 && (
                                                            <DeleteButton
                                                                confirmationMessage={'Na pewno usunąć ' + task!.id + ' - ' + task!.description + '?'}
                                                                buttonContent={<Delete/>}
                                                                object={task!.id}
                                                                onDelete={performTaskDelete}
                                                                onCancel={() => {
                                                                    return Promise.resolve();
                                                                }}/>
                                                        )}
                                                </div>
                                            ))}
                                    </Stack>
                                </AccordionDetails>
                            </Accordion>
                        ))
                }</Box>);
    } else {
        return <></>;
    }
}