import {clickableProps} from "../application/components/clickable";
import {Box, Grid, Stack, useMediaQuery, useTheme} from "@mui/material";
import Typography from "@mui/material/Typography";
import {MultiCurrencySummary} from "../application/components/MultiCurrencySummary";
import {useState} from "react";
import {formatCurrency} from "../utils/functions";
import InformationDialog from "../utils/dialogs/InformationDialog";
import {ComparatorBuilder} from "../utils/comparator-builder";
import dayjs from "dayjs";
import {Expense, Income} from "../types";
import Decimal from "decimal.js";
import {rowHover} from "../utils/theme/utils";

export interface BillingElementsInCategoryProps {
    categoryName: string;
    billingElements: (Income | Expense) [];
}

const GRID_SIDE_COLUMN_SIZE = {xs: 3, sm: 2}
const GRID_MAIN_COLUMN_SIZE = {xs: 6, sm: 8}

export function BillingElementsInCategory({categoryName, billingElements}: BillingElementsInCategoryProps) {
    const [expanded, setExpanded] = useState(false)
    const theme = useTheme();
    const isXSBreakpoint = useMediaQuery(theme.breakpoints.down('sm'));
    return <Stack direction={'column'} width={'100%'}
                  sx={{...rowHover(theme), borderBottom: '1px dotted', borderTop: '1px dotted'}}
                  {...clickableProps(() => setExpanded(!expanded), `Kategoria ${categoryName}`, expanded)}>
        <Stack direction={'row'} justifyContent={'space-between'}>
            <Typography variant={'body1'}>{categoryName}</Typography>
            <MultiCurrencySummary
                data={billingElements}
                currencyExtractor={be => be.currency}
                amountExtractor={be => new Decimal(be.amount)}/>
        </Stack>
        <InformationDialog title={categoryName}
                           open={expanded}
                           onClose={() => {
                               setExpanded(false);
                               return Promise.resolve();
                           }}
                           dialogOptions={{fullScreen: isXSBreakpoint}}
                           sx={isXSBreakpoint ? {} : {minWidth: '650px'}}>
            <Stack direction={'column'} justifyContent={'space-between'} sx={isXSBreakpoint ? {} : {minWidth: '550px'}}>
                <Box>
                    {
                        [...billingElements].sort(ComparatorBuilder.comparingByDate<Expense | Income>(be => new Date(be.date)).thenComparing(be => be.publicId).build()).map(be =>
                            <Grid key={be.publicId} container spacing={2} sx={{...rowHover(theme)}}>
                                <Grid size={GRID_SIDE_COLUMN_SIZE}>
                                    <Typography variant={'body2'}>{dayjs(be.date).format('YYYY-MM-DD')}</Typography>
                                </Grid>
                                <Grid size={GRID_MAIN_COLUMN_SIZE}>
                                    <Typography variant={'body2'}>{be.description}</Typography>
                                </Grid>
                                <Grid size={GRID_SIDE_COLUMN_SIZE}>
                                    <Typography
                                        variant={'body2'}>{formatCurrency(be.currency, new Decimal(be.amount))}</Typography>
                                </Grid>
                            </Grid>
                        )
                    }
                </Box>
                <MultiCurrencySummary
                    data={billingElements}
                    header={'Suma:'}
                    currencyExtractor={be => be.currency}
                    amountExtractor={be => new Decimal(be.amount)}/>
            </Stack>
        </InformationDialog>
    </Stack>;
}