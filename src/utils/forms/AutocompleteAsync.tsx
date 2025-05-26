import {Autocomplete, CircularProgress, debounce, TextField} from "@mui/material";
import * as React from "react";
import {AutocompleteAsyncEditorField} from "./Form";
import {useLazyQuery} from "@apollo/client";

export type AutocompleteAsyncProps = {
    formik: any,
    autoSubmit?: boolean,
    editorField: AutocompleteAsyncEditorField
}

export default function AutocompleteAsync({formik, autoSubmit, editorField}: AutocompleteAsyncProps) {

    const [options, setOptions] = React.useState<{ open: boolean, filter: string, loaded: boolean, options: any[] }>({
        open: false,
        filter: '',
        loaded: false,
        options: []
    });

    const [
        performSearch,
        {
            loading,
            error,
            data
        }
    ]
        = useLazyQuery<any>(editorField.query, {
        variables: {
            descriptionLike: options.filter
        }
    });

    if (!loading && !error && data) {
        if (!options.loaded)
            setOptions({
                open: true,
                filter: options.filter,
                loaded: true,
                options: editorField.queryToOptionsMapper(data)
            });
    }

    const handleInputChange = debounce((options: any) => {
        setOptions({
            open: true,
            filter: options.target.value,
            loaded: false,
            options: []
        });
        performSearch();
        console.log(options.target.value);
    }, 500);

    const handleClose = () => {
        setOptions({
            open: false,
            filter: options.filter,
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