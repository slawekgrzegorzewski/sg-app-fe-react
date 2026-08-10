import {useMutation, useQuery} from '@apollo/client/react';
import {
    Box,
    Chip,
    FormControl,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
} from '@mui/material';
import dayjs from 'dayjs';
import 'dayjs/locale/pl';
import * as React from 'react';
import {useRef, useState} from 'react';
import {ErrorDisplay, LoadingIndicator} from '../application/components/QueryState';
import {StandOutText} from '../application/components/StandOutText';
import {
    AssignCategoryToTimeRecord,
    AssignCategoryToTimeRecordMutation,
    GetIntellectualPropertiesReport,
    GetIntellectualPropertiesReportQuery,
} from '../types';
import TableToExcelExport from '../utils/ExportExcel';
import {useResetMutationResults} from '../utils/use-reset-mutation-results';

type Report = NonNullable<GetIntellectualPropertiesReportQuery['intellectualPropertiesReport']>['report'];
type ReportResponse = NonNullable<GetIntellectualPropertiesReportQuery['intellectualPropertiesReport']>;

function formatMonth(yearMonth: string) {
    return dayjs(`${yearMonth}-01`).locale('pl').format('MMMM YYYY');
}

function AnnualReportTable({
    report,
    response,
    tableRef,
    assigningCategory,
    onCategoryChange,
}: {
    report: Report;
    response: ReportResponse;
    tableRef: React.RefObject<HTMLTableElement | null>;
    assigningCategory: boolean;
    onCategoryChange: (timeRecordId: number, categoryId: number | null) => Promise<void>;
}) {
    return (
        <TableContainer component={Paper} variant="outlined">
            <Table ref={tableRef} size="small" aria-label={`Raport własności intelektualnej za rok ${report.year}`}>
                <caption>Raport własności intelektualnej za rok {report.year}</caption>
                <TableHead>
                    <TableRow>
                        <TableCell sx={{minWidth: 260}}>Opis zadania</TableCell>
                        <TableCell align="right" sx={{minWidth: 110}}>
                            Godziny IP
                        </TableCell>
                        <TableCell align="right" sx={{minWidth: 130}}>
                            Pozostałe godziny
                        </TableCell>
                        <TableCell align="right" sx={{minWidth: 100}}>
                            Udział IP
                        </TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {report.monthReports.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={4} align="center" sx={{py: 4, color: 'text.secondary'}}>
                                Brak danych w wybranym roku.
                            </TableCell>
                        </TableRow>
                    ) : (
                        [...report.monthReports]
                            .sort((left, right) => left.yearMonth.localeCompare(right.yearMonth))
                            .flatMap(monthReport => [
                                <TableRow key={`${monthReport.yearMonth}-summary`} sx={{bgcolor: 'action.hover'}}>
                                    <TableCell component="th" scope="row">
                                        <Typography fontWeight={700} sx={{textTransform: 'capitalize'}}>
                                            {formatMonth(monthReport.yearMonth)}
                                        </Typography>
                                    </TableCell>
                                    <TableCell align="right" sx={{fontWeight: 700}}>
                                        {monthReport.ipHours}
                                    </TableCell>
                                    <TableCell align="right" sx={{fontWeight: 700}}>
                                        {monthReport.nonIPHours}
                                    </TableCell>
                                    <TableCell align="right" sx={{fontWeight: 700}}>
                                        {monthReport.ipPercentage}%
                                    </TableCell>
                                </TableRow>,
                                ...monthReport.timeRecordReports.map((timeRecordReport, index) => (
                                    <TableRow key={`${monthReport.yearMonth}-record-${index}`}>
                                        <TableCell sx={{overflowWrap: 'anywhere'}}>
                                            {timeRecordReport.description}
                                        </TableCell>
                                        <TableCell align="right">
                                            {timeRecordReport.ipHours === 0 ? '—' : timeRecordReport.ipHours}
                                        </TableCell>
                                        <TableCell align="right">
                                            {timeRecordReport.nonIPHours === 0 ? '—' : timeRecordReport.nonIPHours}
                                        </TableCell>
                                        <TableCell align="right">—</TableCell>
                                    </TableRow>
                                )),
                                ...monthReport.nonCategorizedTimeRecords.map(timeRecord => {
                                    const categoryLabelId = `category-${timeRecord.id}-label`;
                                    const categoryInputId = `category-${timeRecord.id}-input`;
                                    return (
                                        <TableRow key={`${monthReport.yearMonth}-uncategorized-${timeRecord.id}`}>
                                            <TableCell sx={{overflowWrap: 'anywhere'}}>
                                                <Stack spacing={0.25}>
                                                    <Typography>{timeRecord.description || 'Bez opisu'}</Typography>
                                                    <Typography variant="body2" color="text.secondary">
                                                        {timeRecord.numberOfHours} godz. · bez kategorii
                                                    </Typography>
                                                </Stack>
                                            </TableCell>
                                            <TableCell colSpan={3}>
                                                <FormControl size="small" fullWidth sx={{minWidth: 180}}>
                                                    <InputLabel
                                                        id={categoryLabelId}
                                                        htmlFor={categoryInputId}
                                                        sx={{color: 'text.primary'}}
                                                    >
                                                        Kategoria
                                                    </InputLabel>
                                                    <Select
                                                        labelId={categoryLabelId}
                                                        id={`category-${timeRecord.id}-display`}
                                                        name={`timeRecordCategory-${timeRecord.id}`}
                                                        inputProps={{id: categoryInputId}}
                                                        label="Kategoria"
                                                        value=""
                                                        disabled={assigningCategory}
                                                        onChange={event =>
                                                            void onCategoryChange(
                                                                timeRecord.id,
                                                                event.target.value === ''
                                                                    ? null
                                                                    : Number(event.target.value)
                                                            )
                                                        }
                                                    >
                                                        <MenuItem value="">
                                                            <em>Wybierz kategorię</em>
                                                        </MenuItem>
                                                        {response.timeRecordCategories.map(category => (
                                                            <MenuItem key={category.id} value={category.id}>
                                                                {category.name}
                                                            </MenuItem>
                                                        ))}
                                                    </Select>
                                                </FormControl>
                                            </TableCell>
                                        </TableRow>
                                    );
                                }),
                            ])
                    )}
                </TableBody>
            </Table>
        </TableContainer>
    );
}

