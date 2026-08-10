import {Chip, Paper, Stack, Typography} from '@mui/material';
import * as React from 'react';
import {
    AutocompleteAsyncEditorField,
    DatePickerEditorField,
    EditorField,
    RegularEditorField,
} from '../utils/forms/Form';
import dayjs from 'dayjs';
import 'dayjs/locale/pl';
import {SearchTasks, SearchTasksQuery, Task, TimeRecord} from '../types';
import {TimeRecordView} from './TimeRecordView';

export const TIME_RECORD_DIALOG_TITLE = 'Edytuj raport czasu';

type Data = {task: Task | null; timeRecord: TimeRecord};

export function timeRecordEditorField(descriptionEditable: boolean): EditorField[] {
    return [
        {
            label: 'Zadanie',
            type: 'AUTOCOMPLETE_ASYNC',
            key: 'task',
            editable: true,
            query: SearchTasks,
            queryToOptionsMapper: (data: SearchTasksQuery) =>
                data.tasks.tasks.map(task => ({id: task.id, description: task.description})),
            getOptionLabel: (object: any) => object.description,
            isOptionEqualToValue: (option: any, value: any) => option.id === value.id,
        } as AutocompleteAsyncEditorField,
        {
            label: 'Data',
            type: 'DATEPICKER',
            key: 'date',
            editable: true,
        } as DatePickerEditorField,
        {
            label: 'Liczba godzin',
            type: 'NUMBER',
            key: 'numberOfHours',
            editable: true,
            additionalProps: {autoComplete: 'off'},
        } as RegularEditorField,
        {
            label: 'Opis',
            type: 'TEXTAREA',
            key: 'description',
            editable: descriptionEditable,
            additionalProps: {autoComplete: 'off'},
        } as RegularEditorField,
    ];
}

export function TimeRecordsList(properties: {
    taskWithTimeRecords: Task[];
    nonIPTimeRecords: TimeRecord[];
    refetchDataCallback: () => void;
}) {
    const {taskWithTimeRecords, nonIPTimeRecords, refetchDataCallback} = properties;
    const timeRecordsByDates: Record<string, Data[]> = {};

    nonIPTimeRecords.forEach(timeRecord => {
        const dateKey = dayjs(timeRecord.date).format('YYYY-MM-DD');
        timeRecordsByDates[dateKey] = timeRecordsByDates[dateKey] || [];
        timeRecordsByDates[dateKey].push({task: null, timeRecord});
    });

    taskWithTimeRecords.forEach(task => {
        (task.timeRecords || []).forEach(timeRecord => {
            const dateKey = dayjs(timeRecord.date).format('YYYY-MM-DD');
            timeRecordsByDates[dateKey] = timeRecordsByDates[dateKey] || [];
            timeRecordsByDates[dateKey].push({
                task,
                timeRecord: {...timeRecord, description: task.description},
            });
        });
    });

    return (
        <Stack component="section" spacing={1.5}>
            {Object.entries(timeRecordsByDates)
                .sort(([left], [right]) => right.localeCompare(left))
                .map(([date, records]) => {
                    const hours = records.reduce((sum, record) => sum + record.timeRecord.numberOfHours, 0);
                    return (
                        <Paper key={date} variant="outlined" sx={{p: {xs: 1.5, sm: 2}}}>
                            <Stack spacing={1}>
                                <Stack direction="row" alignItems="center" gap={1}>
                                    <Typography variant="h4">
                                        {dayjs(date).locale('pl').format('D MMMM YYYY')}
                                    </Typography>
                                    <Chip size="small" variant="outlined" label={`${hours} godz.`} />
                                </Stack>
                                <Stack spacing={0.75}>
                                    {records
                                        .sort((left, right) => left.timeRecord.id - right.timeRecord.id)
                                        .map(record => (
                                            <TimeRecordView
                                                key={record.timeRecord.id}
                                                relatedTask={record.task}
                                                timeRecord={record.timeRecord}
                                                refetchDataCallback={refetchDataCallback}
                                                dialogOptions={{
                                                    title: TIME_RECORD_DIALOG_TITLE,
                                                    editorFields: timeRecordEditorField(!record.task),
                                                }}
                                            />
                                        ))}
                                </Stack>
                            </Stack>
                        </Paper>
                    );
                })}
        </Stack>
    );
}
