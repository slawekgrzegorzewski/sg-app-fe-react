import {
    FormControl,
    InputLabel,
    MenuItem,
    OutlinedInput,
    Select,
    SelectChangeEvent,
    Theme,
    useTheme
} from "@mui/material";
import {useCurrentUser} from "../../users/use-current-user";
import * as React from "react";
import {useApplication} from "../use-application";
import {SxProps} from "@mui/system";
import Box from "@mui/material/Box";

export default function ApplicationPicker(properties: {
    sx?: SxProps<Theme>;
}) {
    const theme = useTheme();
    const {currentApplicationId, changeCurrentApplicationId} = useApplication();
    const {user} = useCurrentUser();
    const handleApplicationChange = (event: SelectChangeEvent) => {
        changeCurrentApplicationId(event.target.value);
    };
    return (
        <Box sx={properties.sx}>
            <FormControl fullWidth>
                <InputLabel id="applications-label"
                            sx={{color: theme.palette.primary.contrastText}}>Aplikacja</InputLabel>
                <Select
                    labelId="applications-label"
                    id="applications"
                    value={currentApplicationId}
                    onChange={handleApplicationChange}
                    input={<OutlinedInput sx={{color: 'white'}}/>}
                >
                    {user!.applications.map((application) => (
                        <MenuItem
                            key={application.id}
                            value={application.id}>
                            {application.name}
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>
        </Box>
    );
}