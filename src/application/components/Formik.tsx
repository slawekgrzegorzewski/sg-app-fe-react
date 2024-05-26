import React from 'react';
import {useFormik} from 'formik';

// Create empty context
const FormikContext = React.createContext({});

// Place all of what’s returned by useFormik into context
// @ts-ignore
export const Formik = ({children, ...props}) => {
    // @ts-ignore
    const formikStateAndHelpers = useFormik(props);
    return (
        <FormikContext.Provider value={formikStateAndHelpers}>
            {typeof children === 'function'
                ? children(formikStateAndHelpers)
                : children}
        </FormikContext.Provider>
    );
};