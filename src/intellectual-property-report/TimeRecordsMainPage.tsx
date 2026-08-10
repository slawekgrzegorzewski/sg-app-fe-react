import {ErrorDisplay, LoadingIndicator} from '../application/components/QueryState';
import {useResetMutationResults} from '../utils/use-reset-mutation-results';
import {useMutation, useQuery} from '@apollo/client/react';
import {
    AssignmentAction,
    CreateTimeRecord,
    CreateTimeRecordMutation,
    Task,
    TimeRecord,
    TimeRecords,
    TimeRecordsQuery,
} from '../types';
import * as React from 'react';
import {useState} from 'react';
import {Button, Chip, FormControl, InputLabel, MenuItem, Paper, Select, Stack, Typography} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import {FormDialogButton} from '../utils/buttons/FormDialogButton';
import * as Yup from 'yup';
import dayjs, {Dayjs} from 'dayjs';
import 'dayjs/locale/pl';
import {timeRecordEditorField, TimeRecordsList} from './TimeRecordsList';
import {StandOutText} from '../application/components/StandOutText';

type TimeRecordsFilter = {
    yearMonthFilter: string;
};

const ALL_MONTHS = 'all';

function formatMonth(yearMonth: string) {
    return dayjs(`${yearMonth}-01`).locale('pl').format('MMMM YYYY');
}

