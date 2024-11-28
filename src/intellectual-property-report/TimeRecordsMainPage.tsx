import {useMutation, useQuery} from "@apollo/client";
import {AssignmentAction, CreateTimeRecord, CreateTimeRecordMutation, TimeRecords, TimeRecordsQuery} from "../types";
import * as React from "react";
import {useState} from "react";
import {emptyTimeRecordEditorProvider, mapTask, mapTimeRecord, NON_EXISTING_ID} from "./model/types";
import {Button, FormControl, InputLabel, MenuItem, Select, Stack} from "@mui/material";
import {FormDialogButton} from "../utils/buttons/FormDialogButton";
import * as Yup from "yup";
import dayjs from "dayjs";
import {TIME_RECORD_DIALOG_TITLE, timeRecordEditorField, TimeRecordsList} from "./TimeRecordsList";

type TimeRecordsFilter = {
    yearMonthFilter: string;
}

export function TimeRecordsMainPage() {
    const noYearMonthFilterLabel = 'wszystkie';
    const timeRecordsFilter: TimeRecordsFilter = {
        yearMonthFilter: dayjs().format("YYYY-MM")
    }
    const [trFilter, setTrFilter] = useState<TimeRecordsFilter>(timeRecordsFilter);

    const {
        loading,
        error,
        data,
        refetch
    } = useQuery<TimeRecordsQuery>(TimeRecords, {
        variables: {
            yearMonthFilter: trFilter.yearMonthFilter === noYearMonthFilterLabel ? null : trFilter.yearMonthFilter
        }
    });

    const [createTimeRecordMutation, createTimeRecordMutationResult] = useMutation<CreateTimeRecordMutation>(CreateTimeRecord);

    const createTimeRecord = async (assignmentAction: AssignmentAction, date: Date, description: string, numberOfHours: number, taskId: number | null): Promise<any> => {
        await createTimeRecordMutation({
            variables: {
                assignmentAction: assignmentAction,
                date: date,
                description: description,
                numberOfHours: numberOfHours,
                taskId: taskId,
            }
        });
        return refetch();
    }

    createTimeRecordMutationResult.called && createTimeRecordMutationResult.reset();

    if (loading) {
        return <>Loading...</>
    } else if (error) {
        return <>Error...</>
    } else if (data) {
        const yearMonthFilters = [];
        if (data.timeRecords?.stats.firstTimeRecord) {
            const fromDate = new Date(data.timeRecords!.stats.firstTimeRecord);
            const now = new Date();
            while (fromDate.getTime() < now.getTime()) {
                yearMonthFilters.push(dayjs(fromDate).format("YYYY-MM"));
                fromDate.setMonth(fromDate.getMonth() + 1);
            }
        }

        const nonIpTimeRecords = data.timeRecords.nonIPTimeRecords!.map((timeRecord) => mapTimeRecord(NON_EXISTING_ID, timeRecord));
        const ipTimeRecords = data.timeRecords.taskWithSelectedTimeRecords!.map(task => mapTask(NON_EXISTING_ID, task));

        const sumOfHours = nonIpTimeRecords.map(tr => tr.numberOfHours).reduce((acc, curr) => acc + curr, 0)
            + ipTimeRecords.flatMap(task => task.timeRecords).map(tr => tr.numberOfHours).reduce((acc, curr) => acc + curr, 0);

        return (
            <Stack direction="column" sx={{width: 1000, m: 'auto'}}>
                <Stack direction="row" justifyContent="space-between">
                    <FormDialogButton
                        title={TIME_RECORD_DIALOG_TITLE}
                        buttonContent={
                            <Button variant={'text'} size={'small'}>
                                stwórz raport czasowy
                            </Button>
                        }
                        onSave={(value) => {
                            let taskId: number | null = value.task?.id;
                            if (taskId === NON_EXISTING_ID)
                                taskId = null;
                            createTimeRecord(taskId ? AssignmentAction.Assign : AssignmentAction.Nop,
                                value.date,
                                value.description,
                                value.numberOfHours,
                                taskId);
                            return Promise.resolve();
                        }}
                        onCancel={() => {
                            return Promise.resolve();
                        }}
                        formProps={{
                            initialValues: emptyTimeRecordEditorProvider(),
                            fields: timeRecordEditorField(true),
                            validationSchema: Yup.object({
                                task: Yup.object(),
                                description: Yup.string()
                            })
                        }}
                    />
                    <FormControl variant="standard" sx={{m: 1, minWidth: 120}}>
                        <InputLabel id="demo-simple-select-standard-label">{sumOfHours + ' godzin w'}</InputLabel>
                        <Select
                            labelId="demo-simple-select-standard-label"
                            id="demo-simple-select-standard"
                            value={trFilter.yearMonthFilter}
                            onChange={event => {
                                trFilter.yearMonthFilter = event.target.value as string;
                                setTrFilter({...trFilter});
                            }}
                            label={sumOfHours + ' godzin w'}
                        >
                            <MenuItem value={noYearMonthFilterLabel}>{noYearMonthFilterLabel}</MenuItem>
                            {yearMonthFilters.map((yearMonthFilter) => (
                                <MenuItem key={yearMonthFilter} value={yearMonthFilter}>{yearMonthFilter}</MenuItem>))}
                        </Select>
                    </FormControl>
                </Stack>

                <TimeRecordsList
                    nonIPTimeRecords={nonIpTimeRecords}
                    taskWithTimeRecords={ipTimeRecords}
                    refetchDataCallback={refetch}/>

            </Stack>);
    } else {
        return <></>;
    }
}