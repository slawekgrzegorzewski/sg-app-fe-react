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
import AutocompleteAsync from "./AutocompleteAsync";
import {DocumentNode} from "graphql/language";
import {AdapterDayjs} from '@mui/x-date-pickers/AdapterDayjs';
import {DatePicker, LocalizationProvider} from "@mui/x-date-pickers";
import {Dayjs} from "dayjs";

export type EditorFieldType =
    'NUMBER'
    | 'DATEPICKER'
    | 'TEXT'
    | 'TEXTAREA'
    | 'SELECT'
    | 'HIDDEN'
    | 'CHECKBOX'
    | 'AUTOCOMPLETE'
    | 'AUTOCOMPLETE_ASYNC';

export type SelectOption = {
    key: string;
    displayElement: React.JSX.Element;
}

function isEditorFieldKind(object: object, type: string) {
    return !!object && 'type' in object && typeof object.type === 'string' && object.type === type;
}

function isDatepickerEditorField(object: object): object is BooleanEditorField {
    return isEditorFieldKind(object, 'DATEPICKER');
}

function isCheckboxEditorField(object: object): object is BooleanEditorField {
    return isEditorFieldKind(object, 'CHECKBOX');
}

function isSelectEditorField(object: object): object is SelectEditorField {
    return isEditorFieldKind(object, 'SELECT');
}

function isAutocompleteEditorField(object: object): object is AutocompleteEditorField {
    return isEditorFieldKind(object, 'AUTOCOMPLETE');
}

function isAutocompleteAsyncEditorField(object: object): object is AutocompleteAsyncEditorField {
    return isEditorFieldKind(object, 'AUTOCOMPLETE_ASYNC');
}

export type RegularEditorField = {
    key: string;
    label: string;
    type: Omit<EditorFieldType, 'SELECT | AUTOCOMPLETE' | 'AUTOCOMPLETE_ASYNC'>;
    additionalProps?: any;
    editable: boolean | ((object: any) => boolean);
};

export type BooleanEditorField = Omit<RegularEditorField, 'type'> & {
    type: 'CHECKBOX';
    icon?: React.ReactNode;
    checkedIcon?: React.ReactNode;
};

export type SelectEditorField = Omit<RegularEditorField, 'type'> & {
    type: 'SELECT';
    selectOptions: SelectOption[];
};

export type AutocompleteEditorField = Omit<RegularEditorField, 'type'> & {
    type: 'AUTOCOMPLETE';
    options: any[];
    getOptionLabel: (option: any) => string;
    isOptionEqualToValue: (option: any, value: any) => boolean;
};

export type AutocompleteAsyncEditorField = Omit<AutocompleteEditorField, 'type' | 'options'> & {
    type: 'AUTOCOMPLETE_ASYNC';
    query: DocumentNode,
    queryToOptionsMapper: (data: any) => any,
};

export type EditorField =
    RegularEditorField
    | SelectEditorField
    | AutocompleteEditorField
    | AutocompleteAsyncEditorField;

export type FormProps<T> = {
    fields: EditorField[];
    initialValues: T;
    validationSchema: Yup.ObjectSchema<any>;
    previewOfChange?(t: T): React.JSX.Element;
    autoSubmit?: boolean;
    showControlButtons?: boolean;
    onSave: (value: T) => void;
    onCancel: () => void
}

export default function Form<T>({
                                    fields,
                                    initialValues,
                                    validationSchema,
                                    previewOfChange,
                                    autoSubmit,
                                    showControlButtons,
                                    onSave,
                                    onCancel
                                }: FormProps<T>) {
    if (showControlButtons === undefined) {
        showControlButtons = true;
    }

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
            onChange={(e) => {
                formik.handleChange(e);
                if (autoSubmit) {
                    formik.submitForm();
                }
            }}
            onBlur={formik.handleBlur}
            error={formik.touched[editorField.key] && Boolean(formik.errors[editorField.key])}
            helperText={formik.touched[editorField.key] && formik.errors[editorField.key]}
        >
            {
                isSelectEditorField(editorField) && editorField.selectOptions.map(option => (
                    <MenuItem key={option.key}
                              value={option.key}>{option.displayElement}</MenuItem>
                ))
            }
        </TextField>
    }

    function createDatePicker(editorField: EditorField, formik: any) {
        return <DatePicker
            {...getFieldUniqueProps(editorField)}
            {...(editorField.additionalProps || {})}
            fullWidth
            variant="standard"
            id={editorField.key}
            name={editorField.key}
            key={editorField.key}
            label={editorField.label}
            value={formik.values[editorField.key]}
            format={'YYYY-MM-DD'}
            onChange={(newValue: Dayjs) => {
                formik.setFieldValue(editorField.key, newValue, true);
                if (autoSubmit) {
                    formik.submitForm();
                }
            }}
            onBlur={formik.handleBlur}
            error={formik.touched[editorField.key] && Boolean(formik.errors[editorField.key])}
            helperText={formik.touched[editorField.key] && formik.errors[editorField.key]}
        />
    }

    function createAutocomplete(editorField: AutocompleteEditorField, formik: any) {
        return <Autocomplete
            fullWidth
            disabled={!editorField.editable}
            id={editorField.key}
            key={editorField.key}
            value={formik.values[editorField.key]}
            onBlur={formik.handleBlur}
            onChange={(e, newValue) => {
                formik.setFieldValue(editorField.key, newValue, true)
                if (autoSubmit) {
                    formik.submitForm();
                }
            }}
            getOptionLabel={option => editorField.getOptionLabel(option)}
            isOptionEqualToValue={editorField.isOptionEqualToValue}
            options={editorField.options}
            renderInput={(params) => <TextField
                {...params}
                variant="standard"
                label={editorField.label}
                error={formik.touched[editorField.key] && Boolean(formik.errors[editorField.key])}
                helperText={formik.touched[editorField.key] && formik.errors[editorField.key]}
            />}
        />
    }

    function createCheckbox(editorField: BooleanEditorField, formik: any) {
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
                              onChange={(e) => {
                                  formik.handleChange(e);
                                  if (autoSubmit) {
                                      formik.submitForm();
                                  }
                              }}
                              onBlur={formik.handleBlur}
                              {...(editorField.additionalProps || {})}
                              control={<Checkbox
                                  disabled={!editorField.editable}
                                  checked={formik.values[editorField.key]}
                                  size={'small'}
                                  icon={editorField.icon}
                                  checkedIcon={editorField.checkedIcon}
                              />}
            />
        </FormControl>;
    }

    const form = (formik: any) => {
        return (
            <form onSubmit={formik.handleSubmit}>
                <Stack direction={"column"} spacing={4} alignItems={"center"}>
                    {
                        fields
                            .filter(field => field.type !== 'HIDDEN')
                            .map(editorField => {
                                if (isDatepickerEditorField(editorField)) {
                                    return createDatePicker(editorField, formik);
                                } else if (isCheckboxEditorField(editorField)) {
                                    return createCheckbox(editorField, formik);
                                } else if (isAutocompleteEditorField(editorField)) {
                                    return createAutocomplete(editorField, formik);
                                } else if (isAutocompleteAsyncEditorField(editorField)) {
                                    return AutocompleteAsync({
                                        formik: formik,
                                        editorField: editorField
                                    });
                                } else {
                                    return createTextField(editorField, formik);
                                }
                            })}
                    {
                        previewOfChange?.(formik.values)
                    }
                    {(showControlButtons) &&
                        <Stack direction={"row"} spacing={4} alignItems={"center"} justifyContent={"space-evenly"}>
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
                    }
                </Stack>
            </form>
        );
    }

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