import {useLazyQuery, useMutation} from "@apollo/client/react";
import {
    BillingPeriodQuery,
    BillingPeriodQueryQuery,
    CreateBillingPeriod,
    CreateBillingPeriodMutation,
    FinishBillingPeriod,
    FinishBillingPeriodMutation
} from "../types";
import React, {useEffect, useState} from "react";
import {
    GQLBillingPeriodCreationBlockers,
    GQLExpense,
    GQLIncome,
    mapBillingPeriod,
    mapBillingPeriodCreationBlockers
} from "./model/types";
import {Grid, Stack} from "@mui/material";
import dayjs from "dayjs";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import {BillingElementsInCategory} from "./BillingElementsInCategory";
import ConfirmationDialog from "../utils/dialogs/ConfirmationDialog";
import {ResponsiveStyleValue} from "@mui/system";
import {CreateBillingElementButton} from "./CreateBillingElementButton";
import {BankTransactionsImporter} from "./BankTransactionsImporter";

const YEAR_MONTH_FORMAT = "YYYY-MM";
const YEAR_MONTH_DISPLAY_FORMAT = "MMMM YYYY";

const BILLING_ELEMENTS_DISPLAY_COLUMNS_DIRECTION = {
    xs: 'column',
    sm: 'row'
} as ResponsiveStyleValue<'row' | 'row-reverse' | 'column' | 'column-reverse'>;
const MAIN_GIRD_SIDE_SIZE = {xs: 0, sm: 2};
const MAIN_GIRD_MIDDLE_SIZE = {xs: 12, sm: 8};

