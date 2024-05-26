import * as React from "react";
import {useContext, useState} from "react";
import {Button, Dialog, DialogContent, DialogTitle} from "@mui/material";
import {ShowBackdropContext} from "../DrawerAppBar";
import Form, {FormProps} from "../forms/Form";

export interface FormDialogButtonProps<T> {
    dialogTitle: string;
    onSave: ((object: T) => Promise<void>),
    onCancel: (() => Promise<void>),
    buttonContent?: React.ReactNode,
    formProps: Omit<FormProps<T>, "onSave" | "onCancel">;
}

export function FormDialogButton<T>(props: FormDialogButtonProps<T>) {
    let {
        dialogTitle,
        buttonContent,
        onSave,
        onCancel,
        formProps
    } = props;

    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const {setShowBackdrop} = useContext(ShowBackdropContext);

    const editClicked = (e: React.MouseEvent<HTMLElement>) => {
        setEditDialogOpen(true);
        e.stopPropagation();
    }

    function cancelEdit() {
        setEditDialogOpen(false);
        setShowBackdrop(true);
        onCancel().finally(() => setShowBackdrop(false));
    }

    function performEdit(object: T) {
        setEditDialogOpen(false);
        setShowBackdrop(true);
        onSave(object).finally(() => setShowBackdrop(false));

    }

    const handleClick = (e: React.MouseEvent<HTMLElement>) => {
        e.stopPropagation();
    };

    return <>
        <Button variant={"text"} onClick={(e) => editClicked(e)}>
            {buttonContent!}
        </Button>
        <Dialog open={editDialogOpen}>
            <DialogTitle onClick={handleClick}>{dialogTitle}</DialogTitle>
            <DialogContent onClick={handleClick}>
                <Form
                    onSave={performEdit}
                    onCancel={cancelEdit}
                    {...formProps}
                />
            </DialogContent>
        </Dialog>
    </>
}