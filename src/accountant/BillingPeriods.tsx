import {ErrorDisplay, LoadingIndicator} from '../application/components/QueryState';
import {useLazyQuery, useMutation} from '@apollo/client/react';
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
    Income,
} from '../types';
import React, {useEffect, useState} from 'react';
import {
    Alert,
    AlertTitle,
    Button,
    ButtonBase,
    Chip,
    IconButton,
    Paper,
    Popover,
    Stack,
    Typography,
} from '@mui/material';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import {DateCalendar} from '@mui/x-date-pickers';
import {DateView} from '@mui/x-date-pickers/models';
import dayjs, {Dayjs} from 'dayjs';
import 'dayjs/locale/pl';
import {BillingElementsInCategory} from './BillingElementsInCategory';
import ConfirmationDialog from '../utils/dialogs/ConfirmationDialog';
import {CreateBillingElementButton} from './CreateBillingElementButton';
import {BankTransactionsImporter} from './BankTransactionsImporter';
import {StandOutText} from '../application/components/StandOutText';

const YEAR_MONTH_FORMAT = 'YYYY-MM';

function noCreationBlockers(creationBlockers: BillingPeriodCreationBlockers) {
    return (
        !creationBlockers.alreadyExists &&
        !creationBlockers.unfinishedBillingPeriods &&
        !creationBlockers.notForCurrentMonth
    );
}

function MonthNavigation({month, onChange}: {month: Dayjs; onChange: (month: Dayjs) => void}) {
    const [calendarAnchor, setCalendarAnchor] = useState<HTMLElement | null>(null);
    const [calendarMonth, setCalendarMonth] = useState(month);
    const [calendarView, setCalendarView] = useState<DateView>('month');

    function closeCalendar() {
        setCalendarAnchor(null);
    }

    return (
        <Stack direction="row" alignItems="center" justifyContent="center" spacing={1}>
            <IconButton aria-label="Poprzedni miesiąc" onClick={() => onChange(month.subtract(1, 'month'))}>
                <NavigateBeforeIcon />
            </IconButton>
            <ButtonBase
                aria-label={`Wybierz miesiąc, obecnie ${month.locale('pl').format('MMMM YYYY')}`}
                onClick={event => {
                    setCalendarMonth(month);
                    setCalendarView('month');
                    setCalendarAnchor(event.currentTarget);
                }}
                sx={{borderRadius: 1}}
            >
                <Typography
                    variant="h4"
                    textAlign="center"
                    sx={{minWidth: {xs: 150, sm: 190}, color: 'secondary.main'}}
                >
                    {month.locale('pl').format('MMMM YYYY')}
                </Typography>
            </ButtonBase>
            <Popover
                open={Boolean(calendarAnchor)}
                anchorEl={calendarAnchor}
                onClose={closeCalendar}
                anchorOrigin={{vertical: 'bottom', horizontal: 'center'}}
                transformOrigin={{vertical: 'top', horizontal: 'center'}}
            >
                <DateCalendar
                    value={calendarMonth}
                    view={calendarView}
                    views={['year', 'month']}
                    onViewChange={setCalendarView}
                    onChange={selectedMonth => {
                        if (!selectedMonth) {
                            return;
                        }

                        setCalendarMonth(selectedMonth);
                        if (calendarView === 'month') {
                            onChange(selectedMonth.startOf('month'));
                            closeCalendar();
                        }
                    }}
                    sx={{height: 'auto'}}
                />
            </Popover>
            <IconButton aria-label="Następny miesiąc" onClick={() => onChange(month.add(1, 'month'))}>
                <NavigateNextIcon />
            </IconButton>
        </Stack>
    );
}

function BillingElementsSection<T extends Income | Expense>({
    title,
    categories,
    elementsByCategory,
    type,
    canEdit,
}: {
    title: string;
    categories: string[];
    elementsByCategory: Map<string, T[]>;
    type: 'Income' | 'Expense';
    canEdit: boolean;
}) {
    const numberOfElements = Array.from(elementsByCategory.values()).reduce(
        (total, elements) => total + elements.length,
        0
    );

    return (
        <Paper variant="outlined" sx={{flex: 1, minWidth: 0, p: {xs: 1.5, sm: 2}}}>
            <Stack spacing={1.5}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1}>
                    <Typography variant="h4">{title}</Typography>
                    <Chip size="small" variant="outlined" label={`Liczba pozycji: ${numberOfElements}`} />
                </Stack>
                {categories.length === 0 ? (
                    <Typography color="text.secondary" textAlign="center" sx={{py: 3}}>
                        Brak pozycji w tym miesiącu.
                    </Typography>
                ) : (
                    categories.map(categoryName => (
                        <BillingElementsInCategory
                            key={`${type}: ${categoryName}`}
                            categoryName={categoryName}
                            billingElements={elementsByCategory.get(categoryName) ?? []}
                        />
                    ))
                )}
                {canEdit && <CreateBillingElementButton billingElementType={type} />}
            </Stack>
        </Paper>
    );
}

