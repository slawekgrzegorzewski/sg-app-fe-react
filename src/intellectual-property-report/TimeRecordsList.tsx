import {Stack} from "@mui/material";
import * as React from "react";
import {AutocompleteAsyncEditorField, EditorField, RegularEditorField} from "../utils/forms/Form";
import {TaskDTO, TimeRecordDTO} from "./model/types";
import dayjs from "dayjs";
import {SearchTasks, SearchTasksQuery} from "../types";
import {TimeRecord} from "./TimeRecord";

export const TIME_RECORD_DIALOG_TITLE = 'Dane raportu czasowego';

type Data = { task: TaskDTO | null, timeRecord: TimeRecordDTO }

export function timeRecordEditorField(descriptionEditable: boolean): EditorField[] {
    return [
        {
            label: 'Zadanie',
            type: 'AUTOCOMPLETE_ASYNC',
            key: 'task',
            editable: true,
            query: SearchTasks,
            additionalProps: {
                sx: {width: '350px'},
            },
            queryToOptionsMapper: (data: SearchTasksQuery) => data.tasks.tasks.map((t: any) => {
                return {
                    id: t.id,
                    description: t.description
                };
            }),
            getOptionLabel:
                (object: any) => object.description,
            isOptionEqualToValue:
                (option: any, value: any) => option.id === value.id
        } as AutocompleteAsyncEditorField,
        {
            label: 'Data',
            type: 'DATEPICKER',
            key: 'date',
            editable: true,
            additionalProps: {
                sx: {width: '200px'},
            }
        } as RegularEditorField,
        {
            label: 'Liczba godzin',
            type: 'NUMBER',
            key: 'numberOfHours',
            editable: true,
            additionalProps: {
                sx: {width: '200px'},
            }
        } as RegularEditorField,
        {
            label: 'Opis',
            type: 'TEXTAREA',
            key: 'description',
            editable: descriptionEditable,
            additionalProps: {
                sx: {width: '200px'},
            }
        } as RegularEditorField
    ]
        ;
}

export function TimeRecordsList(properties: {
    taskWithTimeRecords: TaskDTO[]
    nonIPTimeRecords: TimeRecordDTO[]
    refetchDataCallback: () => void
}) {
    const {taskWithTimeRecords, nonIPTimeRecords, refetchDataCallback} = properties;

    const timeRecordsByDates = nonIPTimeRecords.reduce((collector, timeRecordDTO) => {
        var dateKey = dayjs(timeRecordDTO.date).format("YYYY-MM-DD");
        collector[dateKey] = collector[dateKey] || [];
        collector[dateKey].push({task: null, timeRecord: timeRecordDTO});
        return collector;
    }, Object.create(null));

    taskWithTimeRecords.forEach(taskWithTimeRecords => {
        taskWithTimeRecords.timeRecords.forEach(timeRecord => {
            var dateKey = dayjs(timeRecord.date).format("YYYY-MM-DD");
            timeRecordsByDates[dateKey] = timeRecordsByDates[dateKey] || [];
            timeRecord.description = taskWithTimeRecords.description;
            timeRecordsByDates[dateKey].push({task: taskWithTimeRecords, timeRecord: timeRecord});
        })
    });
    return (<>
        {
            Object.keys(timeRecordsByDates).sort().map(date => {
                return (<Stack key={date}>
                    <b>{date}</b>
                    {timeRecordsByDates[date].sort((data1: Data, data2: Data) => data1.timeRecord.id - data2.timeRecord.id).map((data: Data) => {
                        return (<TimeRecord key={data.timeRecord.id}
                                            relatedTask={data.task}
                                            timeRecord={data.timeRecord}
                                            refetchDataCallback={refetchDataCallback}
                                            dialogOptions={{
                                                title: TIME_RECORD_DIALOG_TITLE,
                                                editorFields: timeRecordEditorField(!data.task)
                                            }}/>);
                    })}
                </Stack>)
            })
        }</>)
}