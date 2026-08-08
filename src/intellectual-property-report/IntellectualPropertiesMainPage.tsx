import {ErrorDisplay} from '../application/components/QueryState';
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
import {IntellectualPropertiesList, IPR_DIALOG_TITLE, IPR_EDITOR_FIELDS} from './IntellectualPropertiesList';
import {
    Button,
    FormControl,
    FormControlLabel,
    FormGroup,
    InputLabel,
    MenuItem,
    Select,
    Stack,
    Switch,
} from '@mui/material';
import {FormDialogButton} from '../utils/buttons/FormDialogButton';
import * as Yup from 'yup';
import dayjs from 'dayjs';
import {ComparatorBuilder} from '../utils/comparator-builder';

type IntellectualPropertiesFilter = {
    yearMonthFilter: string;
    onlyReportsWithoutAttachments: boolean;
    onlyReportsHavingTasksWithNoAttachments: boolean;
};

export function IntellectualPropertiesMainPage() {
    const noYearMonthFilterLabel = 'wszystkie';
    const intellectualPropertiesFilter: IntellectualPropertiesFilter = {
        yearMonthFilter: dayjs().format('YYYY-MM'),
        onlyReportsWithoutAttachments: false,
        onlyReportsHavingTasksWithNoAttachments: false,
    };
    const [ipFilter, setIpFilter] = useState<IntellectualPropertiesFilter>(intellectualPropertiesFilter);
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
                yearMonthFilter: ipFilter.yearMonthFilter === noYearMonthFilterLabel ? null : ipFilter.yearMonthFilter,
                onlyReportsWithoutAttachments: ipFilter.onlyReportsWithoutAttachments,
                onlyReportsHavingTasksWithNoAttachments: ipFilter.onlyReportsHavingTasksWithNoAttachments,
            },
        }
    );

    useResetMutationResults(createIntellectualPropertyReportMutationResult);

    if (loading) {
        return <></>;
    } else if (error) {
        return <ErrorDisplay error={error} />;
    } else if (data) {
        const yearMonthFilters = [];
        if (data.intellectualPropertiesRecords?.stats.firstTimeRecord) {
            const fromDate = new Date(data.intellectualPropertiesRecords!.stats.firstTimeRecord);
            const now = new Date();
            while (fromDate.getTime() < now.getTime()) {
                yearMonthFilters.push(dayjs(fromDate).format('YYYY-MM'));
                fromDate.setMonth(fromDate.getMonth() + 1);
            }
        }
        return (
            <Stack direction="column" sx={{width: 1000, m: 'auto'}}>
                <Stack direction="row" justifyContent="space-between">
                    <FormDialogButton
                        title={IPR_DIALOG_TITLE}
                        buttonContent={
                            <Button variant={'text'} size={'small'} color="secondary">
                                stwórz własność intelektualną
                            </Button>
                        }
                        onConfirm={value => createIntellectualProperty(value)}
                        onCancel={() => {
                            return Promise.resolve();
                        }}
                        formProps={{
                            initialValues: {
                                id: -1,
                                description: '',
                                tasks: [],
                                domain: {
                                    publicId: '',
                                    name: '',
                                },
                            },
                            fields: IPR_EDITOR_FIELDS,
                            validationSchema: Yup.object({}),
                        }}
                    />
                    <FormControl variant="standard" sx={{m: 1, minWidth: 120}}>
                        <InputLabel id="demo-simple-select-standard-label">Miesiąc</InputLabel>
                        <Select
                            labelId="demo-simple-select-standard-label"
                            id="demo-simple-select-standard"
                            value={ipFilter.yearMonthFilter}
                            onChange={event => {
                                setIpFilter({...ipFilter, yearMonthFilter: event.target.value as string});
                            }}
                            label="Miesiąc"
                        >
                            <MenuItem value={noYearMonthFilterLabel}>{noYearMonthFilterLabel}</MenuItem>
                            {yearMonthFilters.map(yearMonthFilter => (
                                <MenuItem key={yearMonthFilter} value={yearMonthFilter}>
                                    {yearMonthFilter}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <FormGroup>
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={ipFilter.onlyReportsWithoutAttachments}
                                    onChange={event => {
                                        setIpFilter({
                                            ...ipFilter,
                                            onlyReportsWithoutAttachments: event.target.checked,
                                            onlyReportsHavingTasksWithNoAttachments: event.target.checked
                                                ? false
                                                : ipFilter.onlyReportsHavingTasksWithNoAttachments,
                                        });
                                    }}
                                />
                            }
                            label="IP bez załączników"
                        />
                    </FormGroup>
                    <FormGroup>
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={ipFilter.onlyReportsHavingTasksWithNoAttachments}
                                    onChange={event => {
                                        setIpFilter({
                                            ...ipFilter,
                                            onlyReportsHavingTasksWithNoAttachments: event.target.checked,
                                            onlyReportsWithoutAttachments: event.target.checked
                                                ? false
                                                : ipFilter.onlyReportsWithoutAttachments,
                                        });
                                    }}
                                />
                            }
                            label="taski bez załączników"
                        />
                    </FormGroup>
                </Stack>

                {(data.intellectualPropertiesRecords?.reports?.length || 0) === 0 ? (
                    <>No data</>
                ) : (
                    <IntellectualPropertiesList
                        intellectualProperties={[
                            ...(data.intellectualPropertiesRecords!.reports! as IntellectualProperty[]),
                        ].sort(ComparatorBuilder.comparing<IntellectualProperty>(ip => ip.id).build())}
                        refetchDataCallback={refetch}
                    />
                )}
            </Stack>
        );
    } else {
        return <></>;
    }
}
