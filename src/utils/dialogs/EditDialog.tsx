import {Button, Dialog, DialogContent, DialogTitle, Stack, TextField} from "@mui/material";
import * as React from "react";

export type EditorFieldType = 'TEXT' | 'TEXTAREA';

export type EditorField<T> = {
    setter: (object: T, value: any) => void;
    getter: (object: T) => any;
    label: string;
    type: EditorFieldType;
}

export interface EditDialogProps<T> {
    object: T;
    editorFields: EditorField<T>[];

    open: boolean;
    onClose: (value: T) => void;
    onCancel: (value: T) => void;
}

export default function EditDialog<T>(props: EditDialogProps<T>) {
    const {onClose, onCancel, open, object, editorFields} = props;
    const handleClose = (e: React.MouseEvent<HTMLElement>, r: string) => {
        e.stopPropagation();
        if (['backdropClick', 'escapeKeyDown', 'cancel'].includes(r)) {
            onCancel({...object});
        } else {
            onClose({...object});
        }
    };

    const handleClick = (e: React.MouseEvent<HTMLElement>) => {
       e.stopPropagation();
    };

    return (
        <Dialog onClose={handleClose} open={open}>
            <DialogTitle onClick={handleClick}>Dane własności intelektualnej</DialogTitle>
            <DialogContent onClick={handleClick}>
                {
                    editorFields.map(editorField => {
                        switch (editorField.type) {
                            case "TEXT":
                                return <TextField label={editorField.label}
                                                  variant="standard"
                                                  key={editorField.label}
                                                  onChange={event => editorField.setter(object, event.target.value)}
                                                  defaultValue={editorField.getter(object)}
                                                  sx={{width: '100%'}}
                                                  required/>;
                            case 'TEXTAREA':
                                return <TextField label={editorField.label}
                                                  variant="standard"
                                                  key={editorField.label}
                                                  onChange={event => editorField.setter(object, event.target.value)}
                                                  defaultValue={editorField.getter(object)}
                                                  sx={{width: '100%'}}
                                                  multiline
                                                  required/>;
                            default:
                                throw new Error('not known field type ' + editorField.type);
                        }
                    })
                }
                <Stack direction={"row"} spacing={4} alignItems={"center"}>
                    <Button variant="text" sx={{flexGrow: 1}}
                            onClick={(e) => handleClose(e, 'confirm')}>Potwierdź</Button>
                    <Button variant="text" sx={{flexGrow: 1}} onClick={(e) => handleClose(e, 'cancel')}>Anuluj</Button>
                </Stack>
            </DialogContent>
        </Dialog>
    );
}