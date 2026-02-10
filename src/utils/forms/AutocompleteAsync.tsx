import {Autocomplete, CircularProgress, debounce, TextField} from "@mui/material";
import * as React from "react";
import {AutocompleteAsyncEditorField} from "./Form";
import {useLazyQuery} from "@apollo/client/react";

export type AutocompleteAsyncProps = {
    formik: any,
    autoSubmit?: boolean,
    editorField: AutocompleteAsyncEditorField
}

export default function AutocompleteAsync({formik, autoSubmit, editorField}: AutocompleteAsyncProps) {

    const [options, setOptions] = React.useState<{ open: boolean, loaded: boolean, options: any[] }>({
        open: false,
        loaded: false,
        options: []
    });

    const [performSearch, {loading, error, data}] = useLazyQuery(editorField.query);

    if (!loading && !error && data && !options.loaded) {
        setOptions({
            open: true,
            loaded: true,
            options: editorField.queryToOptionsMapper(data)
        });
    }

    const handleInputChange = debounce((event: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
        if (event.target.value.length >= 3) {
            setOptions({
                open: true,
                loaded: false,
                options: []
            });
            performSearch({
                variables: {descriptionLike: event.target.value}
            });
        } else {
            setOptions({
                open: true,
                loaded: true,
                options: []
            });
        }
    }, 500);

    const handleClose = () => {
        setOptions({
            open: false,
            loaded: true,
            options: options.options
        });
    };

    return <Autocomplete
        {...editorField.additionalProps}

        filterOptions={(x: any) => x}
        open={options.open}
        onClose={handleClose}
        loading={loading}

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
        getOptionLabel={option => editorField.getOptionLabel!(option)}
        isOptionEqualToValue={editorField.isOptionEqualToValue!}
        options={options.options}

        renderInput={(params) => (
            <TextField
                {...params}
                multiline={true}
                label={editorField.label}
                error={formik.touched[editorField.key] && Boolean(formik.errors[editorField.key])}
                helperText={formik.touched[editorField.key] && formik.errors[editorField.key]}
                onChange={handleInputChange}
                slotProps={{
                    input: {
                        ...params.InputProps,
                        endAdornment: (
                            <React.Fragment>
                                {loading ? <CircularProgress color="inherit" size={20}/> : null}
                                {params.InputProps.endAdornment}
                            </React.Fragment>
                        ),
                    },
                }}
            />
        )}
    />
}