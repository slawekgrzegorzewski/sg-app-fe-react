import {useQuery} from "@apollo/client";
import {AllIpRs, AllIpRsQuery} from "../types";
import {Accordion, AccordionDetails, AccordionSummary, Box, Button, Stack} from "@mui/material";
import {Edit, ExpandMore} from "@mui/icons-material";
import * as React from "react";
import {useState} from "react";

export function IntellectualPropertyReports() {

    const {loading, error, data} = useQuery<AllIpRsQuery>(AllIpRs);
    const [expandedTabId, setExpandedTabId] = useState<number>(-1);
    const notExistingId = -1;
    const changeTab = (tabId: number) => {
        setExpandedTabId(tabId === expandedTabId ? notExistingId : tabId);
    };

    const edit = (e: React.MouseEvent<HTMLElement>) => {
        e.stopPropagation();
    };

    if (loading) {
        return <>Loading...</>
    } else if (error) {
        return <>Error...</>
    } else if (data) {
        if (data.allIPRs.length === 0) {
            return <>No data</>
        }
        if (!expandedTabId) {
            setExpandedTabId(data.allIPRs.length === 0 ? notExistingId : data.allIPRs[0].id);
            return <></>
        }
        return (
            <Box component="section" sx={{width: 1000, m: 'auto'}}>{
                [...data.allIPRs]
                    .sort((ipr1, ipr2) => ipr2.id - ipr1.id)
                    .map(ipr => (
                        <Accordion key={ipr.id} expanded={expandedTabId === ipr.id}
                                   onChange={() => changeTab(ipr.id)}
                                   disableGutters
                        >
                            <AccordionSummary expandIcon={<ExpandMore/>} sx={{fontWeight: 'bolder'}}>
                                <Stack direction="row" sx={{width: '100%'}}>
                                    {ipr.description}
                                    <Box sx={{flexGrow: 1}}/>
                                    <Button onClick={edit}>
                                        <Edit/>
                                    </Button>
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