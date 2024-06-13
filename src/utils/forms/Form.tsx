import {
    Autocomplete,
    Button,
    Checkbox,
    FormControl,
    FormControlLabel,
    FormHelperText,
    MenuItem,
    Stack,
    TextField
} from "@mui/material";
import * as React from "react";
import {Formik} from "../../application/components/Formik";
import {FormikHelpers} from "formik/dist/types";
import {FormikValues} from "formik";
import * as Yup from "yup";
import {Visibility, VisibilityOff} from "@mui/icons-material";

export type EditorFieldType =
    'NUMBER'
    | 'DATEPICKER'
    | 'TEXT'
    | 'TEXTAREA'
    | 'SELECT'
    | 'HIDDEN'
    | 'CHECKBOX'
    | 'AUTOCOMPLETE';

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
    editable: boolean
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
                    disabled: !editorField.editable,
                    type: "text"
                };
            case 'TEXTAREA':
                return {
                    disabled: !editorField.editable,
                    type: "text",
                    multiline: true
                };
            case 'DATEPICKER':
                return {
                    disabled: !editorField.editable,
                    type: "date"
                };
            case 'NUMBER':
                return {
                    disabled: !editorField.editable,
                    type: "number"
                };
            case 'SELECT':
                return {
                    disabled: !editorField.editable,
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

    function createAutocomplete(editorField: EditorField, formik: any) {
        return <Autocomplete
            fullWidth
            disabled={!editorField.editable}
            id={editorField.key}
            key={editorField.key}
            value={formik.values[editorField.key]}
            onBlur={formik.handleBlur}
            onChange={(e, newValue) => {
                formik.setFieldValue(editorField.key, newValue, true)
            }}
            options={[
                ...(editorField.selectOptions!.map(c => {
                    return c.key;
                }))
            ]}
            renderInput={(params) => <TextField
                {...params}
                variant="standard"
                label={editorField.label}
                error={formik.touched[editorField.key] && Boolean(formik.errors[editorField.key])}
                helperText={formik.touched[editorField.key] && formik.errors[editorField.key]}
            />}
        />
    }

    function createCheckbox(editorField: EditorField, formik: any) {
        return <FormControl key={editorField.key}>
            <FormHelperText
                error={formik.touched[editorField.key] && Boolean(formik.errors[editorField.key])}
            >
                {formik.touched[editorField.key] && formik.errors[editorField.key]}
            </FormHelperText>
            <FormControlLabel label={editorField.label}
                              id={editorField.key}
                              name={editorField.key}
                              key={editorField.key}
                              onChange={formik.handleChange}
                              onBlur={formik.handleBlur}
                              {...(editorField.additionalProps || {})}
                              control={<Checkbox
                                  disabled={!editorField.editable}
                                  checked={formik.values[editorField.key]}
                                  size={'small'}
                                  icon={<VisibilityOff/>}
                                  checkedIcon={<Visibility/>}
                              />}
            />
        </FormControl>;
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
                                if (editorField.type === "AUTOCOMPLETE")
                                    return createAutocomplete(editorField, formik);
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