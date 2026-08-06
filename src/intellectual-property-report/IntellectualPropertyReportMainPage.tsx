import {ErrorDisplay} from "../application/components/QueryState";
import {useResetMutationResults} from "../utils/use-reset-mutation-results";
import {useMutation, useQuery} from "@apollo/client/react";
import {
    AssignCategoryToTimeRecord,
    AssignCategoryToTimeRecordMutation,
    GetIntellectualPropertiesReport,
    GetIntellectualPropertiesReportQuery
} from "../types";
import * as React from "react";
import {useRef, useState} from "react";
import dayjs from "dayjs";
import {FormControl, InputLabel, MenuItem, Select, Stack} from "@mui/material";
import TableToExcelExport from "../utils/ExportExcel";


const borderTop = {borderTop: "2px solid black"};
const borderBottom = {borderBottom: "2px solid black"};
const borderLeft = {borderLeft: "2px solid black"};
const borderRight = {borderRight: "2px solid black"};
const headerBorders = {...borderTop, ...borderRight, ...borderLeft};
const sideBorders = {...borderRight, ...borderLeft};
const footerBorders = {...borderBottom, ...borderRight, ...borderLeft};


export function IntellectualPropertyReportMainPage() {

    const tableRef = useRef(null);

    const [yearFilter, setYearFilter] = useState(dayjs().format("YYYY"));

    const {
        loading,
        error,
        data,
        refetch
    } = useQuery<GetIntellectualPropertiesReportQuery>(GetIntellectualPropertiesReport, {
        variables: {
            year: yearFilter
        }
    });
    const [assignCategoryToTimeRecordMutation, assignCategoryToTimeRecordMutationResult] = useMutation<AssignCategoryToTimeRecordMutation>(AssignCategoryToTimeRecord);


    const updateTimeRecordCategory = async (timeRecordId: number, timeRecordCategoryId: number) => {
        await assignCategoryToTimeRecordMutation({
            variables: {
                timeRecordId: timeRecordId,
                timeRecordCategoryId: timeRecordCategoryId
            }
        });
        refetch();
    }

    useResetMutationResults(assignCategoryToTimeRecordMutationResult);
    if (loading) {
        return <></>
    } else if (error) {
        return <ErrorDisplay error={error}/>
    } else if (data && data.intellectualPropertiesReport) {
        const report = data.intellectualPropertiesReport?.report;
        const availableYearFilters = [...(data.intellectualPropertiesReport.availableYears || [yearFilter])].sort();
        const table = <>
            <table ref={tableRef} style={{textAlign: "left", borderCollapse: "collapse"}}>
                <caption style={{captionSide: 'top', textAlign: 'left'}}>
                    Raport własności intelektualnej za rok {report.year}
                </caption>
                <thead>
                <tr style={headerBorders}>
                    <th colSpan={5}>
                        <>
                            Raporty ze świadczenia usług programistycznych na podstawie umowy z dnia 20-07-2020 z Satago
                            Software
                            Solutions spółka z o.o. w roku {report.year}
                        </>
                    </th>
                </tr>
                <tr style={sideBorders}>
                    <th colSpan={5}>
                        Łączna ilość prac autorskich: {report.countOfDifferentIPs}
                    </th>
                </tr>
                <tr style={sideBorders}>
                    <th colSpan={5}>
                        Liczba godzin: IP: {report?.ipHours ?? 0}, nie IP: {report.nonIPHours}
                    </th>
                </tr>
                <tr style={footerBorders}>
                    <th colSpan={5}>
                        <>
                            Wynagrodzenie z tytułu przeniesienia praw autorskich
                            stanowi {report?.ipPercentage}% wynagrodzenia
                        </>
                    </th>
                </tr>
                <tr style={headerBorders}>
                    <th>Opis zadania</th>
                    <th>Ilość godzin IP</th>
                    <th>Ilość godzin zwykłych</th>
                    <th>Procent IP</th>
                </tr>
                </thead>
                <tbody>
                {
                    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
                        .map(month => [month, report?.year.toString() + "-" + month.toString().padStart(2, "0")] as [number, string])
                        .flatMap(([month, yearMonth]) =>
                            (report?.monthReports ?? [])
                                .filter(monthReport => monthReport.yearMonth === yearMonth)
                                .flatMap(monthReport => [
                                    <tr key={`${yearMonth}-summary`}
                                        style={month === 1 ? sideBorders : headerBorders}>
                                        <td><b>{monthReport.yearMonth}</b></td>
                                        <td><b>{monthReport.ipHours}</b></td>
                                        <td><b>{monthReport.nonIPHours}</b></td>
                                        <td><b>{monthReport.ipPercentage}</b></td>
                                    </tr>,
                                    ...monthReport.timeRecordReports.map((timeRecordReport, index) =>
                                        <tr key={`${yearMonth}-record-${index}`} style={sideBorders}>
                                            <td>{timeRecordReport.description}</td>
                                            <td>{timeRecordReport.ipHours === 0 ? '' : timeRecordReport.ipHours}</td>
                                            <td>{timeRecordReport.nonIPHours === 0 ? '' : timeRecordReport.nonIPHours}</td>
                                            <td></td>
                                        </tr>),
                                    ...monthReport.nonCategorizedTimeRecords.map(timeRecordReport =>
                                        <tr key={`${yearMonth}-uncategorised-${timeRecordReport.id}`}
                                            style={sideBorders}>
                                            <td>{timeRecordReport.description} - {timeRecordReport.numberOfHours} godzin</td>
                                            <td colSpan={3}>
                                                <select
                                                    aria-label={'Kategoria dla: ' + timeRecordReport.description}
                                                    onChange={(event) => updateTimeRecordCategory(timeRecordReport.id, Number(event.target.value))}>
                                                    <option value={''}></option>
                                                    {data.intellectualPropertiesReport?.timeRecordCategories.map(rc => (
                                                        <option key={rc.id} value={rc.id}>
                                                            {rc.name}
                                                        </option>))}
                                                </select>
                                            </td>
                                            <td></td>
                                        </tr>)
                                ])
                        )
                }
                </tbody>
            </table>
        </>
        return <Stack direction="column" sx={{width: 1000, m: 'auto'}}>
            <Stack direction="row" justifyContent="space-between">
                <TableToExcelExport buttonText={'Pobierz jako excel'} dataGetter={() => tableRef.current!}
                                    fileName={'Raport IP za rok ' + yearFilter}/>
                <FormControl variant="standard" sx={{m: 1, minWidth: 120}}>
                    <InputLabel id="demo-simple-select-standard-label">Miesiąc</InputLabel>
                    <Select
                        labelId="demo-simple-select-standard-label"
                        id="demo-simple-select-standard"
                        value={yearFilter}
                        onChange={event => {
                            setYearFilter(event.target.value as string);
                        }}
                        label="Miesiąc"
                    >
                        {availableYearFilters.map((yearMonthFilter) => (
                            <MenuItem key={yearMonthFilter} value={yearMonthFilter}>{yearMonthFilter}</MenuItem>))}
                    </Select>
                </FormControl>
            </Stack>
            {table}
        </Stack>;
    } else {
        return <></>;
    }
}