export function IntellectualPropertyReportMainPage() {
    const tableRef = useRef<HTMLTableElement>(null);
    const yearSelectLabelId = React.useId();
    const yearSelectInputId = React.useId();
    const [yearFilter, setYearFilter] = useState(dayjs().format('YYYY'));
    const {loading, error, data, refetch} = useQuery<GetIntellectualPropertiesReportQuery>(
        GetIntellectualPropertiesReport,
        {variables: {year: yearFilter}}
    );
    const [assignCategoryToTimeRecordMutation, assignCategoryToTimeRecordMutationResult] =
        useMutation<AssignCategoryToTimeRecordMutation>(AssignCategoryToTimeRecord);

    const updateTimeRecordCategory = async (timeRecordId: number, timeRecordCategoryId: number | null) => {
        await assignCategoryToTimeRecordMutation({variables: {timeRecordId, timeRecordCategoryId}});
        await refetch();
    };

    useResetMutationResults(assignCategoryToTimeRecordMutationResult);

    if (loading) {
        return <LoadingIndicator label="Ładowanie raportu rocznego..." />;
    }

    if (error) {
        return <ErrorDisplay error={error} onRetry={() => void refetch()} />;
    }

    if (!data?.intellectualPropertiesReport) {
        return <></>;
    }

    const response = data.intellectualPropertiesReport;
    const report = response.report;
    const availableYears = Array.from(new Set([...(response.availableYears || []), Number(yearFilter)])).sort(
        (left, right) => right - left
    );

    return (
        <Stack alignItems="center" sx={{width: '100%', px: {xs: 1, sm: 2}, py: 2}}>
            <Stack spacing={2.5} sx={{width: '100%', maxWidth: 1080}}>
                <Stack
                    direction={{xs: 'column', sm: 'row'}}
                    alignItems={{xs: 'stretch', sm: 'center'}}
                    justifyContent="space-between"
                    gap={1.5}
                >
                    <Stack spacing={0.5}>
                        <Typography variant="h3">
                            <StandOutText standOutBy="both">Raporty roczne</StandOutText>
                        </Typography>
                        <Typography color="text.secondary">
                            Podsumowanie czasu pracy i udziału własności intelektualnej w rozliczeniu rocznym.
                        </Typography>
                    </Stack>
                    <Box
                        sx={{
                            '& .MuiButton-root': {
                                minHeight: 40,
                                px: 2,
                                border: 1,
                                borderColor: 'divider',
                            },
                        }}
                    >
                        <TableToExcelExport
                            buttonText="Pobierz jako Excel"
                            dataGetter={() => tableRef.current!}
                            fileName={`Raport IP za rok ${yearFilter}`}
                        />
                    </Box>
                </Stack>

                <Paper component="section" variant="outlined" sx={{p: {xs: 1.5, sm: 2}}}>
                    <Stack
                        direction={{xs: 'column', md: 'row'}}
                        justifyContent="space-between"
                        alignItems={{xs: 'stretch', md: 'center'}}
                        gap={1.5}
                    >
                        <Stack direction="row" flexWrap="wrap" gap={1}>
                            <Chip variant="outlined" label={`Prace autorskie: ${report.countOfDifferentIPs}`} />
                            <Chip color="secondary" variant="outlined" label={`IP: ${report.ipHours} godz.`} />
                            <Chip variant="outlined" label={`Pozostałe: ${report.nonIPHours} godz.`} />
                            <Chip variant="outlined" label={`Udział IP: ${report.ipPercentage}%`} />
                        </Stack>
                        <FormControl size="small" sx={{minWidth: {xs: '100%', md: 150}}}>
                            <InputLabel id={yearSelectLabelId} htmlFor={yearSelectInputId} sx={{color: 'text.primary'}}>
                                Rok
                            </InputLabel>
                            <Select
                                labelId={yearSelectLabelId}
                                id={`${yearSelectInputId}-display`}
                                name="intellectualPropertyReportYear"
                                inputProps={{id: yearSelectInputId}}
                                value={yearFilter}
                                onChange={event => setYearFilter(event.target.value as string)}
                                label="Rok"
                            >
                                {availableYears.map(year => (
                                    <MenuItem key={year} value={year.toString()}>
                                        {year}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Stack>
                </Paper>

                <Paper component="section" variant="outlined" sx={{p: {xs: 1.5, sm: 2}}}>
                    <Typography variant="h4" gutterBottom>
                        Raport za {report.year} rok
                    </Typography>
                    <Typography color="text.secondary">
                        Usługi programistyczne świadczone na podstawie umowy z Satago Software Solutions sp. z o.o.
                    </Typography>
                </Paper>

                <AnnualReportTable
                    report={report}
                    response={response}
                    tableRef={tableRef}
                    assigningCategory={assignCategoryToTimeRecordMutationResult.loading}
                    onCategoryChange={updateTimeRecordCategory}
                />
            </Stack>
        </Stack>
    );
}
