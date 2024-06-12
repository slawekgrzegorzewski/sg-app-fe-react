import {Button, Checkbox, FormControlLabel, FormGroup, MenuItem, Stack, TextField} from "@mui/material";
import * as React from "react";
import {Formik} from "../../application/components/Formik";
import {FormikHelpers} from "formik/dist/types";
import {FormikValues} from "formik";
import * as Yup from "yup";
import {Visibility, VisibilityOff} from "@mui/icons-material";

export type EditorFieldType = 'NUMBER' | 'DATEPICKER' | 'TEXT' | 'TEXTAREA' | 'SELECT' | 'HIDDEN' | 'CHECKBOX';

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

    function createTextField(editorField: EditorField, formik: any) {
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
                    <MenuItem key={option.key}
                              value={option.key}>{option.displayElement}</MenuItem>
                ))
            }
        </TextField>
    }

    function createCheckbox(editorField: EditorField, formik: any) {
        return <FormGroup>
            <FormControlLabel label={editorField.label}
                              id={editorField.key}
                              name={editorField.key}
                              key={editorField.key}
                              control={
                                  <Checkbox
                                      {...(editorField.additionalProps || {})}
                                      checked={formik.values[editorField.key]}
                                      onChange={formik.handleChange}
                                      onBlur={formik.handleBlur}
                                      error={formik.touched[editorField.key] && Boolean(formik.errors[editorField.key])}
                                      helperText={formik.touched[editorField.key] && formik.errors[editorField.key]}
                                      size={'small'}
                                      icon={<VisibilityOff />}
                                      checkedIcon={<Visibility />}
                                  >
                                      {
                                          editorField.selectOptions?.map(option => (
                                              <MenuItem key={option.key}
                                                        value={option.key}>{option.displayElement}</MenuItem>
                                          ))
                                      }
                                  </Checkbox>}
            />
        </FormGroup>;
    }

// @ts-ignore
    const form = formik => (
        <form onSubmit={formik.handleSubmit}>
            <Stack direction={"column"} spacing={4} alignItems={"center"}>
                <Stack direction={"column"} spacing={4} alignItems={"center"}>
                    {
                        fields
                            .filter(field => field.type !== 'HIDDEN')
                            .map(editorField => {
                                if (editorField.type === "CHECKBOX")
                                    return createCheckbox(editorField, formik);
                                return createTextField(editorField, formik);
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