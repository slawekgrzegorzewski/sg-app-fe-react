import * as React from "react";
import {useContext} from "react";
import {Dialog, DialogContent, DialogTitle} from "@mui/material";
import {ShowBackdropContext} from "../DrawerAppBar";
import Form, {FormProps} from "../forms/Form";

export interface FormDialogProps<T> {
    dialogTitle: React.JSX.Element;
    open: boolean;
    onSave: ((object: T) => Promise<void>),
    onCancel: (() => Promise<void>),
    formProps: Omit<FormProps<T>, "onSave" | "onCancel">,
    children?: React.JSX.Element
}

export function FormDialog<T>(props: FormDialogProps<T>) {
    let {
        open,
        dialogTitle,
        onSave,
        onCancel,
        formProps,
        children
    } = props;

    const {setShowBackdrop} = useContext(ShowBackdropContext);


    function cancelEdit() {
        setShowBackdrop(true);
        onCancel().finally(() => setShowBackdrop(false));
    }

    function performEdit(object: T) {
        setShowBackdrop(true);
        onSave(object).finally(() => setShowBackdrop(false));

    }

    const handleClick = (e: React.MouseEvent<HTMLElement>) => {
        e.stopPropagation();
    };

    return <Dialog open={open}>
        <DialogTitle onClick={handleClick}>{dialogTitle}</DialogTitle>
        <DialogContent onClick={handleClick}>
            <>
                <Form
                    onSave={performEdit}
                    onCancel={cancelEdit}
                    {...formProps}
                />
                {children && children}
            </>
        </DialogContent>
    </Dialog>
}