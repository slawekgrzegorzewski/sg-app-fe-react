import {useMutation, useQuery} from "@apollo/client";
import {
    AllIpRs,
    AllIpRsQuery,
    CreateIntellectualPropertyReport as GraphqlCreateIPR,
    CreateIntellectualPropertyReportMutation,
    DeleteIntellectualPropertyReport as GraphqlDeleteIPR,
    DeleteIntellectualPropertyReportMutation,
    UpdateIntellectualPropertyReport as GraphqlUpdateIPR,
    UpdateIntellectualPropertyReportMutation
} from "../types";
import {Accordion, AccordionDetails, AccordionSummary, Box, Stack} from "@mui/material";
import {Delete, Edit, ExpandMore} from "@mui/icons-material";
import * as React from "react";
import {useState} from "react";
import {EditButton} from "../utils/buttons/EditButton";
import {EditorField} from "../utils/dialogs/EditDialog";
import {DeleteButton} from "../utils/buttons/DeleteButton";

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

const iprEditorFields: EditorField<IntellectualPropertyDTO>[] = [
    {
        setter: (object: IntellectualPropertyDTO, value: string) => object.description = value,
        getter: (object: IntellectualPropertyDTO) => object.description,
        label: 'Opis',
        type: 'TEXTAREA'
    }
];

export function IntellectualPropertyReports() {
    const {loading, error, data, refetch} = useQuery<AllIpRsQuery>(AllIpRs);
    const [expandedTabId, setExpandedTabId] = useState<number>(-1);

    const [createIntellectualPropertyReportMutation, createIntellectualPropertyReportMutationResult] = useMutation<CreateIntellectualPropertyReportMutation>(GraphqlCreateIPR);
    const [updateIntellectualPropertyReportMutation, updateIntellectualPropertyReportMutationResult] = useMutation<UpdateIntellectualPropertyReportMutation>(GraphqlUpdateIPR);
    const [deleteIntellectualPropertyReportMutation, deleteIntellectualPropertyReportMutationResult] = useMutation<DeleteIntellectualPropertyReportMutation>(GraphqlDeleteIPR);

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
                    <EditButton
                        object={emptyIPRProvider()}
                        emptyObjectProvider={emptyIPRProvider}
                        editorFields={iprEditorFields}
                        onEdit={performEdit}
                        buttonContent={<>stwórz własność intelektualną</>}
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
                                        <EditButton
                                            object={ipr}
                                            emptyObjectProvider={emptyIPRProvider}
                                            editorFields={iprEditorFields}
                                            onEdit={performEdit}
                                            buttonContent={<Edit/>}
                                        />
                                        {
                                            (ipr.tasks || []).length === 0 && (
                                                <DeleteButton
                                                    confirmationMessage={'Na pewno usunąć ' + ipr!.id + ' - ' + ipr!.description + '?'}
                                                    buttonContent={<Delete/>}
                                                    object={ipr!.id}
                                                    onDelete={performDelete}/>
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