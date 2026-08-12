import * as React from 'react';
import {useState} from 'react';
import {Institution} from '../../types';
import {Button} from '@mui/material';
import {InstitutionPicker} from './InstitutionPicker';
import AddLinkRoundedIcon from '@mui/icons-material/AddLinkRounded';

export interface InstitutionPickerButtonProps {
    onPick: (value: Institution) => void;
    label?: string;
}

export function InstitutionPickerButton({onPick, label = 'Dodaj'}: InstitutionPickerButtonProps): React.JSX.Element {
    const [showPickInstitutionDialog, setShowPickInstitutionDialog] = useState(false);

    return (
        <>
            <Button
                variant="outlined"
                color="secondary"
                startIcon={<AddLinkRoundedIcon />}
                onClick={() => setShowPickInstitutionDialog(true)}
            >
                {label}
            </Button>
            <InstitutionPicker
                open={showPickInstitutionDialog}
                onPick={pickedInstitution => {
                    setShowPickInstitutionDialog(false);
                    onPick(pickedInstitution);
                }}
                onClose={() => {
                    setShowPickInstitutionDialog(false);
                }}
            />
        </>
    );
}
