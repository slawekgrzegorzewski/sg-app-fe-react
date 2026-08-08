import {useResetMutationResults} from '../utils/use-reset-mutation-results';
import {useMutation} from '@apollo/client/react';
import {CreateTask, CreateTaskMutation, IntellectualProperty, Task} from '../types';
import {Button, Stack, useTheme} from '@mui/material';
import * as React from 'react';
import {FormDialogButton} from '../utils/buttons/FormDialogButton';
import * as Yup from 'yup';
import {EditorField} from '../utils/forms/Form';
import {TaskView} from './TaskView';

const taskEditorFields: EditorField[] = [
    {
        label: 'Opis',
        type: 'TEXTAREA',
        key: 'description',
        editable: true,
    },
    {
        label: 'Współautorzy',
        type: 'TEXTAREA',
        key: 'coAuthors',
        editable: true,
    },
];

const taskDialogTitle = 'Dane zadania';

export function TasksList(properties: {intellectualProperty: IntellectualProperty; refetchDataCallback: () => void}) {
    const {intellectualProperty, refetchDataCallback} = properties;
    const theme = useTheme();
    const oddStyle = {backgroundColor: theme.palette.action.hover};
    const [createTaskMutation, createTaskMutationResult] = useMutation<CreateTaskMutation>(CreateTask);

    const createTask = async (task: Task): Promise<any> => {
        await createTaskMutation({
            variables: {
                intellectualPropertyId: intellectualProperty.id,
                description: task.description,
                coAuthors: task.coAuthors,
            },
        });
        return refetchDataCallback();
    };

    useResetMutationResults(createTaskMutationResult);

    return (
        <Stack direction="column">
            <Stack direction="row" justifyContent="space-between">
                <div>
                    {(intellectualProperty.tasks || []).length === 0 ? 'Brak zadań w ramach IP' : 'Zadania w ramach IP'}
                </div>
                <FormDialogButton
                    title={taskDialogTitle}
                    buttonContent={
                        <Button variant={'text'} size={'small'} color="secondary">
                            stwórz zadanie
                        </Button>
                    }
                    onConfirm={value => createTask(value)}
                    onCancel={() => {
                        return Promise.resolve();
                    }}
                    formProps={{
                        initialValues: {
                            intellectualPropertyId: -1,
                            id: -1,
                            description: '',
                            coAuthors: '',
                            attachments: [],
                            timeRecords: [],
                        },
                        fields: taskEditorFields,
                        validationSchema: Yup.object({}),
                    }}
                />
            </Stack>
            <Stack direction="column">
                {(intellectualProperty.tasks || []).map((task, index) => (
                    <TaskView
                        key={task.id}
                        task={task}
                        sx={index % 2 === 0 ? oddStyle : {}}
                        dialogOptions={{
                            title: taskDialogTitle,
                            editorFields: taskEditorFields,
                        }}
                        refetchDataCallback={refetchDataCallback}
                    />
                ))}
            </Stack>
        </Stack>
    );
}
