import * as React from "react";
import {useContext, useState} from "react";
import {Box} from "@mui/material";
import {ShowBackdropContext} from "../DrawerAppBar";
import {FormProps} from "../forms/Form";
import {FormDialog} from "../dialogs/FormDialog";

export interface FormDialogButtonProps<T> {
    title: string;
    onConfirm: ((object: T) => Promise<void>),
    onCancel: (() => Promise<void>),
    buttonContent?: React.ReactNode,
    formProps: Omit<FormProps<T>, "onSave" | "onCancel">;
    dialogOptions?: any;
    clickTrigger?: React.MutableRefObject<() => void>
}

export function FormDialogButton<T>(props: FormDialogButtonProps<T>) {
    let {
        title,
        buttonContent,
        onConfirm,
        onCancel,
        formProps,
        dialogOptions
    } = props;

    const [formDialogOpen, setFormDialogOpen] = useState(false);
    const {setShowBackdrop} = useContext(ShowBackdropContext);

    const openFormClicked = (e?: React.MouseEvent<HTMLElement>) => {
        setFormDialogOpen(true);
        e?.stopPropagation();
    }

    if(props.clickTrigger) {
        props.clickTrigger.current = openFormClicked;
    }

    function confirm(object: T) {
        setFormDialogOpen(false);
        setShowBackdrop(true);
        return onConfirm(object).finally(() => setShowBackdrop(false));
    }

    function cancel() {
        setFormDialogOpen(false);
        setShowBackdrop(true);
        return onCancel().finally(() => setShowBackdrop(false));
    }

    return <>
        <Box onClick={(e) => openFormClicked(e)}>
            {buttonContent!}
        </Box>
        <FormDialog dialogTitle={<>{title}</>}
                    formProps={formProps}
                    onConfirm={confirm}
                    onCancel={cancel}
                    open={formDialogOpen}
                    dialogOptions={dialogOptions}/>
    </>
}