export function BillingPeriods() {

    const [yearMonth, setYearMonth] = useState(new Date())
    const [showFinishBillingPeriodConfirmationDialog, setShowFinishBillingPeriodConfirmationDialog] = useState(false)
    const [performSearch, {
        loading,
        error,
        data,
        client,
        refetch
    }] = useLazyQuery<BillingPeriodQueryQuery>(BillingPeriodQuery);
    const [createBillingPeriodMutation] = useMutation<CreateBillingPeriodMutation>(CreateBillingPeriod);
    const [finishBillingPeriodMutation] = useMutation<FinishBillingPeriodMutation>(FinishBillingPeriod);


    useEffect(() => {
        performSearch({variables: {yearMonth: dayjs(yearMonth).format(YEAR_MONTH_FORMAT)}});
    });

    const fetchBillingPeriod = async (date: Date) => {
        setYearMonth(date);
        performSearch({variables: {yearMonth: dayjs(date).format(YEAR_MONTH_FORMAT)}});
    }

    function noCreationBlockers(creationBlockers: GQLBillingPeriodCreationBlockers) {
        return !creationBlockers.alreadyExists && !creationBlockers.unfinishedBillingPeriods && !creationBlockers.notForCurrentMonth;
    }

    if (loading) {
        return <>Loading...</>
    } else if (error) {
        return <>Error...</>
    } else if (data) {
        const billingPeriod = data.billingPeriod.billingPeriod ? mapBillingPeriod(data.billingPeriod.billingPeriod) : null;
        const billingPeriodCreationBlocker = data.billingPeriod.creationBlockers ? mapBillingPeriodCreationBlockers(data.billingPeriod.creationBlockers) : null;
        const incomesByCategory = billingPeriod?.incomes.reduce((map, income) => {
            let incomes = map.get(income.category.name) || [];
            incomes.push(income);
            map.set(income.category.name, incomes);
            return map;
        }, new Map<string, GQLIncome[]>()) || new Map<string, GQLIncome[]>();
        const expensesByCategory = billingPeriod?.expenses.reduce((map, expense) => {
            let expenses = map.get(expense.category.name) || [];
            expenses.push(expense);
            map.set(expense.category.name, expenses);
            return map;
        }, new Map<string, GQLExpense[]>()) || new Map<string, GQLExpense[]>();
        const incomeCategories = Array.from(incomesByCategory.keys()).sort();
        const expensesCategories = Array.from(expensesByCategory.keys()).sort();
        return <Grid container={true} paddingLeft={2} paddingRight={2}>
            <Grid size={MAIN_GIRD_SIDE_SIZE}></Grid>
            <Grid size={MAIN_GIRD_MIDDLE_SIZE} justifyContent={'center'} container={true}>
                <Stack direction={'column'} style={{maxWidth: '800px'}}>
                    <Stack direction={'row'} justifyContent={'space-between'}>
                        <Button onClick={() => fetchBillingPeriod(dayjs(yearMonth).subtract(1, 'month').toDate())}>
                            wcześniej
                        </Button>
                        <Typography variant={'h4'}
                                    textAlign={'center'}>
                            {dayjs(yearMonth).locale('pl').format(YEAR_MONTH_DISPLAY_FORMAT)}
                        </Typography>
                        <Button onClick={() => fetchBillingPeriod(dayjs(yearMonth).add(1, 'month').toDate())}>
                            później
                        </Button>
                    </Stack>
                    {
                        data.billingPeriod.billingPeriod && (
                            <Stack direction={BILLING_ELEMENTS_DISPLAY_COLUMNS_DIRECTION}
                                   spacing={{xs: 0, sm: 2}}
                                   justifyContent={'center'}>
                                <Stack direction={'column'}
                                       sx={{minWidth: '270px'}}>
                                    <Typography variant={"h5"} textAlign={'center'}>Dochody</Typography>
                                    {
                                        incomeCategories.map(categoryName =>
                                            <BillingElementsInCategory key={'income: ' + categoryName}
                                                                       categoryName={categoryName}
                                                                       billingElements={incomesByCategory.get(categoryName) || []}/>)
                                    }
                                    {
                                        !data.billingPeriod.billingPeriod.monthSummary && (
                                            <CreateBillingElementButton yearMonth={yearMonth} billingElementType={"Income"}/>
                                        )
                                    }
                                </Stack>
                                <Stack direction={'column'}
                                       sx={{minWidth: '270px'}}>
                                    <Typography variant={"h5"} textAlign={'center'}>Wydatki</Typography>
                                    {
                                        expensesCategories.map(categoryName =>
                                            <BillingElementsInCategory key={'expense: ' + categoryName}
                                                                       categoryName={categoryName}
                                                                       billingElements={expensesByCategory.get(categoryName) || []}/>)
                                    }
                                    {
                                        !data.billingPeriod.billingPeriod.monthSummary && (
                                            <CreateBillingElementButton yearMonth={yearMonth} billingElementType={"Expense"}/>
                                        )
                                    }
                                </Stack>
                            </Stack>)
                    }
                    {
                        data.billingPeriod.billingPeriod && (<BankTransactionsImporter/>)
                    }
                    {
                        !data.billingPeriod.billingPeriod && billingPeriodCreationBlocker && noCreationBlockers(billingPeriodCreationBlocker) && (
                            <Stack direction={'row'}>
                                <Button onClick={async () => {
                                    await client.clearStore()
                                        .then(() => setShowFinishBillingPeriodConfirmationDialog(false))
                                        .then(() => createBillingPeriodMutation({variables: {yearMonth: dayjs(yearMonth).format(YEAR_MONTH_FORMAT)}}))
                                        .then(() => refetch())
                                        .then(bp => Promise.resolve());
                                }}>
                                    Utwórz
                                </Button>
                            </Stack>
                        )
                    }
                    {
                        !data.billingPeriod.billingPeriod && billingPeriodCreationBlocker && !noCreationBlockers(billingPeriodCreationBlocker) && (
                            <Stack direction={'column'}>
                                <Typography variant={'body1'}>Nie można utworzyć tego okresu
                                    rozliczeniowego</Typography>
                                <Typography variant={'body1'}>Możliwe przyczyny to</Typography>
                                <Typography variant={'body1'} sx={{paddingLeft: '10px'}}>a) poprzedni okres
                                    rozliczeniowy
                                    nie
                                    został zakończony</Typography>
                                <Typography variant={'body1'} sx={{paddingLeft: '10px'}}>b) przeglądasz miesiąc inny niż
                                    bieżący</Typography>
                            </Stack>
                        )
                    }
                    {
                        data.billingPeriod.billingPeriod && !data.billingPeriod.billingPeriod.monthSummary && (
                            <Stack direction={'row'} justifyContent={'center'}>
                                <Button
                                    onClick={() => setShowFinishBillingPeriodConfirmationDialog(true)}>Zakończ</Button>
                            </Stack>
                        )
                    }
                </Stack>
                <ConfirmationDialog
                    companionObject={billingPeriod}
                    title={'Czy na pewno zakończyć ten okres rozliczeniowy?'}
                    message={'Czy na pewno zakończyć ten okres rozliczeniowy?'}
                    open={showFinishBillingPeriodConfirmationDialog}
                    onConfirm={async bp => {
                        await client.clearStore()
                            .then(() => setShowFinishBillingPeriodConfirmationDialog(false))
                            .then(() => finishBillingPeriodMutation({variables: {yearMonth: billingPeriod!.period}}))
                            .then(() => refetch())
                            .then(bp => Promise.resolve());
                    }}
                    onCancel={() => {
                        setShowFinishBillingPeriodConfirmationDialog(false);
                        return Promise.resolve();
                    }}/>
            </Grid>
            <Grid size={MAIN_GIRD_SIDE_SIZE}></Grid>
        </Grid>
            ;
    } else {
        return <></>;
    }
}