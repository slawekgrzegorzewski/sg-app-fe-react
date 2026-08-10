import {ErrorDisplay, LoadingIndicator} from '../application/components/QueryState';
import {useResetMutationResults} from '../utils/use-reset-mutation-results';
import {useMutation, useQuery} from '@apollo/client/react';
import {
    CreateIntellectualPropertyReport,
    CreateIntellectualPropertyReportMutation,
    IntellectualPropertiesRecords,
    IntellectualPropertiesRecordsQuery,
    IntellectualProperty,
} from '../types';
import * as React from 'react';
import {useState} from 'react';
import {
    Button,
    Chip,
    FormControl,
    FormControlLabel,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    Stack,
    Switch,
    Typography,
} from '@mui/material';
import {FormDialogButton} from '../utils/buttons/FormDialogButton';
import * as Yup from 'yup';
import dayjs from 'dayjs';
import 'dayjs/locale/pl';
import {ComparatorBuilder} from '../utils/comparator-builder';
import {IntellectualPropertiesList, IPR_EDITOR_FIELDS} from './IntellectualPropertiesList';
import {StandOutText} from '../application/components/StandOutText';
import AddRoundedIcon from '@mui/icons-material/AddRounded';

type IntellectualPropertiesFilter = {
    yearMonthFilter: string;
    onlyReportsWithoutAttachments: boolean;
    onlyReportsHavingTasksWithNoAttachments: boolean;
};

const ALL_MONTHS = 'all';

function formatMonth(yearMonth: string) {
    return dayjs(`${yearMonth}-01`).locale('pl').format('MMMM YYYY');
}

