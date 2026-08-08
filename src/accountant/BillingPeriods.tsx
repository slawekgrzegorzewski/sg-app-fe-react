import {ErrorDisplay} from "../application/components/QueryState";
import {useLazyQuery, useMutation} from "@apollo/client/react";
import {
    BillingPeriod,
    BillingPeriodCreationBlockers,
    BillingPeriodQuery,
    BillingPeriodQueryQuery,
    BillingPeriodResponse,
    CreateBillingPeriod,
    CreateBillingPeriodMutation,
    Expense,
    FinishBillingPeriod,
    FinishBillingPeriodMutation,
    Income
} from "../types";
import React, {useEffect, useState} from "react";
import {Stack} from "@mui/material";
import dayjs from "dayjs";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import {BillingElementsInCategory} from "./BillingElementsInCategory";
import ConfirmationDialog from "../utils/dialogs/ConfirmationDialog";
import {CreateBillingElementButton} from "./CreateBillingElementButton";
import {BankTransactionsImporter} from "./BankTransactionsImporter";

const YEAR_MONTH_FORMAT = "YYYY-MM";
const YEAR_MONTH_DISPLAY_FORMAT = "MMMM YYYY";

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
    }, [yearMonth, performSearch]);

    const fetchBillingPeriod = async (date: Date) => {
        setYearMonth(date);
    }

    function noCreationBlockers(creationBlockers: BillingPeriodCreationBlockers) {
        return !creationBlockers.alreadyExists && !creationBlockers.unfinishedBillingPeriods && !creationBlockers.notForCurrentMonth;
    }

    if (loading) {
        return <></>
    } else if (error) {
        return <ErrorDisplay error={error}/>
    } else if (data) {
        const billingPeriodResponse = data.billingPeriod ? data.billingPeriod as BillingPeriodResponse : null;
        const billingPeriod = billingPeriodResponse?.billingPeriod ? billingPeriodResponse.billingPeriod as BillingPeriod : null;
        const billingPeriodCreationBlocker = billingPeriodResponse?.creationBlockers ? billingPeriodResponse.creationBlockers : null;
        const incomesByCategory = billingPeriod?.incomes.reduce((map, income) => {
            let incomes = map.get(income.category.name) || [];
            incomes.push(income);
            map.set(income.category.name, incomes);
            return map;
        }, new Map<string, Income[]>()) || new Map<string, Income[]>();
        const expensesByCategory = billingPeriod?.expenses.reduce((map, expense) => {
            let expenses = map.get(expense.category.name) || [];
            expenses.push(expense);
            map.set(expense.category.name, expenses);
            return map;
        }, new Map<string, Expense[]>()) || new Map<string, Expense[]>();
        const incomeCategories = Array.from(incomesByCategory.keys()).sort();
        const expensesCategories = Array.from(expensesByCategory.keys()).sort();
        return <Stack
            direction="column"
            alignItems="center"
            sx={{px: {xs: 1, sm: 2}, py: 2}}
        >
                <Stack direction="column" sx={{width: '100%', maxWidth: 800}}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{mb: 3}}>
                        <Button onClick={() => fetchBillingPeriod(dayjs(yearMonth).subtract(1, 'month').toDate())}>
                            wcześniej
                        </Button>
                        <Typography variant="h4" textAlign="center" sx={{color: 'secondary.main'}}>
                            {dayjs(yearMonth).locale(navigator.language).format(YEAR_MONTH_DISPLAY_FORMAT)}
                        </Typography>
                        <Button onClick={() => fetchBillingPeriod(dayjs(yearMonth).add(1, 'month').toDate())}>
                            później
                        </Button>
                    </Stack>
                    {
                        data.billingPeriod.billingPeriod && (
                            <Stack direction={{xs: 'column', md: 'row'}}
                                   spacing={{xs: 3, md: 5}}
                                   justifyContent="center"
                                   alignItems={{xs: 'stretch', md: 'flex-start'}}>
                                <Stack direction="column" sx={{width: '100%', maxWidth: 800}}>
                                    <Typography variant="h4" textAlign="center"
                                                sx={{mb: 1.5, color: 'secondary.main'}}>
                                        Dochody
                                    </Typography>
                                    {
                                        incomeCategories.map(categoryName =>
                                            <BillingElementsInCategory key={'income: ' + categoryName}
                                                                       categoryName={categoryName}
                                                                       billingElements={incomesByCategory.get(categoryName) || []}/>)
                                    }
                                    {
                                        !data.billingPeriod.billingPeriod.monthSummary && (
                                            <CreateBillingElementButton billingElementType={"Income"}/>
                                        )
                                    }
                                </Stack>
                                <Stack direction="column" sx={{width: '100%', maxWidth: 800}}>
                                    <Typography variant="h4" textAlign="center"
                                                sx={{mb: 1.5, color: 'secondary.main'}}>
                                        Wydatki
                                    </Typography>
                                    {
                                        expensesCategories.map(categoryName =>
                                            <BillingElementsInCategory key={'expense: ' + categoryName}
                                                                       categoryName={categoryName}
                                                                       billingElements={expensesByCategory.get(categoryName) || []}/>)
                                    }
                                    {
                                        !data.billingPeriod.billingPeriod.monthSummary && (
                                            <CreateBillingElementButton billingElementType={"Expense"}/>
                                        )
                                    }
                                </Stack>
                            </Stack>)
                    }
                    {
                        data.billingPeriod.billingPeriod && (
                            <BankTransactionsImporter
                                onRefetch={() => client.clearStore().then(() => refetch()).then(() => Promise.resolve())}/>)
                    }
                    {
                        !data.billingPeriod.billingPeriod && billingPeriodCreationBlocker && noCreationBlockers(billingPeriodCreationBlocker) && (
                            <Stack direction="row" justifyContent="center" sx={{mt: 2}}>
                                <Button color="secondary" onClick={async () => {
                                    await client.clearStore()
                                        .then(() => setShowFinishBillingPeriodConfirmationDialog(false))
                                        .then(() => createBillingPeriodMutation({variables: {yearMonth: dayjs(yearMonth).format(YEAR_MONTH_FORMAT)}}))
                                        .then(() => refetch())
                                        .then(() => Promise.resolve());
                                }}>
                                    Utwórz
                                </Button>
                            </Stack>
                        )
                    }
                    {
                        !data.billingPeriod.billingPeriod && billingPeriodCreationBlocker && !noCreationBlockers(billingPeriodCreationBlocker) && (
                            <Stack direction="column" sx={{mt: 2, px: 1.5, py: 1}}>
                                <Typography variant="h5" sx={{mb: 1, color: 'secondary.main'}}>Nie można utworzyć tego okresu
                                    rozliczeniowego</Typography>
                                <Typography variant="body1" color="text.secondary">Możliwe przyczyny:</Typography>
                                <Typography variant="body1" sx={{pl: 1.5}}>a) poprzedni okres
                                    rozliczeniowy
                                    nie
                                    został zakończony</Typography>
                                <Typography variant="body1" sx={{pl: 1.5}}>b) przeglądasz miesiąc inny niż
                                    bieżący</Typography>
                            </Stack>
                        )
                    }
                    {
                        data.billingPeriod.billingPeriod && !data.billingPeriod.billingPeriod.monthSummary && (
                            <Stack direction="row" justifyContent="center" sx={{mt: 2}}>
                                <Button
                                    onClick={() => setShowFinishBillingPeriodConfirmationDialog(true)}>Zakończ</Button>
                            </Stack>
                        )
                    }
                </Stack>
                <ConfirmationDialog
                    companionObject={billingPeriod}
                    title={'Czy na pewno zakończyć ten miesiąc?'}
                    message={'Czy na pewno zakończyć ten miesiąc?'}
                    open={showFinishBillingPeriodConfirmationDialog}
                    onConfirm={async () => {
                        await client.clearStore()
                            .then(() => setShowFinishBillingPeriodConfirmationDialog(false))
                            .then(() => finishBillingPeriodMutation({variables: {yearMonth: billingPeriod!.period}}))
                            .then(() => refetch())
                            .then(() => Promise.resolve());
                    }}
                    onCancel={() => {
                        setShowFinishBillingPeriodConfirmationDialog(false);
                        return Promise.resolve();
                    }}/>
        </Stack>
            ;
    } else {
        return <></>;
    }
}
