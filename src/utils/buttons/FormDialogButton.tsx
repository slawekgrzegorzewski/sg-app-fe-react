import * as React from 'react';
import {useState} from 'react';
import {Box} from '@mui/material';
import {FormProps} from '../forms/Form';
import {FormDialog} from '../dialogs/FormDialog';
import {activateOnEnterOrSpace} from '../../application/components/clickable';

export interface FormDialogButtonProps<T> {
    title: string;
    onConfirm: (object: T) => Promise<void>;
    onCancel: () => Promise<void>;
    buttonContent?: React.ReactNode;
    formProps: Omit<FormProps<T>, 'onSave' | 'onCancel'>;
    dialogOptions?: any;
    clickTrigger?: React.MutableRefObject<() => void>;
}

export function FormDialogButton<T>(props: FormDialogButtonProps<T>) {
    let {title, buttonContent, onConfirm, onCancel, formProps, dialogOptions} = props;

    const [formDialogOpen, setFormDialogOpen] = useState(false);

    const openFormClicked = (e?: React.SyntheticEvent) => {
        setFormDialogOpen(true);
        e?.stopPropagation();
    };

    if (props.clickTrigger) {
        props.clickTrigger.current = openFormClicked;
    }

    function confirm(object: T) {
        setFormDialogOpen(false);
        return onConfirm(object);
    }

    function cancel() {
        setFormDialogOpen(false);
        return onCancel();
    }

    return (
        <>
            <Box onClick={e => openFormClicked(e)} onKeyDown={activateOnEnterOrSpace(openFormClicked)}>
                {buttonContent!}
            </Box>
            <FormDialog
                dialogTitle={<>{title}</>}
                formProps={formProps}
                onConfirm={confirm}
                onCancel={cancel}
                open={formDialogOpen}
                dialogOptions={dialogOptions}
            />
        </>
    );
}
