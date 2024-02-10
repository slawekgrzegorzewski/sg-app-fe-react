import * as React from "react";
import {useContext, useState} from "react";
import {Button} from "@mui/material";
import EditDialog, {EditorField} from "../dialogs/EditDialog";
import {ShowBackdropContext} from "../DrawerAppBar";

export interface EditButtonProps<T> {
    object?: T,
    emptyObjectProvider: () => T,
    onEdit?: ((object: T) => Promise<void>),
    onCancel?: (() => Promise<void>),
    buttonContent?: React.ReactNode,
    editorFields: EditorField<T>[]
}

export function EditButton<T>(props: EditButtonProps<T>) {
    let {buttonContent, onEdit, emptyObjectProvider, editorFields, onCancel, object} = props;

    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const {setShowBackdrop} = useContext(ShowBackdropContext);

    const editClicked = (e: React.MouseEvent<HTMLElement>) => {
        setEditDialogOpen(true);
        e.stopPropagation();
    }

    function cancelEdit() {
        setEditDialogOpen(false);
        if (onCancel) {
            setShowBackdrop(true);
            onCancel().finally(() => setShowBackdrop(false));
        }
    }

    function performEdit(object: T) {
        setEditDialogOpen(false);
        if (onEdit) {
            setShowBackdrop(true);
            onEdit(object).finally(() => setShowBackdrop(false));
        }

    }

    return <>
        <Button variant={"text"} onClick={(e) => editClicked(e)}>
            {buttonContent!}
        </Button>
        <EditDialog
            open={editDialogOpen}
            onClose={performEdit}
            onCancel={cancelEdit}
            object={object ? {...object} : emptyObjectProvider()}
            editorFields={editorFields}
        />
    </>
}