export function TimeRecordsMainPage() {
    const monthSelectLabelId = React.useId();
    const monthSelectInputId = React.useId();
    const [trFilter, setTrFilter] = useState<TimeRecordsFilter>({yearMonthFilter: dayjs().format('YYYY-MM')});

    const {loading, error, data, refetch} = useQuery<TimeRecordsQuery>(TimeRecords, {
        variables: {
            yearMonthFilter: trFilter.yearMonthFilter === ALL_MONTHS ? null : trFilter.yearMonthFilter,
        },
    });

    const [createTimeRecordMutation, createTimeRecordMutationResult] =
        useMutation<CreateTimeRecordMutation>(CreateTimeRecord);

    const createTimeRecord = async (
        assignmentAction: AssignmentAction,
        date: Dayjs,
        description: string,
        numberOfHours: number,
        taskId: number | null
    ): Promise<any> => {
        await createTimeRecordMutation({
            variables: {
                assignmentAction,
                date: date.format('YYYY-MM-DD'),
                description,
                numberOfHours,
                taskId,
            },
        });
        return refetch();
    };

    useResetMutationResults(createTimeRecordMutationResult);

    if (loading) {
        return <LoadingIndicator label="Ładowanie raportów czasu..." />;
    }

    if (error) {
        return <ErrorDisplay error={error} onRetry={() => void refetch()} />;
    }

    if (!data) {
        return <></>;
    }

    const yearMonthFilters: string[] = [];
    if (data.timeRecords?.stats.firstTimeRecord) {
        const fromDate = new Date(data.timeRecords.stats.firstTimeRecord);
        const lastRecordDate = data.timeRecords.stats.lastTimeRecord
            ? new Date(data.timeRecords.stats.lastTimeRecord)
            : new Date();
        const toDate = lastRecordDate.getTime() > Date.now() ? lastRecordDate : new Date();
        fromDate.setDate(1);
        toDate.setDate(1);
        while (fromDate.getTime() <= toDate.getTime()) {
            yearMonthFilters.push(dayjs(fromDate).format('YYYY-MM'));
            fromDate.setMonth(fromDate.getMonth() + 1);
        }
    }
    if (trFilter.yearMonthFilter !== ALL_MONTHS && !yearMonthFilters.includes(trFilter.yearMonthFilter)) {
        yearMonthFilters.push(trFilter.yearMonthFilter);
    }

    const nonIpTimeRecords = (data.timeRecords.nonIPTimeRecords || []) as TimeRecord[];
    const ipTimeRecords = (data.timeRecords.taskWithSelectedTimeRecords || []) as Task[];
    const allTimeRecordsCount =
        nonIpTimeRecords.length + ipTimeRecords.reduce((sum, task) => sum + (task.timeRecords?.length || 0), 0);
    const sumOfHours =
        nonIpTimeRecords.reduce((sum, record) => sum + record.numberOfHours, 0) +
        ipTimeRecords.reduce(
            (sum, task) =>
                sum + (task.timeRecords || []).reduce((taskSum, record) => taskSum + record.numberOfHours, 0),
            0
        );

    return (
        <Stack alignItems="center" sx={{width: '100%', px: {xs: 1, sm: 2}, py: 2}}>
            <Stack spacing={2.5} sx={{width: '100%', maxWidth: 960}}>
                <Stack
                    direction={{xs: 'column', sm: 'row'}}
                    alignItems={{xs: 'stretch', sm: 'center'}}
                    justifyContent="space-between"
                    gap={1.5}
                >
                    <Stack spacing={0.5}>
                        <Typography variant="h3">
                            <StandOutText standOutBy="both">Raporty czasu</StandOutText>
                        </Typography>
                        <Typography color="text.secondary">
                            Rejestruj czas pracy i przypisuj go do zadań własności intelektualnej.
                        </Typography>
                    </Stack>
                    <FormDialogButton
                        title="Dodaj raport czasu"
                        buttonContent={
                            <Button variant="contained" color="secondary" startIcon={<AddRoundedIcon />} fullWidth>
                                Dodaj raport czasu
                            </Button>
                        }
                        onConfirm={value => {
                            const taskId = value.task?.id === -1 ? null : value.task?.id || null;
                            return createTimeRecord(
                                taskId ? AssignmentAction.Assign : AssignmentAction.Nop,
                                value.date,
                                value.description || '',
                                value.numberOfHours,
                                taskId
                            );
                        }}
                        onCancel={() => Promise.resolve()}
                        formProps={{
                            presentation: 'dialog',
                            submitLabel: 'Dodaj raport',
                            submitColor: 'secondary',
                            initialValues: {
                                task: {id: -1, description: ''},
                                id: -1,
                                date: dayjs(),
                                description: '',
                                numberOfHours: 0,
                            },
                            fields: timeRecordEditorField(true),
                            validationSchema: Yup.object({
                                task: Yup.object().nullable(),
                                date: Yup.mixed<Dayjs>().required('Wymagana'),
                                description: Yup.string(),
                                numberOfHours: Yup.number().moreThan(0, 'Wartość musi być większa od zera').required(),
                            }),
                        }}
                    />
                </Stack>

                <Paper component="section" variant="outlined" sx={{p: {xs: 1.5, sm: 2}}}>
                    <Stack
                        direction={{xs: 'column', sm: 'row'}}
                        alignItems={{xs: 'stretch', sm: 'center'}}
                        justifyContent="space-between"
                        gap={1.5}
                    >
                        <Stack direction="row" alignItems="center" flexWrap="wrap" gap={1}>
                            <Typography variant="h4">Podsumowanie</Typography>
                            <Chip size="small" variant="outlined" label={`Wpisy: ${allTimeRecordsCount}`} />
                            <Chip size="small" color="secondary" variant="outlined" label={`${sumOfHours} godz.`} />
                        </Stack>
                        <FormControl size="small" sx={{minWidth: {xs: '100%', sm: 220}}}>
                            <InputLabel
                                id={monthSelectLabelId}
                                htmlFor={monthSelectInputId}
                                sx={{color: 'text.primary'}}
                            >
                                Miesiąc
                            </InputLabel>
                            <Select
                                labelId={monthSelectLabelId}
                                id={`${monthSelectInputId}-display`}
                                name="timeRecordsMonth"
                                inputProps={{id: monthSelectInputId}}
                                value={trFilter.yearMonthFilter}
                                onChange={event =>
                                    setTrFilter({...trFilter, yearMonthFilter: event.target.value as string})
                                }
                                label="Miesiąc"
                            >
                                <MenuItem value={ALL_MONTHS}>Wszystkie miesiące</MenuItem>
                                {yearMonthFilters.reverse().map(yearMonthFilter => (
                                    <MenuItem key={yearMonthFilter} value={yearMonthFilter}>
                                        {formatMonth(yearMonthFilter)}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Stack>
                </Paper>

                {allTimeRecordsCount === 0 ? (
                    <Paper variant="outlined" sx={{p: 4}}>
                        <Typography color="text.secondary" textAlign="center">
                            Brak raportów czasu dla wybranego okresu.
                        </Typography>
                    </Paper>
                ) : (
                    <TimeRecordsList
                        nonIPTimeRecords={nonIpTimeRecords}
                        taskWithTimeRecords={ipTimeRecords}
                        refetchDataCallback={refetch}
                    />
                )}
            </Stack>
        </Stack>
    );
}
