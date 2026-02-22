import {Box} from "@mui/material";

export type DebugDisplayObjectProps = {
    object: any
}

export function DebugDisplayObject({object}: DebugDisplayObjectProps) {
    return <Box component={'code'} sx={{whiteSpaceCollapse: 'break-spaces'}}>
        {JSON.stringify(object, null, 2)}
    </Box>;
}