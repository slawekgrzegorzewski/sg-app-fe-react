import {useResetMutationResults} from '../utils/use-reset-mutation-results';
import {useMutation} from '@apollo/client/react';
import {CreateTask, CreateTaskMutation, IntellectualProperty, Task} from '../types';
import {Button, Chip, Stack, Typography} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
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

export function TasksList(properties: {intellectualProperty: IntellectualProperty; refetchDataCallback: () => void}) {
    const {intellectualProperty, refetchDataCallback} = properties;
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

    const tasks = intellectualProperty.tasks || [];

    return (
        <Stack spacing={1.5}>
            <Stack
                direction={{xs: 'column', sm: 'row'}}
                alignItems={{xs: 'stretch', sm: 'center'}}
                justifyContent="space-between"
                gap={1}
            >
                <Stack direction="row" alignItems="center" spacing={1}>
                    <Typography variant="h4">Zadania</Typography>
                    <Chip size="small" variant="outlined" label={`Liczba: ${tasks.length}`} />
                </Stack>
                <FormDialogButton
                    title="Dodaj zadanie"
                    buttonContent={
                        <Button variant="outlined" color="secondary" startIcon={<AddRoundedIcon />} fullWidth>
                            Dodaj zadanie
                        </Button>
                    }
                    onConfirm={value => createTask(value)}
                    onCancel={() => Promise.resolve()}
                    formProps={{
                        presentation: 'dialog',
                        submitLabel: 'Dodaj zadanie',
                        submitColor: 'secondary',
                        initialValues: {
                            intellectualPropertyId: intellectualProperty.id,
                            id: -1,
                            description: '',
                            coAuthors: '',
                            attachments: [],
                            timeRecords: [],
                        },
                        fields: taskEditorFields,
                        validationSchema: Yup.object({
                            description: Yup.string().trim().required('Wymagane'),
                            coAuthors: Yup.string(),
                        }),
                    }}
                />
            </Stack>
            {tasks.length === 0 ? (
                <Typography color="text.secondary" textAlign="center" sx={{py: 2}}>
                    Ten raport nie zawiera jeszcze żadnych zadań.
                </Typography>
            ) : (
                <Stack spacing={1}>
                    {tasks.map(task => (
                        <TaskView
                            key={task.id}
                            task={task}
                            dialogOptions={{
                                title: 'Edytuj zadanie',
                                editorFields: taskEditorFields,
                            }}
                            refetchDataCallback={refetchDataCallback}
                        />
                    ))}
                </Stack>
            )}
        </Stack>
    );
}
