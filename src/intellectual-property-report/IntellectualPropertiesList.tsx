import {Box} from "@mui/material";
import * as React from "react";
import {useState} from "react";
import {EditorField} from "../utils/forms/Form";
import {IntellectualPropertyDTO, NON_EXISTING_ID} from "./model/types";
import {IntellectualPropertyReport} from "./IntellectualPropertyReport";

const EXPANDED_INTELLECTUAL_PROPERTY_ID_LOCAL_STORAGE_KEY = "IPR_accordion_expandedId";

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
    intellectualProperties: IntellectualPropertyDTO[]
    refetchDataCallback: () => void
}) {
    const {intellectualProperties, refetchDataCallback} = properties;
    const [expandedIntellectualPropertyId, _setExpandedIntellectualPropertyId] = useState<number>(Number.parseInt(localStorage.getItem(EXPANDED_INTELLECTUAL_PROPERTY_ID_LOCAL_STORAGE_KEY) || "-1"));
    const setExpandedIntellectualPropertyId = (expandedIntellectualPropertyId: number) => {
        _setExpandedIntellectualPropertyId(expandedIntellectualPropertyId);
        localStorage.setItem(EXPANDED_INTELLECTUAL_PROPERTY_ID_LOCAL_STORAGE_KEY, JSON.stringify(expandedIntellectualPropertyId));
    }

    const changeTab = (intellectualPropertyId: number) => {
        setExpandedIntellectualPropertyId(intellectualPropertyId === expandedIntellectualPropertyId ? NON_EXISTING_ID : intellectualPropertyId);
    };

    function expandedTabIdNotPresentInDataSet() {
        return !intellectualProperties.map(ipr => ipr.id).find(id => id === expandedIntellectualPropertyId);
    }

    if (expandedIntellectualPropertyId !== NON_EXISTING_ID && expandedTabIdNotPresentInDataSet()) {
        setExpandedIntellectualPropertyId(NON_EXISTING_ID);
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
                                title: 'Dane własności intelektualnej',
                                editorFields: IPR_EDITOR_FIELDS
                            }}
                        />
                    ))
            }</Box>)
}