import * as React from "react";
import {Institution} from "../../types";
import {GQLInstitution} from "../model/types";
import {CardActionArea, CardContent, CardMedia} from "@mui/material";
import Typography from "@mui/material/Typography";

export interface InstitutionCardProps {
    institution: GQLInstitution | Institution;
    onClick?: (value: Institution) => void;
}

export function InstitutionCardContent({institution, onClick}: InstitutionCardProps): React.JSX.Element {
    return <CardActionArea onClick={() => onClick?.(institution)}>
        <CardMedia component="img" image={institution.logo} sx={{maxWidth: "150px"}}></CardMedia>
        <CardContent>
            <Typography variant="body1">
                {institution.id}
            </Typography>
            <Typography variant="body2" sx={{color: "text.secondary"}}>
                {institution.bic}
            </Typography>
            <Typography variant="body2" sx={{color: "text.secondary"}}>
                {institution.name}
            </Typography>
        </CardContent>
    </CardActionArea>;
}