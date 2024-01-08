import {Dialog, DialogTitle, List, ListItem, ListItemButton, ListItemText} from "@mui/material";
import * as React from "react";
import {useState} from "react";

export type Option = {
    id: string;
    value: string;
}
export type MultiPickDialogProps = {
    options: Option[][];
    open: boolean;
    selectedValue: string[];
    onClose: (value: string[]) => void;
}

export default function MultiPickDialog(props: MultiPickDialogProps) {
    const {onClose, selectedValue, open, options} = props;
    const populateOptions = function () {
        const selected: Option[] = [];
        const notSelected: Option[][] = [];
        for (let i = 0; i < options.length; i++) {
            selected[i] = options[i].find(option => option.id === selectedValue[i])!;
            notSelected[i] = options[i].filter(option => option.id !== selectedValue[i])
        }
        return {selected: selected, notSelected: notSelected};
    }

    const o = populateOptions();
    const [selectedOptions, setSelectedOptions] = useState<Option[]>(o.selected);
    let notSelectedOptions: Option[][] = o.notSelected;
    const handleClose = () => {
        onClose(selectedValue);
    };

    const handleListItemClick = (index: number, value: string) => {
        selectedValue[index] = value;
        const o = populateOptions();
        notSelectedOptions = o.notSelected;
        setSelectedOptions(o.selected);
    };

    return (
        <Dialog onClose={handleClose} open={open}>
            {options.map((option, i) => (
                    <>
                        <DialogTitle>{selectedOptions ? selectedOptions[i].value : 'Wybierz aplikację'}</DialogTitle>
                        <List sx={{pt: 0}}>
                            {notSelectedOptions[i].map((option) => (
                                <ListItem disableGutters key={option.id}>
                                    <ListItemButton onClick={() => handleListItemClick(i, option.id)}>
                                        <ListItemText primary={option.value}/>
                                    </ListItemButton>
                                </ListItem>
                            ))}
                        </List>
                    </>
                )
            )}
        </Dialog>
    );
}