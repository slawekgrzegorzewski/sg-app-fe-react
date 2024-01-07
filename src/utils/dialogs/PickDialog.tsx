import {Dialog, DialogTitle, List, ListItem, ListItemButton, ListItemText} from "@mui/material";
import * as React from "react";

export interface PickDialogProps {
    options: { id: string, value: string }[];
    open: boolean;
    selectedValue: string;
    onClose: (value: string) => void;
}

export default function PickDialog(props: PickDialogProps) {
    const {onClose, selectedValue, open, options} = props;
    const selectedOption = options.find(option => option.id === selectedValue);
    const notSelectedOptions = options.filter(option => option.id !== selectedValue);
    const handleClose = () => {
        onClose(selectedValue);
    };

    const handleListItemClick = (value: string) => {
        onClose(value);
    };

    return (
        <Dialog onClose={handleClose} open={open}>
            <DialogTitle>{selectedOption ? selectedOption.value : 'Wybierz aplikację'}</DialogTitle>
            <List sx={{pt: 0}}>
                {notSelectedOptions.map((option) => (
                    <ListItem disableGutters key={option.id}>
                        <ListItemButton onClick={() => handleListItemClick(option.id)}>
                            <ListItemText primary={option.value}/>
                        </ListItemButton>
                    </ListItem>
                ))}
            </List>
        </Dialog>
    );
}