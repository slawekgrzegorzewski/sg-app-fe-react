import React from 'react';
import * as XLSX from 'xlsx';
import {saveAs} from "file-saver";
import {Button} from "@mui/material";

export type TableToExcelExportProps = {
    buttonText: string;
    dataGetter: () => any;
    fileName: string;
}

export default function TableToExcelExport({buttonText, dataGetter, fileName}: TableToExcelExportProps) {
    const exportToExcel = () => {
        const worksheet = XLSX.utils.table_to_sheet(dataGetter());
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
        const excelBuffer = XLSX.write(workbook, {bookType: 'xlsx', type: 'array'});
        const blob = new Blob([excelBuffer], {type: 'application/octet-stream'});
        saveAs(blob, `${fileName}.xlsx`);
    };

    return (
        <Button variant={'text'} size={'small'} onClick={exportToExcel}>
            {buttonText}
        </Button>
    );
}