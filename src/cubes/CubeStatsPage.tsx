import {useQuery} from '@apollo/client/react';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
    Button,
    ButtonBase,
    FormControl,
    IconButton,
    InputLabel,
    MenuItem,
    Paper,
    Popover,
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
import {DateCalendar} from '@mui/x-date-pickers';
import {DateView} from '@mui/x-date-pickers/models';
import dayjs, {Dayjs} from 'dayjs';
import 'dayjs/locale/pl';
import {useState} from 'react';
import {ErrorDisplay, LoadingIndicator} from '../application/components/QueryState';
import {StandOutText} from '../application/components/StandOutText';
import {CubeType, GetCubeStats, GetCubeStatsQuery} from '../types';
import {CUBE_TYPE_OPTIONS} from './cube-types';

const YEAR_MONTH_FORMAT = 'YYYY-MM';

type CubeDayStats = GetCubeStatsQuery['cubeResults']['stats'][number];
type CubeBestResult = GetCubeStatsQuery['cubeResults']['topTenAllTime'][number];

export function formatCubeTime(timeInMillis?: number | null): string {
    if (timeInMillis === null || timeInMillis === undefined) {
        return '—';
    }

    const minutes = Math.floor(timeInMillis / 60_000);
    const seconds = Math.floor(timeInMillis / 1_000) % 60;
    const milliseconds = timeInMillis % 1_000;

    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds
        .toString()
        .padStart(3, '0')}`;
}

function minimum(values: Array<number | null | undefined>): number | null {
    const availableValues = values.filter((value): value is number => value !== null && value !== undefined);
    return availableValues.length > 0 ? Math.min(...availableValues) : null;
}

export function summarizeCubeStats(stats: CubeDayStats[]) {
    return {
        numberOfTries: stats.reduce((total, day) => total + day.numberOfTries, 0),
        activeDays: stats.filter(day => day.numberOfTries > 0).length,
        bestTime: minimum(stats.map(day => day.min)),
        bestAo5: minimum(stats.map(day => day.minAo5)),
    };
}

function StatCard({label, value}: {label: string; value: string | number}) {
    return (
        <Paper variant="outlined" sx={{flex: 1, minWidth: 145, px: 2, py: 1.5}}>
            <Typography variant="caption" color="text.secondary">
                {label}
            </Typography>
            <Typography variant="h4" sx={{mt: 0.5, fontVariantNumeric: 'tabular-nums'}}>
                {value}
            </Typography>
        </Paper>
    );
}

function TopTenResults({results}: {results: CubeBestResult[]}) {
    const [expanded, setExpanded] = useState(false);
    const orderedResults = [...results].sort((left, right) => left.timeInMillis - right.timeInMillis).slice(0, 10);
    const hasMoreResults = orderedResults.length > 3;
    const visibleResults = expanded ? orderedResults : orderedResults.slice(0, 3);

    return (
        <Stack spacing={1.5}>
            <Typography variant="h4">Top 10 wszech czasów</Typography>
            {orderedResults.length === 0 ? (
                <Paper variant="outlined" sx={{p: 3, textAlign: 'center'}}>
                    <Typography color="text.secondary">Brak zapisanych wyników.</Typography>
                </Paper>
            ) : (
                <Stack spacing={1}>
                    <TableContainer component={Paper} variant="outlined">
                        <Table size="small" aria-label="Top 10 wyników wszech czasów">
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{width: 80}}>Miejsce</TableCell>
                                    <TableCell align="right">Wynik</TableCell>
                                    <TableCell align="right">Data</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {visibleResults.map((result, index) => (
                                    <TableRow key={`${result.date}-${result.timeInMillis}`}>
                                        <TableCell component="th" scope="row">
                                            <StandOutText standOutBy={index < 3 ? 'both' : 'bold'}>
                                                {index + 1}.
                                            </StandOutText>
                                        </TableCell>
                                        <TableCell align="right" sx={{fontVariantNumeric: 'tabular-nums'}}>
                                            {formatCubeTime(result.timeInMillis)}
                                        </TableCell>
                                        <TableCell align="right" sx={{whiteSpace: 'nowrap'}}>
                                            {dayjs(result.date).locale('pl').format('D MMMM YYYY, HH:mm')}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                    {hasMoreResults && (
                        <Button
                            aria-expanded={expanded}
                            endIcon={expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                            onClick={() => setExpanded(current => !current)}
                            sx={{alignSelf: 'center'}}
                        >
                            {expanded ? 'Ukryj' : 'Pokaż'} miejsca 4–{orderedResults.length}
                        </Button>
                    )}
                </Stack>
            )}
        </Stack>
    );
}

function MonthNavigation({month, onChange}: {month: Dayjs; onChange: (month: Dayjs) => void}) {
    const isCurrentMonth = month.isSame(dayjs(), 'month');
    const [calendarAnchor, setCalendarAnchor] = useState<HTMLElement | null>(null);
    const [calendarMonth, setCalendarMonth] = useState(month);
    const [calendarView, setCalendarView] = useState<DateView>('month');

    function closeCalendar() {
        setCalendarAnchor(null);
    }

    return (
        <Stack direction="row" alignItems="center" justifyContent="center" spacing={1}>
            <IconButton aria-label="Poprzedni miesiąc" onClick={() => onChange(month.subtract(1, 'month'))}>
                <NavigateBeforeIcon />
            </IconButton>
            <ButtonBase
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
                    value={calendarMonth}
                    view={calendarView}
                    views={['year', 'month']}
                    maxDate={dayjs()}
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
                aria-label="Następny miesiąc"
                disabled={isCurrentMonth}
                onClick={() => onChange(month.add(1, 'month'))}
            >
                <NavigateNextIcon />
            </IconButton>
        </Stack>
    );
}

export function CubeStatsPage() {
    const [cubeType, setCubeType] = useState<CubeType>(CubeType.Three);
    const [month, setMonth] = useState(dayjs().startOf('month'));
    const {loading, error, data, refetch} = useQuery<GetCubeStatsQuery>(GetCubeStats, {
        variables: {
            cubeType,
            month: month.format(YEAR_MONTH_FORMAT),
        },
    });

    const stats = data?.cubeResults.stats ?? [];
    const summary = summarizeCubeStats(stats);

    return (
        <Stack alignItems="center" sx={{width: '100%', px: {xs: 1, sm: 2}, py: 2}}>
            <Stack spacing={3} sx={{width: '100%', maxWidth: 960}}>
                <Stack
                    direction={{xs: 'column', sm: 'row'}}
                    alignItems={{xs: 'stretch', sm: 'center'}}
                    justifyContent="space-between"
                    spacing={2}
                >
                    <Typography variant="h3">
                        <StandOutText standOutBy="both">Statystyki kostek</StandOutText>
                    </Typography>
                    <FormControl variant="filled" size="small" sx={{minWidth: 180}}>
                        <InputLabel id="cube-type-label">Rodzaj kostki</InputLabel>
                        <Select
                            labelId="cube-type-label"
                            id="cube-type"
                            value={cubeType}
                            onChange={event => setCubeType(event.target.value as CubeType)}
                        >
                            {CUBE_TYPE_OPTIONS.map(option => (
                                <MenuItem key={option.value} value={option.value}>
                                    {option.label}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Stack>

                {loading && <LoadingIndicator label="Ładowanie statystyk..." />}
                {error && <ErrorDisplay error={error} onRetry={() => void refetch()} />}
                {!loading && !error && <TopTenResults key={cubeType} results={data?.cubeResults.topTenAllTime ?? []} />}

                <MonthNavigation month={month} onChange={setMonth} />

                {!loading && !error && (
                    <>
                        <Stack direction="row" flexWrap="wrap" gap={1.5}>
                            <StatCard label="Liczba prób" value={summary.numberOfTries} />
                            <StatCard label="Aktywne dni" value={summary.activeDays} />
                            <StatCard label="Najlepszy czas" value={formatCubeTime(summary.bestTime)} />
                            <StatCard label="Najlepsze Ao5" value={formatCubeTime(summary.bestAo5)} />
                        </Stack>

                        <Typography variant="h4">Statystyki dzienne</Typography>

                        {stats.length === 0 ? (
                            <Paper variant="outlined" sx={{p: 4, textAlign: 'center'}}>
                                <Typography color="text.secondary">Brak wyników dla wybranego miesiąca.</Typography>
                            </Paper>
                        ) : (
                            <TableContainer component={Paper} variant="outlined">
                                <Table size="small" aria-label="Dzienne statystyki kostki">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Data</TableCell>
                                            <TableCell align="right">Próby</TableCell>
                                            <TableCell align="right">Najlepszy</TableCell>
                                            <TableCell align="right">Najgorszy</TableCell>
                                            <TableCell align="right">Ao5</TableCell>
                                            <TableCell align="right">Ao30</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {[...stats]
                                            .sort((left, right) => left.day.localeCompare(right.day))
                                            .map(day => (
                                                <TableRow
                                                    key={day.day}
                                                    sx={{'&:last-child td, &:last-child th': {border: 0}}}
                                                >
                                                    <TableCell component="th" scope="row" sx={{whiteSpace: 'nowrap'}}>
                                                        {dayjs(day.day).locale('pl').format('D MMMM')}
                                                    </TableCell>
                                                    <TableCell align="right">{day.numberOfTries}</TableCell>
                                                    <TableCell align="right">{formatCubeTime(day.min)}</TableCell>
                                                    <TableCell align="right">{formatCubeTime(day.max)}</TableCell>
                                                    <TableCell align="right">{formatCubeTime(day.minAo5)}</TableCell>
                                                    <TableCell align="right">{formatCubeTime(day.minAo30)}</TableCell>
                                                </TableRow>
                                            ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        )}
                    </>
                )}
            </Stack>
        </Stack>
    );
}
