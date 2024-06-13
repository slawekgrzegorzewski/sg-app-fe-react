import {useMutation, useQuery} from "@apollo/client";
import {
    AllIpRs,
    AllIpRsQuery,
    CreateIntellectualPropertyReport,
    CreateIntellectualPropertyReportMutation,
    DeleteIntellectualPropertyReport,
    DeleteIntellectualPropertyReportMutation,
    UpdateIntellectualPropertyReport,
    UpdateIntellectualPropertyReportMutation
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

export function IntellectualPropertyReports() {
    const {loading, error, data, refetch} = useQuery<AllIpRsQuery>(AllIpRs);
    const [expandedTabId, setExpandedTabId] = useState<number>(-1);

    const [createIntellectualPropertyReportMutation, createIntellectualPropertyReportMutationResult] = useMutation<CreateIntellectualPropertyReportMutation>(CreateIntellectualPropertyReport);
    const [updateIntellectualPropertyReportMutation, updateIntellectualPropertyReportMutationResult] = useMutation<UpdateIntellectualPropertyReportMutation>(UpdateIntellectualPropertyReport);
    const [deleteIntellectualPropertyReportMutation, deleteIntellectualPropertyReportMutationResult] = useMutation<DeleteIntellectualPropertyReportMutation>(DeleteIntellectualPropertyReport);

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

    const changeTab = (tabId: number) => {
        setExpandedTabId(tabId === expandedTabId ? notExistingIPR.id : tabId);
    };

    createIntellectualPropertyReportMutationResult.called && createIntellectualPropertyReportMutationResult.reset();
    updateIntellectualPropertyReportMutationResult.called && updateIntellectualPropertyReportMutationResult.reset();

    deleteIntellectualPropertyReportMutationResult.called && deleteIntellectualPropertyReportMutationResult.reset();

    if (loading) {
        return <>Loading...</>
    } else if (error) {
        return <>Error...</>
    } else if (data) {
        if (data.allIPRs.length === 0) {
            return <>No data</>
        }
        if (!expandedTabId) {
            setExpandedTabId(data.allIPRs.length === 0 ? notExistingIPR.id : data.allIPRs[0].id);
            return <></>
        }
        return (
            <Box component="section" sx={{width: 1000, m: 'auto'}}>
                <Stack direction="row">
                    <FormDialogButton
                        dialogTitle='Dane własności intelektualnej'
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
                                            dialogTitle='Dane własności intelektualnej'
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
                                        {(ipr.tasks || []).map(task => (
                                            <div key={task.id}>
                                                {task.description}
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