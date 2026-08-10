import {useResetMutationResults} from '../utils/use-reset-mutation-results';
import {useMutation} from '@apollo/client/react';
import {
    DeleteIntellectualPropertyReport,
    DeleteIntellectualPropertyReportMutation,
    IntellectualProperty,
    UpdateIntellectualPropertyReport,
    UpdateIntellectualPropertyReportMutation,
} from '../types';
import {Accordion, AccordionDetails, AccordionSummary, Button, Chip, Stack, Typography} from '@mui/material';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import * as React from 'react';
import {FormDialogButton} from '../utils/buttons/FormDialogButton';
import {DeleteButton} from '../utils/buttons/DeleteButton';
import * as Yup from 'yup';
import {EditorField} from '../utils/forms/Form';
import {TasksList} from './TasksList';

export function IntellectualPropertyReport(properties: {
    ipr: IntellectualProperty;
    expanded: boolean;
    onExpandCallback: (intellectualPropertyId: number) => void;
    refetchDataCallback: () => void;
    editorFields: EditorField[];
}) {
    const {ipr, expanded, onExpandCallback, refetchDataCallback, editorFields} = properties;

    const [updateIntellectualPropertyReportMutation, updateIntellectualPropertyReportMutationResult] =
        useMutation<UpdateIntellectualPropertyReportMutation>(UpdateIntellectualPropertyReport);
    const [deleteIntellectualPropertyReportMutation, deleteIntellectualPropertyReportMutationResult] =
        useMutation<DeleteIntellectualPropertyReportMutation>(DeleteIntellectualPropertyReport);

    const performEdit = async (iprDTO: IntellectualProperty): Promise<any> => {
        await updateIntellectualPropertyReportMutation({
            variables: {
                intellectualPropertyId: iprDTO.id,
                description: iprDTO.description,
            },
        });
        return refetchDataCallback();
    };

    const performDelete = async (intellectualPropertyId: number) => {
        await deleteIntellectualPropertyReportMutation({variables: {intellectualPropertyId}});
        return refetchDataCallback();
    };

    useResetMutationResults(
        updateIntellectualPropertyReportMutationResult,
        deleteIntellectualPropertyReportMutationResult
    );

    const tasks = ipr.tasks || [];
    const attachmentsCount = tasks.reduce((sum, task) => sum + (task.attachments?.length || 0), 0);

    return (
        <Accordion
            expanded={expanded}
            onChange={() => onExpandCallback(ipr.id)}
            disableGutters
            elevation={0}
            sx={{
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: '8px !important',
                overflow: 'hidden',
                '&::before': {display: 'none'},
            }}
        >
            <AccordionSummary
                expandIcon={<ExpandMoreRoundedIcon />}
                aria-controls={`ipr-${ipr.id}-content`}
                id={`ipr-${ipr.id}-header`}
                sx={{px: {xs: 1.5, sm: 2}, py: 0.5}}
            >
                <Stack spacing={0.75} sx={{minWidth: 0, pr: 1}}>
                    <Typography fontWeight={700} sx={{overflowWrap: 'anywhere'}}>
                        {ipr.description}
                    </Typography>
                    <Stack direction="row" flexWrap="wrap" gap={0.75}>
                        <Chip size="small" variant="outlined" label={`Zadania: ${tasks.length}`} />
                        <Chip size="small" variant="outlined" label={`Załączniki: ${attachmentsCount}`} />
                    </Stack>
                </Stack>
            </AccordionSummary>
            <AccordionDetails
                id={`ipr-${ipr.id}-content`}
                sx={{p: {xs: 1.5, sm: 2}, borderTop: '1px solid', borderColor: 'divider'}}
            >
                <Stack spacing={2}>
                    <Stack direction={{xs: 'column', sm: 'row'}} justifyContent="flex-end" gap={1}>
                        <FormDialogButton
                            title="Edytuj raport IP"
                            buttonContent={
                                <Button variant="outlined" color="secondary" startIcon={<EditRoundedIcon />} fullWidth>
                                    Edytuj raport
                                </Button>
                            }
                            onConfirm={value => performEdit(value)}
                            onCancel={() => Promise.resolve()}
                            formProps={{
                                presentation: 'dialog',
                                submitLabel: 'Zapisz zmiany',
                                submitColor: 'secondary',
                                initialValues: ipr,
                                fields: editorFields,
                                validationSchema: Yup.object({
                                    description: Yup.string().trim().required('Wymagane'),
                                }),
                            }}
                        />
                        {tasks.length === 0 && (
                            <DeleteButton
                                title="Usunąć raport IP?"
                                confirmationMessage={<>Raport „{ipr.description}” zostanie trwale usunięty.</>}
                                buttonContent={
                                    <Button
                                        variant="outlined"
                                        color="error"
                                        startIcon={<DeleteOutlineRoundedIcon />}
                                        fullWidth
                                    >
                                        Usuń raport
                                    </Button>
                                }
                                object={ipr.id}
                                onDelete={performDelete}
                                onCancel={() => Promise.resolve()}
                            />
                        )}
                    </Stack>
                    <TasksList intellectualProperty={ipr} refetchDataCallback={refetchDataCallback} />
                </Stack>
            </AccordionDetails>
        </Accordion>
    );
}
