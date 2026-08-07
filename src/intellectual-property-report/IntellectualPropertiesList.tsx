import {Box} from "@mui/material";
import * as React from "react";
import {useState} from "react";
import {EditorField} from "../utils/forms/Form";
import {IntellectualPropertyReport} from "./IntellectualPropertyReport";
import {IntellectualProperty} from "../types";

const EXPANDED_INTELLECTUAL_PROPERTY_ID_LOCAL_STORAGE_KEY = "newApp_IPR_accordion_expandedId";

export const IPR_DIALOG_TITLE = 'Dane własności intelektualnej';
export const IPR_EDITOR_FIELDS: EditorField[] = [
    {
        label: 'Opis',
        type: 'TEXTAREA',
        key: 'description',
        editable: true
    }
];

export function IntellectualPropertiesList(properties: {
    intellectualProperties: IntellectualProperty[]
    refetchDataCallback: () => void
}) {
    const {intellectualProperties, refetchDataCallback} = properties;
    const [expandedIntellectualPropertyId, _setExpandedIntellectualPropertyId] = useState<number>(Number.parseInt(localStorage.getItem(EXPANDED_INTELLECTUAL_PROPERTY_ID_LOCAL_STORAGE_KEY) || "-1"));
    const setExpandedIntellectualPropertyId = (expandedIntellectualPropertyId: number) => {
        _setExpandedIntellectualPropertyId(expandedIntellectualPropertyId);
        localStorage.setItem(EXPANDED_INTELLECTUAL_PROPERTY_ID_LOCAL_STORAGE_KEY, JSON.stringify(expandedIntellectualPropertyId));
    }

    const changeTab = (intellectualPropertyId: number) => {
        setExpandedIntellectualPropertyId(intellectualPropertyId === expandedIntellectualPropertyId ? -1 : intellectualPropertyId);
    };

    function expandedTabIdNotPresentInDataSet() {
        return !intellectualProperties.map(ipr => ipr.id).find(id => id === expandedIntellectualPropertyId);
    }

    if (expandedIntellectualPropertyId !== -1 && expandedTabIdNotPresentInDataSet()) {
        setExpandedIntellectualPropertyId(-1);
    }

    return (
        <Box component="section">
            {
                intellectualProperties
                    .map(intellectualProperty => (
                        <IntellectualPropertyReport
                            key={intellectualProperty.id}
                            ipr={intellectualProperty}
                            expanded={expandedIntellectualPropertyId === intellectualProperty.id}
                            onExpandCallback={changeTab}
                            refetchDataCallback={refetchDataCallback}
                            dialogOptions={{
                                title: IPR_DIALOG_TITLE,
                                editorFields: IPR_EDITOR_FIELDS
                            }}
                        />
                    ))
            }</Box>)
}