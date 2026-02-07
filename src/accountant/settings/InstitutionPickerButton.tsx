import * as React from "react";
import {useState} from "react";
import {Institution} from "../../types";
import {Button} from "@mui/material";
import {InstitutionPicker} from "./InstitutionPicker";

export interface InstitutionPickerButtonProps {
    onPick: (value: Institution) => void;
}

export function InstitutionPickerButton({onPick}: InstitutionPickerButtonProps): React.JSX.Element {

    const [showPickInstitutionDialog, setShowPickInstitutionDialog] = useState(false);

    return <>
        <Button onClick={() => setShowPickInstitutionDialog(true)}>Dodaj</Button>
        {
            showPickInstitutionDialog && (
                <InstitutionPicker
                    onPick={(pickedInstitution) => {
                        setShowPickInstitutionDialog(false);
                        onPick(pickedInstitution);
                    }}
                    onClose={() => {
                        setShowPickInstitutionDialog(false);
                    }}/>
            )
        }
    </>
}