export function BillingPeriods() {
    const [month, setMonth] = useState(dayjs().startOf('month'));
    const [showFinishBillingPeriodConfirmationDialog, setShowFinishBillingPeriodConfirmationDialog] = useState(false);
    const [performSearch, {loading, error, data, client, refetch}] =
        useLazyQuery<BillingPeriodQueryQuery>(BillingPeriodQuery);
    const [createBillingPeriodMutation] = useMutation<CreateBillingPeriodMutation>(CreateBillingPeriod);
    const [finishBillingPeriodMutation] = useMutation<FinishBillingPeriodMutation>(FinishBillingPeriod);

    useEffect(() => {
        performSearch({variables: {yearMonth: month.format(YEAR_MONTH_FORMAT)}});
    }, [month, performSearch]);

    const billingPeriodResponse = data?.billingPeriod ? (data.billingPeriod as BillingPeriodResponse) : null;
    const billingPeriod = billingPeriodResponse?.billingPeriod
        ? (billingPeriodResponse.billingPeriod as BillingPeriod)
        : null;
    const creationBlockers = billingPeriodResponse?.creationBlockers ?? null;
    const isFinished = Boolean(billingPeriod?.monthSummary);

    const incomesByCategory =
        billingPeriod?.incomes.reduce((elementsByCategory, income) => {
            const incomes = elementsByCategory.get(income.category.name) ?? [];
            incomes.push(income);
            elementsByCategory.set(income.category.name, incomes);
            return elementsByCategory;
        }, new Map<string, Income[]>()) ?? new Map<string, Income[]>();
    const expensesByCategory =
        billingPeriod?.expenses.reduce((elementsByCategory, expense) => {
            const expenses = elementsByCategory.get(expense.category.name) ?? [];
            expenses.push(expense);
            elementsByCategory.set(expense.category.name, expenses);
            return elementsByCategory;
        }, new Map<string, Expense[]>()) ?? new Map<string, Expense[]>();
    const incomeCategories = Array.from(incomesByCategory.keys()).sort();
    const expenseCategories = Array.from(expensesByCategory.keys()).sort();

    const blockerMessages = creationBlockers
        ? [
              creationBlockers.unfinishedBillingPeriods ? 'Poprzedni okres rozliczeniowy nie został zakończony.' : null,
              creationBlockers.notForCurrentMonth ? 'Okres można utworzyć wyłącznie dla bieżącego miesiąca.' : null,
              creationBlockers.alreadyExists ? 'Okres rozliczeniowy dla tego miesiąca już istnieje.' : null,
          ].filter((message): message is string => Boolean(message))
        : [];

    return (
        <Stack alignItems="center" sx={{width: '100%', px: {xs: 1, sm: 2}, py: 2}}>
            <Stack spacing={3} sx={{width: '100%', maxWidth: 960}}>
                <Stack
                    direction={{xs: 'column', sm: 'row'}}
                    alignItems={{xs: 'stretch', sm: 'center'}}
                    justifyContent="space-between"
                    spacing={2}
                >
                    <Typography variant="h3">
                        <StandOutText standOutBy="both">Okresy rozliczeniowe</StandOutText>
                    </Typography>
                    {billingPeriod && (
                        <Chip
                            color={isFinished ? 'default' : 'success'}
                            variant="outlined"
                            size="small"
                            label={isFinished ? 'Okres zakończony' : 'Okres aktywny'}
                            sx={theme => ({
                                alignSelf: {xs: 'flex-start', sm: 'center'},
                                ...(isFinished
                                    ? {}
                                    : {
                                          color:
                                              theme.palette.mode === 'light'
                                                  ? theme.palette.success.dark
                                                  : theme.palette.success.light,
                                          borderColor:
                                              theme.palette.mode === 'light'
                                                  ? theme.palette.success.dark
                                                  : theme.palette.success.light,
                                          fontWeight: 600,
                                      }),
                            })}
                        />
                    )}
                </Stack>

                <MonthNavigation month={month} onChange={setMonth} />

                {loading && <LoadingIndicator label="Ładowanie okresu rozliczeniowego..." />}
                {error && <ErrorDisplay error={error} onRetry={() => void refetch()} />}

                {!loading && !error && billingPeriod && (
                    <>
                        <Stack
                            direction={{xs: 'column', md: 'row'}}
                            spacing={2}
                            alignItems={{xs: 'stretch', md: 'flex-start'}}
                        >
                            <BillingElementsSection
                                title="Dochody"
                                categories={incomeCategories}
                                elementsByCategory={incomesByCategory}
                                type="Income"
                                canEdit={!isFinished}
                            />
                            <BillingElementsSection
                                title="Wydatki"
                                categories={expenseCategories}
                                elementsByCategory={expensesByCategory}
                                type="Expense"
                                canEdit={!isFinished}
                            />
                        </Stack>

                        {!isFinished && (
                            <Stack alignItems="center">
                                <BankTransactionsImporter
                                    onRefetch={() =>
                                        client
                                            .clearStore()
                                            .then(() => refetch())
                                            .then(() => Promise.resolve())
                                    }
                                />
                            </Stack>
                        )}

                        {!isFinished && (
                            <Stack direction="row" justifyContent="flex-end">
                                <Button
                                    color="error"
                                    variant="outlined"
                                    onClick={event => {
                                        event.currentTarget.blur();
                                        setShowFinishBillingPeriodConfirmationDialog(true);
                                    }}
                                >
                                    Zakończ okres
                                </Button>
                            </Stack>
                        )}
                    </>
                )}

                {!loading && !error && !billingPeriod && creationBlockers && noCreationBlockers(creationBlockers) && (
                    <Paper variant="outlined" sx={{p: {xs: 3, sm: 5}, textAlign: 'center'}}>
                        <Stack spacing={2} alignItems="center">
                            <Typography variant="h4">Brak okresu rozliczeniowego</Typography>
                            <Typography color="text.secondary">
                                Utwórz okres, aby rozpocząć rejestrowanie dochodów i wydatków.
                            </Typography>
                            <Button
                                variant="contained"
                                onClick={async () => {
                                    await client.clearStore();
                                    await createBillingPeriodMutation({
                                        variables: {yearMonth: month.format(YEAR_MONTH_FORMAT)},
                                    });
                                    await refetch();
                                }}
                            >
                                Utwórz okres
                            </Button>
                        </Stack>
                    </Paper>
                )}

                {!loading && !error && !billingPeriod && creationBlockers && !noCreationBlockers(creationBlockers) && (
                    <Alert severity="warning">
                        <AlertTitle>Nie można utworzyć tego okresu rozliczeniowego</AlertTitle>
                        {blockerMessages.length > 0 && (
                            <Stack component="ul" sx={{my: 0, pl: 2.5}}>
                                {blockerMessages.map(message => (
                                    <Typography component="li" variant="body2" key={message}>
                                        {message}
                                    </Typography>
                                ))}
                            </Stack>
                        )}
                    </Alert>
                )}
            </Stack>

            <ConfirmationDialog
                companionObject={billingPeriod}
                title="Zakończ okres rozliczeniowy?"
                message={
                    <Stack spacing={1}>
                        <Typography color="text.primary">
                            Okres za{' '}
                            <StandOutText standOutBy="both">{month.locale('pl').format('MMMM YYYY')}</StandOutText>{' '}
                            zostanie zakończony.
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Po zakończeniu nie będzie można dodawać ani edytować dochodów i wydatków w tym okresie.
                        </Typography>
                    </Stack>
                }
                tone="danger"
                confirmLabel="Zakończ okres"
                open={showFinishBillingPeriodConfirmationDialog}
                onConfirm={async () => {
                    await client.clearStore();
                    setShowFinishBillingPeriodConfirmationDialog(false);
                    await finishBillingPeriodMutation({variables: {yearMonth: billingPeriod!.period}});
                    await refetch();
                }}
                onCancel={() => {
                    setShowFinishBillingPeriodConfirmationDialog(false);
                    return Promise.resolve();
                }}
            />
        </Stack>
    );
}
