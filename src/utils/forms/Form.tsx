import {Button, MenuItem, Stack, TextField} from "@mui/material";
import * as React from "react";
import {Formik} from "../../application/components/Formik";
import {FormikHelpers} from "formik/dist/types";
import {FormikValues} from "formik";
import * as Yup from "yup";

export type EditorFieldType = 'NUMBER' | 'DATEPICKER' | 'TEXT' | 'TEXTAREA' | 'SELECT';

export type SelectOption = {
    key: string;
    displayElement: React.JSX.Element;
}

export type EditorField = {
    key: string;
    label: string;
    type: EditorFieldType;
    additionalProps?: any;
    selectOptions?: SelectOption[];
}

export type FormProps<T> = {
    fields: EditorField[];
    initialValues: T;
    validationSchema: Yup.ObjectSchema<any>;
    onSave: (value: T) => void;
    onCancel: () => void
}

export default function Form<T>({fields, initialValues, validationSchema, onSave, onCancel}: FormProps<T>) {

    function getFieldUniqueProps(editorField: EditorField) {
        switch (editorField.type) {
            case "TEXT":
                return {
                    type: "text"
                };
            case 'TEXTAREA':
                return {
                    type: "text",
                    multiline: true
                };
            case 'DATEPICKER':
                return {
                    type: "date"
                };
            case 'NUMBER':
                return {
                    type: "number"
                };
            case 'SELECT':
                return {
                    select: true
                };
            default:
                throw new Error('not known field type ' + editorField.type);
        }
    }

    // @ts-ignore
    const form = formik => (
        <form onSubmit={formik.handleSubmit}>
            <Stack direction={"column"} spacing={4} alignItems={"center"}>
                <Stack direction={"column"} spacing={4} alignItems={"center"}>
                    {
                        fields.map(editorField => {
                            return <TextField
                                {...getFieldUniqueProps(editorField)}
                                {...(editorField.additionalProps || {})}
                                fullWidth
                                variant="standard"
                                id={editorField.key}
                                name={editorField.key}
                                key={editorField.key}
                                label={editorField.label}
                                value={formik.values[editorField.key]}
                                onChange={formik.handleChange}
                                onBlur={formik.handleBlur}
                                error={formik.touched[editorField.key] && Boolean(formik.errors[editorField.key])}
                                helperText={formik.touched[editorField.key] && formik.errors[editorField.key]}
                            >
                                {
                                    editorField.selectOptions?.map(option => (
                                        <MenuItem key={option.key} value={option.key}>{option.displayElement}</MenuItem>
                                    ))
                                }
                            </TextField>
                        })}
                </Stack>
                <Stack direction={"row"} spacing={4} alignItems={"center"}>
                    <Button variant="text"
                            type="submit"
                            sx={{flexGrow: 1}}
                            onClick={e => e.stopPropagation()}
                    >Potwierdź</Button>
                    <Button
                        variant="text" sx={{flexGrow: 1}}
                        onClick={(e) => {
                            e.stopPropagation();
                            onCancel();
                        }}>Anuluj</Button>
                </Stack>
            </Stack>
        </form>
    );

    return <Formik
        initialValues={initialValues}
        validationSchema={validationSchema}
        onSubmit={(values: T, {setSubmitting}: FormikHelpers<FormikValues>) => {
            setTimeout(() => {
                setSubmitting(false);
                onSave(values)
            }, 400);
        }}
    >
        {form}
    </Formik>
}