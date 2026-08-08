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
import {almostFullHeightDialog, compactListRow} from "../utils/theme/utils";
import {OverflowTooltip} from "../utils/OverflowTooltip";

export interface BillingElementsInCategoryProps {
    categoryName: string;
    billingElements: (Income | Expense) [];
}

const GRID_DATE_COLUMN_SIZE = {xs: 4, sm: 3};
const GRID_DESCRIPTION_COLUMN_SIZE = {xs: 8, sm: 6};
const GRID_AMOUNT_COLUMN_SIZE = {xs: 12, sm: 3};

export function BillingElementsInCategory({categoryName, billingElements}: BillingElementsInCategoryProps) {
    const [expanded, setExpanded] = useState(false)
    const theme = useTheme();
    const isTouchDevice = useMediaQuery('(pointer: coarse)');
    return <Stack direction="column" width="100%"
                  sx={compactListRow(theme)}
                  {...clickableProps(() => setExpanded(!expanded), `Kategoria ${categoryName}`, expanded)}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" gap={2}>
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
                           dialogOptions={{fullScreen: isTouchDevice}}
                           sx={[
                               almostFullHeightDialog,
                               {
                                   '& .MuiDialog-paper': {maxWidth: '800px', width: '800px'}
                               }
                           ]}>
            <Stack direction="column" justifyContent="space-between" sx={{width: '100%'}}>
                <Box>
                    {
                        [...billingElements].sort(ComparatorBuilder.comparingByDate<Expense | Income>(be => new Date(be.date)).thenComparing(be => be.publicId).build()).map(be =>
                            <Grid key={be.publicId} container spacing={2} alignItems="center"
                                  sx={compactListRow(theme)}>
                                <Grid size={GRID_DATE_COLUMN_SIZE}>
                                    <Typography variant="body2" color="text.secondary">
                                        {dayjs(be.date).format('YYYY-MM-DD')}
                                    </Typography>
                                </Grid>
                                <Grid size={GRID_DESCRIPTION_COLUMN_SIZE} sx={{minWidth: 0}}>
                                    <OverflowTooltip>
                                        {be.description}
                                    </OverflowTooltip>
                                </Grid>
                                <Grid size={GRID_AMOUNT_COLUMN_SIZE} sx={{textAlign: 'right'}}>
                                    <Typography
                                        variant="body2"
                                        sx={{fontWeight: 500, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap'}}
                                    >
                                        {formatCurrency(be.currency, new Decimal(be.amount))}
                                    </Typography>
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