export function IntellectualPropertiesMainPage() {
    const monthSelectLabelId = React.useId();
    const [ipFilter, setIpFilter] = useState<IntellectualPropertiesFilter>({
        yearMonthFilter: dayjs().format('YYYY-MM'),
        onlyReportsWithoutAttachments: false,
        onlyReportsHavingTasksWithNoAttachments: false,
    });
    const [createIntellectualPropertyReportMutation, createIntellectualPropertyReportMutationResult] =
        useMutation<CreateIntellectualPropertyReportMutation>(CreateIntellectualPropertyReport);

    const createIntellectualProperty = async (intellectualProperty: IntellectualProperty): Promise<any> => {
        await createIntellectualPropertyReportMutation({variables: {description: intellectualProperty.description}});
        return refetch();
    };

    const {loading, error, data, refetch} = useQuery<IntellectualPropertiesRecordsQuery>(
        IntellectualPropertiesRecords,
        {
            variables: {
                yearMonthFilter: ipFilter.yearMonthFilter === ALL_MONTHS ? null : ipFilter.yearMonthFilter,
                onlyReportsWithoutAttachments: ipFilter.onlyReportsWithoutAttachments,
                onlyReportsHavingTasksWithNoAttachments: ipFilter.onlyReportsHavingTasksWithNoAttachments,
            },
        }
    );

    useResetMutationResults(createIntellectualPropertyReportMutationResult);

    if (loading) {
        return <LoadingIndicator label="Ładowanie raportów własności intelektualnej..." />;
    }

    if (error) {
        return <ErrorDisplay error={error} onRetry={() => void refetch()} />;
    }

    if (!data) {
        return <></>;
    }

    const yearMonthFilters: string[] = [];
    if (data.intellectualPropertiesRecords?.stats.firstTimeRecord) {
        const fromDate = new Date(data.intellectualPropertiesRecords.stats.firstTimeRecord);
        const lastRecordDate = data.intellectualPropertiesRecords.stats.lastTimeRecord
            ? new Date(data.intellectualPropertiesRecords.stats.lastTimeRecord)
            : new Date();
        const toDate = lastRecordDate.getTime() > Date.now() ? lastRecordDate : new Date();
        fromDate.setDate(1);
        toDate.setDate(1);
        while (fromDate.getTime() <= toDate.getTime()) {
            yearMonthFilters.push(dayjs(fromDate).format('YYYY-MM'));
            fromDate.setMonth(fromDate.getMonth() + 1);
        }
    }
    if (ipFilter.yearMonthFilter !== ALL_MONTHS && !yearMonthFilters.includes(ipFilter.yearMonthFilter)) {
        yearMonthFilters.push(ipFilter.yearMonthFilter);
    }

    const reports = [...(data.intellectualPropertiesRecords?.reports || [])] as IntellectualProperty[];
    reports.sort(ComparatorBuilder.comparing<IntellectualProperty>(report => report.id).build());
    const tasksCount = reports.reduce((sum, report) => sum + (report.tasks?.length || 0), 0);
    const activeAttachmentFilter = ipFilter.onlyReportsWithoutAttachments
        ? 'Raporty bez załączników'
        : ipFilter.onlyReportsHavingTasksWithNoAttachments
          ? 'Zadania bez załączników'
          : null;

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
                            <StandOutText standOutBy="both">Raporty własności intelektualnej</StandOutText>
                        </Typography>
                        <Typography color="text.secondary">
                            Zarządzaj pracami autorskimi, zadaniami i ich załącznikami.
                        </Typography>
                    </Stack>
                    <FormDialogButton
                        title="Dodaj raport własności intelektualnej"
                        buttonContent={
                            <Button variant="contained" color="secondary" startIcon={<AddRoundedIcon />} fullWidth>
                                Dodaj raport IP
                            </Button>
                        }
                        onConfirm={value => createIntellectualProperty(value)}
                        onCancel={() => Promise.resolve()}
                        formProps={{
                            presentation: 'dialog',
                            submitLabel: 'Dodaj raport',
                            submitColor: 'secondary',
                            initialValues: {
                                id: -1,
                                description: '',
                                tasks: [],
                                domain: {publicId: '', name: ''},
                            },
                            fields: IPR_EDITOR_FIELDS,
                            validationSchema: Yup.object({
                                description: Yup.string().trim().required('Wymagane'),
                            }),
                        }}
                    />
                </Stack>

                <Paper component="section" variant="outlined" sx={{p: {xs: 1.5, sm: 2}}}>
                    <Stack spacing={1.5}>
                        <Typography variant="h4">Filtry</Typography>
                        <Stack direction={{xs: 'column', md: 'row'}} alignItems={{md: 'center'}} gap={1.5}>
                            <FormControl size="small" sx={{minWidth: {xs: '100%', md: 210}}}>
                                <InputLabel id={monthSelectLabelId} sx={{color: 'text.primary'}}>
                                    Miesiąc
                                </InputLabel>
                                <Select
                                    labelId={monthSelectLabelId}
                                    value={ipFilter.yearMonthFilter}
                                    onChange={event =>
                                        setIpFilter({...ipFilter, yearMonthFilter: event.target.value as string})
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
                            <FormControlLabel
                                sx={{m: 0}}
                                control={
                                    <Switch
                                        checked={ipFilter.onlyReportsWithoutAttachments}
                                        onChange={event =>
                                            setIpFilter({
                                                ...ipFilter,
                                                onlyReportsWithoutAttachments: event.target.checked,
                                                onlyReportsHavingTasksWithNoAttachments: event.target.checked
                                                    ? false
                                                    : ipFilter.onlyReportsHavingTasksWithNoAttachments,
                                            })
                                        }
                                    />
                                }
                                label="Raporty bez załączników"
                            />
                            <FormControlLabel
                                sx={{m: 0}}
                                control={
                                    <Switch
                                        checked={ipFilter.onlyReportsHavingTasksWithNoAttachments}
                                        onChange={event =>
                                            setIpFilter({
                                                ...ipFilter,
                                                onlyReportsHavingTasksWithNoAttachments: event.target.checked,
                                                onlyReportsWithoutAttachments: event.target.checked
                                                    ? false
                                                    : ipFilter.onlyReportsWithoutAttachments,
                                            })
                                        }
                                    />
                                }
                                label="Zadania bez załączników"
                            />
                        </Stack>
                    </Stack>
                </Paper>

                <Stack component="section" spacing={1.5}>
                    <Stack direction="row" alignItems="center" flexWrap="wrap" gap={1}>
                        <Typography variant="h4">Raporty IP</Typography>
                        <Chip size="small" variant="outlined" label={`Raporty: ${reports.length}`} />
                        <Chip size="small" variant="outlined" label={`Zadania: ${tasksCount}`} />
                        {activeAttachmentFilter && (
                            <Chip size="small" color="secondary" variant="outlined" label={activeAttachmentFilter} />
                        )}
                    </Stack>
                    {reports.length === 0 ? (
                        <Paper variant="outlined" sx={{p: 4}}>
                            <Typography color="text.secondary" textAlign="center">
                                Brak raportów spełniających wybrane kryteria.
                            </Typography>
                        </Paper>
                    ) : (
                        <IntellectualPropertiesList intellectualProperties={reports} refetchDataCallback={refetch} />
                    )}
                </Stack>
            </Stack>
        </Stack>
    );
}
