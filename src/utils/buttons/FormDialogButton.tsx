import * as React from "react";
import {useContext, useState} from "react";
import {Box} from "@mui/material";
import {ShowBackdropContext} from "../DrawerAppBar";
import {FormProps} from "../forms/Form";
import {FormDialog} from "../dialogs/FormDialog";

export interface FormDialogButtonProps<T> {
    title: string;
    onSave: ((object: T) => Promise<void>),
    onCancel: (() => Promise<void>),
    buttonContent?: React.ReactNode,
    formProps: Omit<FormProps<T>, "onSave" | "onCancel">;
    dialogOptions?: any;
}

export function FormDialogButton<T>(props: FormDialogButtonProps<T>) {
    let {
        title,
        buttonContent,
        onSave,
        onCancel,
        formProps,
        dialogOptions
    } = props;

    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const {setShowBackdrop} = useContext(ShowBackdropContext);

    const editClicked = (e: React.MouseEvent<HTMLElement>) => {
        setEditDialogOpen(true);
        e.stopPropagation();
    }

    function performEdit(object: T) {
        setEditDialogOpen(false);
        setShowBackdrop(true);
        return onSave(object).finally(() => setShowBackdrop(false));
    }

    function cancelEdit() {
        setEditDialogOpen(false);
        setShowBackdrop(true);
        return onCancel().finally(() => setShowBackdrop(false));
    }


    return <>
        <Box onClick={(e) => editClicked(e)}>
            {buttonContent!}
        </Box>
        <FormDialog dialogTitle={<>{title}</>}
                    formProps={formProps}
                    onSave={performEdit}
                    onCancel={cancelEdit}
                    open={editDialogOpen}
                    dialogOptions={dialogOptions}/>
    </>
}