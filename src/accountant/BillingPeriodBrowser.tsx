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

const YEAR_MONTH_FORMAT = "YYYY-MM";
const YEAR_MONTH_DISPLAY_FORMAT = "MMMM YYYY";

export function BillingPeriodBrowser() {
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
        return <>
            <Stack direction={'column'} style={{maxWidth: '1000px'}}>
                <Stack direction={'row'} justifyContent={'space-between'}>
                    <Button
                        onClick={() => fetchBillingPeriod(dayjs(yearMonth).subtract(1, 'month').toDate())}>wcześniej</Button>
                    <Typography variant={'h4'} style={{minWidth: '400px'}}
                                textAlign={'center'}>{dayjs(yearMonth).locale('pl').format(YEAR_MONTH_DISPLAY_FORMAT)}</Typography>
                    <Button
                        onClick={() => fetchBillingPeriod(dayjs(yearMonth).add(1, 'month').toDate())}>później</Button>
                </Stack>
                {
                    data.billingPeriod.billingPeriod && (
                        <Grid container spacing={2}>
                            <Grid size={6}>
                                <Stack direction={'column'}>
                                    <Typography variant={"h5"}>Dochody</Typography>
                                    {
                                        incomeCategories.map(categoryName =>
                                            <BillingElementsInCategory key={'income: ' + categoryName}
                                                                       categoryName={categoryName}
                                                                       billingElements={incomesByCategory.get(categoryName) || []}/>)
                                    }
                                </Stack>
                            </Grid>
                            <Grid size={6}>
                                <Stack direction={'column'}>
                                    <Typography variant={"h5"}>Wydatki</Typography>
                                    {
                                        expensesCategories.map(categoryName =>
                                            <BillingElementsInCategory key={'expense: ' + categoryName}
                                                                       categoryName={categoryName}
                                                                       billingElements={expensesByCategory.get(categoryName) || []}/>)
                                    }
                                </Stack>
                            </Grid>
                        </Grid>)
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
                            <Typography variant={'body1'}>Nie można utworzyć tego okresu rozliczeniowego</Typography>
                            <Typography variant={'body1'}>Możliwe przyczyny to</Typography>
                            <Typography variant={'body1'} sx={{paddingLeft: '10px'}}>a) poprzedni okres rozliczeniowy nie
                                został zakończony</Typography>
                            <Typography variant={'body1'} sx={{paddingLeft: '10px'}}>b) przeglądasz miesiąc inny niż
                                bieżący</Typography>
                        </Stack>
                    )
                }
                {
                    data.billingPeriod.billingPeriod && !data.billingPeriod.billingPeriod.monthSummary && (
                        <Stack direction={'row'} justifyContent={'center'}>
                            <Button onClick={() => setShowFinishBillingPeriodConfirmationDialog(true)}>Zakończ</Button>
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
        </>;
    } else {
        return <></>;
    }
}