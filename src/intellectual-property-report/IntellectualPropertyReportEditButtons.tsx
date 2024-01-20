import EditDialog from "../utils/dialogs/EditDialog";
import ConfirmationDialog from "../utils/dialogs/ConfirmationDialog";
import * as React from "react";
import {useState} from "react";
import {IntellectualPropertyDTO} from "./IntellectualPropertyReports";
import {
    CreateIntellectualPropertyReport as GraphqlCreateIPR,
    CreateIntellectualPropertyReportMutation,
    UpdateIntellectualPropertyReport as GraphqlUpdateIPR,
    UpdateIntellectualPropertyReportMutation,
    DeleteIntellectualPropertyReport as GraphqlDeleteIPR,
    DeleteIntellectualPropertyReportMutation,
    IntellectualProperty
} from "../types";
import {useMutation} from "@apollo/client";
import {Backdrop, Button, CircularProgress} from "@mui/material";

const INTELLECTUAL_NOT_EXISTING_ID = -1;
const NOT_EXISTING_ID = -1;
const emptyIPRCreator: () => IntellectualPropertyDTO = () => ({
    id: INTELLECTUAL_NOT_EXISTING_ID,
    description: ''
})

export interface IntellectualPropertyReportEditButtonsProps {
    ipr?: IntellectualProperty,

    showDelete?: boolean,
    showEdit?: boolean,
    showCreate?: boolean,

    afterDelete?: (() => void),
    afterEdit?: (() => void),
    afterCreate?: (() => void),

    deleteButtonContent?: React.ReactNode;
    editButtonContent?: React.ReactNode;
    createButtonContent?: React.ReactNode;
}

export function IntellectualPropertyReportEditButtons(props: IntellectualPropertyReportEditButtonsProps) {
    const {
        ipr = null,
        afterCreate = null,
        afterDelete = null,
        afterEdit = null,
        createButtonContent,
        deleteButtonContent,
        editButtonContent,
        showCreate = false,
        showDelete = false,
        showEdit = false
    } = props;

    const [iprToEdit, setIprToEdit] = useState<IntellectualPropertyDTO>(emptyIPRCreator());
    const [createIntellectualPropertyReportMutation, createIntellectualPropertyReportMutationResult] = useMutation<CreateIntellectualPropertyReportMutation>(GraphqlCreateIPR);
    const [updateIntellectualPropertyReportMutation, updateIntellectualPropertyReportMutationResult] = useMutation<UpdateIntellectualPropertyReportMutation>(GraphqlUpdateIPR);

    const [iprIdToDelete, setIprIdToDelete] = useState(INTELLECTUAL_NOT_EXISTING_ID);
    const [deleteIntellectualPropertyReportMutation, deleteIntellectualPropertyReportMutationResult] = useMutation<DeleteIntellectualPropertyReportMutation>(GraphqlDeleteIPR);

    const [editIntellectualPropertyDialogOpen, setEditIntellectualPropertyDialogOpen] = useState(false);
    const [deleteIntellectualPropertyConfirmationOpen, setDeleteIntellectualPropertyConfirmationOpen] = useState(false);
    const [backDropOpen, setBackDropOpen] = useState(false);

    const editClicked = (e: React.MouseEvent<HTMLElement>, ipr: IntellectualProperty) => {
        openEditDialog({
            id: ipr.id,
            description: ipr.description
        });
        e.stopPropagation();
    };

    function cancelEdit() {
        closeEditDialog();
    }

    function performEdit(iprDTO: IntellectualPropertyDTO) {
        closeEditDialog();
        setBackDropOpen(true);
        if (iprDTO.id === NOT_EXISTING_ID) {
            createIntellectualPropertyReportMutation({variables: {description: iprDTO.description}})
                .then(result => afterCreate?.())
                .finally(() => setBackDropOpen(false));
        } else {
            updateIntellectualPropertyReportMutation({
                variables: {
                    intellectualPropertyId: iprDTO.id,
                    description: iprDTO.description
                }
            })
                .then(result => afterEdit?.())
                .finally(() => setBackDropOpen(false));
        }
    }

    const deleteClicked = (e: React.MouseEvent<HTMLElement>, ipr: IntellectualProperty) => {
        setIprIdToDelete(ipr.id);
        setDeleteIntellectualPropertyConfirmationOpen(true);
        e.stopPropagation();
    };

    const cancelDelete = () => {
        setDeleteIntellectualPropertyConfirmationOpen(false);
    };

    function performDelete(iprId: number) {
        setDeleteIntellectualPropertyConfirmationOpen(false);
        setBackDropOpen(true);
        deleteIntellectualPropertyReportMutation({variables: {intellectualPropertyId: iprId}})
            .then(result => afterDelete?.())
            .finally(() => setBackDropOpen(false));
    }

    function openEditDialog(iprDTO: IntellectualPropertyDTO | null = null) {
        setIprToEdit(iprDTO ? {...iprDTO} : emptyIPRCreator());
        setEditIntellectualPropertyDialogOpen(true);
    }

    function closeEditDialog() {
        setIprToEdit(emptyIPRCreator());
        setEditIntellectualPropertyDialogOpen(false);
    }

    if (createIntellectualPropertyReportMutationResult.called) {
        createIntellectualPropertyReportMutationResult.reset();
    }

    if (deleteIntellectualPropertyReportMutationResult.called) {
        deleteIntellectualPropertyReportMutationResult.reset();
    }

    if (deleteIntellectualPropertyReportMutationResult.called) {
        updateIntellectualPropertyReportMutationResult.reset();
    }

    return <>
        {
            showCreate && (
                <Button variant={"text"} onClick={() => openEditDialog()}>
                    {createButtonContent!}
                </Button>
            )
        }
        {
            showEdit && (
                <Button variant={"text"} onClick={(e) => editClicked(e, ipr!)}>
                    {editButtonContent!}
                </Button>
            )
        }
        {
            showDelete && (
                <Button variant={"text"} onClick={(e) => deleteClicked(e, ipr!)}>
                    {deleteButtonContent!}
                </Button>
            )
        }
        {
            (showEdit || showCreate) && (
                <EditDialog
                    open={editIntellectualPropertyDialogOpen}
                    onClose={performEdit}
                    onCancel={cancelEdit}
                    object={iprToEdit}
                    editorFields={[
                        {
                            setter: (object: IntellectualPropertyDTO, value: string) => object.description = value,
                            getter: (object: IntellectualPropertyDTO) => object.description,
                            label: 'Opis',
                            type: 'TEXTAREA'
                        }
                    ]}
                />
            )
        }
        {
            showDelete && (
                <ConfirmationDialog
                    title={'Na pewno usunąć IPR: ' + iprIdToDelete}
                    message={'Na pewno usunąć IPR: ' + iprIdToDelete}
                    open={deleteIntellectualPropertyConfirmationOpen}
                    onClose={performDelete}
                    onCancel={cancelDelete}
                    companionObject={iprIdToDelete}
                />
            )
        }
        {
            (showEdit || showCreate || showDelete) && (
                <Backdrop
                    sx={{color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1}}
                    open={backDropOpen}>
                    <CircularProgress color="inherit"/>
                </Backdrop>
            )
        }
    </>
}