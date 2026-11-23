import React, {useState} from 'react';
import {ButtonBase, IconButton, Popover, Stack, Typography} from '@mui/material';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import {DateCalendar} from '@mui/x-date-pickers';
import {DateView} from '@mui/x-date-pickers/models';
import {Dayjs} from 'dayjs';
import 'dayjs/locale/pl';

type Props = {
    month: Dayjs;
    onChange: (month: Dayjs) => void;
    disabled?: boolean;
};

export function MonthNavigation({month, onChange, disabled = false}: Props) {
    const [calendarAnchor, setCalendarAnchor] = useState<HTMLElement | null>(null);
    const [calendarMonth, setCalendarMonth] = useState(month);
    const [calendarView, setCalendarView] = useState<DateView>('month');

    function closeCalendar() {
        setCalendarAnchor(null);
    }

    return (
        <Stack
            direction="row"
            alignItems="center"
            justifyContent="center"
            spacing={1}
        >
            <IconButton
                disabled={disabled}
                aria-label="Poprzedni miesiąc"
                onClick={() => onChange(
                        month.subtract(1, 'month'))}
            >
                <NavigateBeforeIcon/>
            </IconButton>
            <ButtonBase
                disabled={disabled}
                aria-label={`Wybierz miesiąc, obecnie ${month.locale('pl').format('MMMM YYYY')}`}
                onClick={event => {
                    setCalendarMonth(month);
                    setCalendarView('month');
                    setCalendarAnchor(event.currentTarget);
                }}
                sx={{borderRadius: 1}}
            >
                <Typography
                    variant="h4"
                    textAlign="center"
                    sx={{minWidth: {xs: 150, sm: 190}, color: 'secondary.main'}}
                >
                    {month.locale('pl').format('MMMM YYYY')}
                </Typography>
            </ButtonBase>
            <Popover
                open={Boolean(calendarAnchor)}
                anchorEl={calendarAnchor}
                onClose={closeCalendar}
                anchorOrigin={{vertical: 'bottom', horizontal: 'center'}}
                transformOrigin={{vertical: 'top', horizontal: 'center'}}
            >
                <DateCalendar
                    disabled={disabled}
                    value={calendarMonth}
                    view={calendarView}
                    views={['year', 'month']}
                    onViewChange={setCalendarView}
                    onChange={selectedMonth => {
                        if (!selectedMonth) {
                            return;
                        }

                        setCalendarMonth(selectedMonth);
                        if (calendarView === 'month') {
                            onChange(selectedMonth.startOf('month'));
                            closeCalendar();
                        }
                    }}
                    sx={{height: 'auto'}}
                />
            </Popover>
            <IconButton
                disabled={disabled}
                aria-label="Następny miesiąc"
                onClick={() => onChange(
                        month.add(1, 'month'))}
            >
                <NavigateNextIcon/>
            </IconButton>
        </Stack>
    );
}
