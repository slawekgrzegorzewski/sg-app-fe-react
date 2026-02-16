import {Grid, Stack, useMediaQuery, useTheme} from "@mui/material";
import {GQLExpense, GQLIncome} from "./model/types";
import Typography from "@mui/material/Typography";
import {MultiCurrencySummary} from "../application/components/MultiCurrencySummary";
import {rowHover} from "../utils/theme";
import {useState} from "react";
import {formatCurrency} from "../utils/functions";
import InformationDialog from "../utils/dialogs/InformationDialog";
import {ComparatorBuilder} from "../utils/comparator-builder";
import dayjs from "dayjs";

export interface BillingElementsInCategoryProps {
    categoryName: string;
    billingElements: (GQLIncome | GQLExpense) [];
}

const GRID_SIDE_COLUMN_SIZE = {xs: 3, sm: 2}
const GRID_MAIN_COLUMN_SIZE = {xs: 6, sm: 8}

export function BillingElementsInCategory({categoryName, billingElements}: BillingElementsInCategoryProps) {
    const [expanded, setExpanded] = useState(false)
    const theme = useTheme();
    const isXSBreakpoint = useMediaQuery(theme.breakpoints.down('sm'));
    return <Stack direction={'column'} width={'100%'}
                  sx={{...rowHover(theme), borderBottom: '1px dotted', borderTop: '1px dotted'}}
                  onClick={() => {
                      setExpanded(!expanded)
                  }}>
        <Stack direction={'row'} justifyContent={'space-between'}>
            <Typography variant={'body1'}>{categoryName}</Typography>
            <MultiCurrencySummary
                data={billingElements}
                currencyExtractor={be => be.currency.code}
                amountExtractor={be => be.amount}/>
        </Stack>
        <InformationDialog title={categoryName}
                           open={expanded}
                           onClose={() => {
                               setExpanded(false);
                               return Promise.resolve();
                           }}
                           dialogOptions={{fullScreen: isXSBreakpoint}}>
            <Stack direction={'column'} justifyContent={'space-between'} sx={{minWidth: '800px'}}>
                {
                    billingElements.sort(ComparatorBuilder.comparingByDate<GQLExpense | GQLIncome>(be => be.date).thenComparing(be => be.publicId).build()).map(be =>
                        <Grid container spacing={2}>
                            <Grid size={GRID_SIDE_COLUMN_SIZE}>
                                <Typography variant={'body2'}>{dayjs(be.date).format('YYYY-MM-DD')}</Typography>
                            </Grid>
                            <Grid size={GRID_MAIN_COLUMN_SIZE}>
                                <Typography variant={'body2'}>{be.description}</Typography>
                            </Grid>
                            <Grid size={GRID_SIDE_COLUMN_SIZE}>
                                <Typography variant={'body2'}>{formatCurrency(be.currency.code, be.amount)}</Typography>
                            </Grid>
                            <Stack/>
                        </Grid>
                    )
                }
                <MultiCurrencySummary
                    data={billingElements}
                    header={'Suma:'}
                    currencyExtractor={be => be.currency.code}
                    amountExtractor={be => be.amount}/>
            </Stack>
        </InformationDialog>
    </Stack>;
}