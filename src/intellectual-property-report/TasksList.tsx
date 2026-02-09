import {useMutation} from "@apollo/client/react";
import {CreateTask, CreateTaskMutation} from "../types";
import {Button, Stack, useTheme} from "@mui/material";
import * as React from "react";
import {FormDialogButton} from "../utils/buttons/FormDialogButton";
import * as Yup from "yup";
import {EditorField} from "../utils/forms/Form";
import {emptyTaskProvider, IntellectualPropertyDTO, TaskDTO} from "./model/types";
import {Task} from "./Task";

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

const taskDialogTitle = 'Dane zadania';

export function TasksList(properties: {
    intellectualProperty: IntellectualPropertyDTO,
    refetchDataCallback: () => void
}) {
    const {intellectualProperty, refetchDataCallback} = properties;
    const theme = useTheme();
    const oddStyle = {backgroundColor: theme.palette.grey["300"]};
    const [createTaskMutation, createTaskMutationResult] = useMutation<CreateTaskMutation>(CreateTask);

    const createTask = async (taskDTO: TaskDTO): Promise<any> => {
        await createTaskMutation({
            variables: {
                intellectualPropertyId: taskDTO.intellectualPropertyId,
                description: taskDTO.description,
                coAuthors: taskDTO.coAuthors,
            }
        });
        return refetchDataCallback();
    };

    createTaskMutationResult.called && createTaskMutationResult.reset();

    return (
        <Stack direction="column">
            <Stack direction="row" justifyContent="space-between">
                <div>{intellectualProperty.tasks.length === 0 ? 'Brak zadań w ramach IP' : 'Zadania w ramach IP'}</div>
                <FormDialogButton
                    title={taskDialogTitle}
                    buttonContent={
                        <Button variant={'text'} size={'small'}>
                            stwórz zadanie
                        </Button>
                    }
                    onSave={(value) => createTask(value)}
                    onCancel={() => {
                        return Promise.resolve();
                    }}
                    formProps={{
                        initialValues: emptyTaskProvider(intellectualProperty.id),
                        fields: taskEditorFields,
                        validationSchema: Yup.object({})
                    }}
                />
            </Stack>
            <Stack direction="column">
                {(intellectualProperty.tasks || [])
                    .map((task, index) => (
                        <Task key={task.id}
                              task={task}
                              sx={index % 2 === 0 ? oddStyle : {}}
                              dialogOptions={{
                                  title: taskDialogTitle,
                                  editorFields: taskEditorFields
                              }}
                              refetchDataCallback={refetchDataCallback}/>
                    ))}
            </Stack>
        </Stack>
    );
}