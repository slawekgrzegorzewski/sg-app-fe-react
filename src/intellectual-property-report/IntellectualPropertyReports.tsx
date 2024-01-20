import {useQuery} from "@apollo/client";
import {AllIpRs, AllIpRsQuery} from "../types";
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Backdrop,
    Box,
    Button,
    CircularProgress,
    Stack
} from "@mui/material";
import {Delete, Edit, ExpandMore} from "@mui/icons-material";
import * as React from "react";
import {useState} from "react";
import {IntellectualPropertyReportEditButtons} from "./IntellectualPropertyReportEditButtons";

const NOT_EXISTING_ID = -1;

export type IntellectualPropertyDTO = {
    id: number;
    description: string
}

export function IntellectualPropertyReports() {
    const {loading, error, data, refetch} = useQuery<AllIpRsQuery>(AllIpRs);
    const [expandedTabId, setExpandedTabId] = useState<number>(-1);
    const [backDropOpen, setBackDropOpen] = useState(false);

    const changeTab = (tabId: number) => {
        setExpandedTabId(tabId === expandedTabId ? NOT_EXISTING_ID : tabId);
    };

    const refresh = () => {
        setBackDropOpen(true);
        refetch().finally(() => setBackDropOpen(false));
    }

    if (loading) {
        return <>Loading...</>
    } else if (error) {
        return <>Error...</>
    } else if (data) {
        if (data.allIPRs.length === 0) {
            return <>No data</>
        }
        if (!expandedTabId) {
            setExpandedTabId(data.allIPRs.length === 0 ? NOT_EXISTING_ID : data.allIPRs[0].id);
            return <></>
        }
        return (
            <Box component="section" sx={{width: 1000, m: 'auto'}}>
                <Backdrop
                    sx={{color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1}}
                    open={backDropOpen}>
                    <CircularProgress color="inherit"/>
                </Backdrop>
                <Stack direction="row">
                    <IntellectualPropertyReportEditButtons
                        showCreate={true}
                        createButtonContent={<>stwórz własność intelektualną</>}
                        afterCreate={refresh}
                    />
                </Stack>

                {
                    [...data.allIPRs].sort((ipr1, ipr2) => ipr2.id - ipr1.id)
                        .map(ipr => (
                            <Accordion key={ipr.id} expanded={expandedTabId === ipr.id}
                                       onChange={() => changeTab(ipr.id)}
                                       disableGutters
                            >
                                <AccordionSummary expandIcon={<ExpandMore/>} sx={{fontWeight: 'bolder'}}>
                                    <Stack direction="row" sx={{width: '100%'}}>
                                        {ipr.description}
                                        <Box sx={{flexGrow: 1}}/>
                                        <IntellectualPropertyReportEditButtons
                                            ipr={ipr}
                                            showEdit={true}
                                            editButtonContent={<Edit/>}
                                            afterEdit={refresh}
                                            showDelete={(ipr.tasks || []).length === 0}
                                            deleteButtonContent={<Delete/>}
                                            afterDelete={refresh}
                                        />
                                    </Stack>
                                </AccordionSummary>
                                <AccordionDetails>
                                    <Stack direction="column">
                                        {(ipr.tasks || []).map(task => (
                                            <div key={task.id}>
                                                {task.description}
                                            </div>
                                        ))}
                                    </Stack>
                                </AccordionDetails>
                            </Accordion>
                        ))
                }</Box>);
    } else {
        return <></>;
    }
}