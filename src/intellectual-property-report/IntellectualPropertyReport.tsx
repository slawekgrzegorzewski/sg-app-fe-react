import {useMutation} from "@apollo/client";
import {
    DeleteIntellectualPropertyReport,
    DeleteIntellectualPropertyReportMutation,
    UpdateIntellectualPropertyReport,
    UpdateIntellectualPropertyReportMutation
} from "../types";
import {Accordion, AccordionDetails, AccordionSummary, Box, Stack} from "@mui/material";
import {Delete, Edit, ExpandMore} from "@mui/icons-material";
import * as React from "react";
import {FormDialogButton} from "../utils/buttons/FormDialogButton";
import {DeleteButton} from "../utils/buttons/DeleteButton";
import * as Yup from "yup";
import {EditorField} from "../utils/forms/Form";
import IconButton from "@mui/material/IconButton";
import {IntellectualPropertyDTO} from "./model/types";
import {TasksList} from "./TasksList";

export function IntellectualPropertyReport(properties: {
    ipr: IntellectualPropertyDTO,
    expanded: boolean,
    onExpandCallback: (intellectualPropertyId: number) => void,
    refetchDataCallback: () => void,
    dialogOptions: { title: string, editorFields: EditorField[] }
}) {

    const {ipr, expanded, onExpandCallback, refetchDataCallback, dialogOptions} = properties;

    const [updateIntellectualPropertyReportMutation, updateIntellectualPropertyReportMutationResult] = useMutation<UpdateIntellectualPropertyReportMutation>(UpdateIntellectualPropertyReport);
    const [deleteIntellectualPropertyReportMutation, deleteIntellectualPropertyReportMutationResult] = useMutation<DeleteIntellectualPropertyReportMutation>(DeleteIntellectualPropertyReport);

    const performEdit = async (iprDTO: IntellectualPropertyDTO): Promise<any> => {
        await updateIntellectualPropertyReportMutation({
            variables: {
                intellectualPropertyId: iprDTO.id,
                description: iprDTO.description
            }
        });
        return refetchDataCallback();
    };

    const performDelete = async (ipr: number) => {
        await deleteIntellectualPropertyReportMutation({variables: {intellectualPropertyId: ipr}});
        return refetchDataCallback();
    };

    updateIntellectualPropertyReportMutationResult.called && updateIntellectualPropertyReportMutationResult.reset();
    deleteIntellectualPropertyReportMutationResult.called && deleteIntellectualPropertyReportMutationResult.reset();

    return (
        <Accordion key={ipr.id} expanded={expanded}
                   onChange={() => onExpandCallback(ipr.id)}
                   disableGutters
        >
            <AccordionSummary expandIcon={<ExpandMore/>} sx={{fontWeight: 'bolder'}}>
                <Stack direction="row" sx={{width: '100%'}}>
                    {ipr.description}
                    <Box sx={{flexGrow: 1}}/>
                    <FormDialogButton
                        title={dialogOptions.title}
                        buttonContent={<IconButton size="small"><Edit/></IconButton>}
                        onSave={(value) => performEdit(value)}
                        onCancel={() => {
                            return Promise.resolve();
                        }}
                        formProps={{
                            initialValues: ipr,
                            fields: dialogOptions.editorFields,
                            validationSchema: Yup.object({})
                        }}
                    />
                    {
                        (ipr.tasks || []).length === 0 && (
                            <DeleteButton
                                confirmationMessage={'Na pewno usunąć ' + ipr!.id + ' - ' + ipr!.description + '?'}
                                buttonContent={<IconButton size="small"><Delete/></IconButton>}
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
                <TasksList intellectualProperty={ipr} refetchDataCallback={refetchDataCallback}/>
            </AccordionDetails>
        </Accordion>

    );
}