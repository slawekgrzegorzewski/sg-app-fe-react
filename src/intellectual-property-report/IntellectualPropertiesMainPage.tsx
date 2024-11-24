import {useMutation, useQuery} from "@apollo/client";
import {
    CreateIntellectualPropertyReport,
    CreateIntellectualPropertyReportMutation,
    IntellectualPropertiesRecords,
    IntellectualPropertiesRecordsQuery
} from "../types";
import * as React from "react";
import {emptyIPRProvider, IntellectualPropertyDTO, mapIntellectualProperty} from "./model/types";
import {IntellectualPropertiesList, IPR_DIALOG_TITLE, IPR_EDITOR_FIELDS} from "./IntellectualPropertiesList";
import {useState} from "react";
import {
    Button,
    FormControl,
    FormControlLabel,
    FormGroup,
    InputLabel,
    MenuItem,
    Select,
    Stack,
    Switch
} from "@mui/material";
import {FormDialogButton} from "../utils/buttons/FormDialogButton";
import * as Yup from "yup";

type IntellectualPropertiesFilter = {
    yearMonthFilter: string;
    onlyReportsWithoutAttachments: boolean;
    onlyReportsHavingTasksWithNoAttachments: boolean;
}

export function IntellectualPropertiesMainPage() {
    const noYearMonthFilterLabel = 'wszystkie';
    const intellectualPropertiesFilter: IntellectualPropertiesFilter = {
        yearMonthFilter: noYearMonthFilterLabel,
        onlyReportsWithoutAttachments: false,
        onlyReportsHavingTasksWithNoAttachments: false
    }
    const [ipFilter, setIpFilter] = useState<IntellectualPropertiesFilter>(intellectualPropertiesFilter);
    const [createIntellectualPropertyReportMutation, createIntellectualPropertyReportMutationResult] = useMutation<CreateIntellectualPropertyReportMutation>(CreateIntellectualPropertyReport);

    const createIntellectualProperty = async (intellectualPropertyDTO: IntellectualPropertyDTO): Promise<any> => {
        await createIntellectualPropertyReportMutation({variables: {description: intellectualPropertyDTO.description}});
        return refetch();
    };

    const {
        loading,
        error,
        data,
        refetch
    } = useQuery<IntellectualPropertiesRecordsQuery>(IntellectualPropertiesRecords, {
        variables: {
            yearMonthFilter: ipFilter.yearMonthFilter === noYearMonthFilterLabel ? null : ipFilter.yearMonthFilter,
            onlyReportsWithoutAttachments: ipFilter.onlyReportsWithoutAttachments,
            onlyReportsHavingTasksWithNoAttachments: ipFilter.onlyReportsHavingTasksWithNoAttachments
        },

    });

    createIntellectualPropertyReportMutationResult.called && createIntellectualPropertyReportMutationResult.reset();

    if (loading) {
        return <>Loading...</>
    } else if (error) {
        return <>Error...</>
    } else if (data) {
        const yearMonthFilters = [];
        if (data.intellectualPropertiesRecords?.stats.firstTimeRecord) {
            const fromDate = new Date(data.intellectualPropertiesRecords!.stats.firstTimeRecord);
            const now = new Date();
            while (fromDate.getFullYear() !== now.getFullYear() || fromDate.getMonth() !== now.getMonth()) {
                fromDate.setMonth(fromDate.getMonth() + 1);
                yearMonthFilters.push(fromDate.getFullYear() + '-' + (fromDate.getMonth() + 1).toString().padStart(2, '0'));
            }
        }
        return (
            <Stack direction="column" sx={{width: 1000, m: 'auto'}}>
                <Stack direction="row" justifyContent="space-between">
                    <FormDialogButton
                        title={IPR_DIALOG_TITLE}
                        buttonContent={
                            <Button variant={'text'} size={'small'}>
                                stwórz własność intelektualną
                            </Button>
                        }
                        onSave={(value) => createIntellectualProperty(value)}
                        onCancel={() => {
                            return Promise.resolve();
                        }}
                        formProps={{
                            initialValues: emptyIPRProvider(),
                            fields: IPR_EDITOR_FIELDS,
                            validationSchema: Yup.object({})
                        }}
                    />
                    <FormControl variant="standard" sx={{m: 1, minWidth: 120}}>
                        <InputLabel id="demo-simple-select-standard-label">Miesiąc</InputLabel>
                        <Select
                            labelId="demo-simple-select-standard-label"
                            id="demo-simple-select-standard"
                            value={ipFilter.yearMonthFilter}
                            onChange={event => {
                                ipFilter.yearMonthFilter = event.target.value as string;
                                setIpFilter({...ipFilter});
                            }}
                            label="Miesiąc"
                        >
                            <MenuItem value={noYearMonthFilterLabel}>{noYearMonthFilterLabel}</MenuItem>
                            {yearMonthFilters.map((yearMonthFilter) => (
                                <MenuItem key={yearMonthFilter} value={yearMonthFilter}>{yearMonthFilter}</MenuItem>))}
                        </Select>
                    </FormControl>
                    <FormGroup>
                        <FormControlLabel control={<Switch
                            checked={ipFilter.onlyReportsWithoutAttachments}
                            onChange={event => {
                                ipFilter.onlyReportsWithoutAttachments = event.target.checked;
                                if (ipFilter.onlyReportsWithoutAttachments)
                                    ipFilter.onlyReportsHavingTasksWithNoAttachments = false;
                                setIpFilter({...ipFilter});
                            }}/>}
                                          label="IP bez załączników"/>
                    </FormGroup>
                    <FormGroup>
                        <FormControlLabel control={<Switch
                            checked={ipFilter.onlyReportsHavingTasksWithNoAttachments}
                            onChange={event => {
                                ipFilter.onlyReportsHavingTasksWithNoAttachments = event.target.checked;
                                if (ipFilter.onlyReportsHavingTasksWithNoAttachments)
                                    ipFilter.onlyReportsWithoutAttachments = false;
                                setIpFilter({...ipFilter});
                            }}/>}
                                          label="taski bez załączników"/>
                    </FormGroup>
                </Stack>

                {((data.intellectualPropertiesRecords?.reports?.length || 0) === 0)
                    ? <>No data</>
                    : <IntellectualPropertiesList
                        intellectualProperties={
                            [...data.intellectualPropertiesRecords!.reports!]
                                .sort((ipr1, ipr2) => ipr2.id - ipr1.id)
                                .map(ipr => mapIntellectualProperty(ipr))}
                        refetchDataCallback={refetch}/>}
            </Stack>);
    } else {
        return <></>;
    }
}