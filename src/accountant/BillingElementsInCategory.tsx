import {Grid, Stack, useTheme} from "@mui/material";
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

export function BillingElementsInCategory({categoryName, billingElements}: BillingElementsInCategoryProps) {
    const [expanded, setExpanded] = useState(false)
    const theme = useTheme();
    return <Stack direction={'column'} width={'100%'} sx={{...rowHover(theme)}} onClick={() => {
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
                           dialogOptions={{fullScreen: true}}>
            <Stack direction={'column'} justifyContent={'space-between'}>
                {
                    billingElements.sort(ComparatorBuilder.comparingByDate<GQLExpense | GQLIncome>(be => be.date).build()).map(be =>
                        <Grid container spacing={2}>
                            <Grid size={2}>
                                <Typography variant={'body2'}>{dayjs(be.date).format('YYYY-MM-DD')}</Typography>
                            </Grid>
                            <Grid size={8}>
                                <Typography variant={'body2'}>{be.description}</Typography>
                            </Grid>
                            <Grid size={2}>
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
    </Stack>
        ;
}