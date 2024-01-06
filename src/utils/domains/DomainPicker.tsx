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
import * as React from "react";
import {useDomain} from "./use-domain";
import {useCurrentUser} from "../users/use-current-user";
import {SxProps} from "@mui/system";
import Box from "@mui/material/Box";

export default function DomainPicker(properties: {
    sx?: SxProps<Theme>;
}) {
    const theme = useTheme();
    const {user} = useCurrentUser();
    const {currentDomainId, changeCurrentDomainId} = useDomain();
    const handleApplicationChange = (event: SelectChangeEvent) => {
        changeCurrentDomainId(Number(event.target.value));
    };
    return (
        <Box sx={properties.sx}>
            <FormControl fullWidth>
                <InputLabel id="domains-label"
                            sx={{color: theme.palette.primary.contrastText}}>Domena</InputLabel>
                <Select
                    labelId="domains-label"
                    id="domains"
                    value={currentDomainId.toString()}
                    onChange={handleApplicationChange}
                    input={<OutlinedInput sx={{color: 'white'}}/>}
                >
                    {user!.user.domains.map((domain) => (
                        <MenuItem
                            key={domain.id}
                            value={domain.id}>
                            {domain.name}
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>
        </Box>
    );
}