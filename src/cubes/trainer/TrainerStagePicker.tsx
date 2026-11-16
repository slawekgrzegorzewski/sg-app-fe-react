import {useState} from 'react';
import {Button, Typography} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {CfopStage} from '../../types';
import {CubeSelectionDialog} from '../CubeSelectionDialog';

const STAGES = [CfopStage.Cross, CfopStage.F2L, CfopStage.Oll, CfopStage.Pll].map(value => ({value, label: value}));

type Props = {
    stage: CfopStage;
    disabled: boolean;
    onSelect: (stage: CfopStage) => void;
};

export function TrainerStagePicker({stage, disabled, onSelect}: Props) {
    const [open, setOpen] = useState(false);
    return (
        <>
            <Typography component="h2" variant="h4">
                <Button
                    color="inherit"
                    disabled={disabled}
                    aria-haspopup="dialog"
                    aria-expanded={open}
                    onClick={() => setOpen(true)}
                    onKeyDown={event => event.stopPropagation()}
                    onKeyUp={event => event.stopPropagation()}
                    endIcon={<ExpandMoreIcon sx={{color: 'text.secondary'}}/>}
                    sx={{font: 'inherit', textTransform: 'none', p: 0.5, ml: -0.5, minWidth: 0}}
                >
                    Ćwiczenie {stage}
                </Button>
            </Typography>
            <CubeSelectionDialog
                title="Wybierz fazę CFOP"
                open={open}
                value={stage}
                options={STAGES}
                onClose={() => setOpen(false)}
                onSelect={value => {
                    setOpen(false);
                    if (value !== stage) {
                        onSelect(value);
                    }
                }}
            />
        </>
    );
}
