import {Fragment, useEffect, useState} from 'react';
import {useMutation, useQuery} from '@apollo/client/react';
import {
    Alert,
    Button,
    Chip,
    FormControl,
    InputLabel,
    ListSubheader,
    MenuItem,
    Paper,
    Select,
    Stack,
    Tab,
    Tabs,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    ToggleButton,
    ToggleButtonGroup,
    Typography,
} from '@mui/material';
import dayjs from 'dayjs';
import {ErrorDisplay, LoadingIndicator} from '../../application/components/QueryState';
import {
    CfopStage,
    CubeTrainerDevice,
    CubeTrainerFeedbackStatus,
    CubeTrainerMode,
    GetCubeTrainer,
    GetCubeTrainerQuery,
    GetCubeTrainerQueryVariables,
    PreferCubeTrainerAlgorithm,
    PreferCubeTrainerAlgorithmMutation,
    PreferCubeTrainerAlgorithmMutationVariables,
} from '../../types';
import {formatStopWatchTime} from '../StopWatchDisplay';
import {feedbackPending, TrainerFeedback, TrainerFeedbackText} from './TrainerFeedback';
import {TrainerSession} from './TrainerSession';
import {TrainerCaseThumbnail} from './TrainerCaseThumbnail';

export function CubeTrainerPage() {
    const [stage, setStage] = useState(CfopStage.Cross);
    const [mode, setMode] = useState(CubeTrainerMode.Explore);
    const [caseId, setCaseId] = useState('');
    const [groupName, setGroupName] = useState('__all__');
    const [algorithmId, setAlgorithmId] = useState('');
    const [panel, setPanel] = useState<'catalog' | 'history'>('catalog');
    const [busy, setBusy] = useState(false);
    const [preferenceError, setPreferenceError] = useState<string | null>(null);
    const {
        data,
        loading,
        error,
        refetch,
        startPolling,
        stopPolling
    } = useQuery<GetCubeTrainerQuery, GetCubeTrainerQueryVariables>(
        GetCubeTrainer,
        {variables: {stage}}
    );
    const [preferAlgorithm, {loading: preferring}] = useMutation<
        PreferCubeTrainerAlgorithmMutation,
        PreferCubeTrainerAlgorithmMutationVariables
    >(PreferCubeTrainerAlgorithm);
    const cases = data?.cubeTrainerCases ?? [];
    const groups = Array.from(
        new Set(
            cases.map(
                item => item.groupName ?? '__ungrouped__')));
    const visibleCases = cases.filter(
        item => groupName === '__all__' || (item.groupName ?? '__ungrouped__') === groupName);
    const trainerCase = visibleCases.find(item => item.publicId === caseId) ?? visibleCases[0];
    const algorithm =
        trainerCase?.algorithms.find(item => item.publicId === algorithmId) ??
        trainerCase?.algorithms.find(item => item.publicId === trainerCase.preferredAlgorithmPublicId) ??
        trainerCase?.algorithms[0];
    const attempts = (data?.cubeTrainerAttempts ?? []).filter(
        attempt => stage === CfopStage.Cross || attempt.casePublicId === trainerCase?.publicId
    );

    const waitingForFeedback = attempts.some(attempt => feedbackPending(attempt.feedbackStatus));
    useEffect(() => {
        if (waitingForFeedback) {
            startPolling(3000);
        } else {
            stopPolling();
        }
        return stopPolling;
    }, [waitingForFeedback, startPolling, stopPolling]);

    const prefer = async () => {
        if (!algorithm) return;
        setPreferenceError(null);
        try {
            await preferAlgorithm({variables: {algorithmPublicId: algorithm.publicId}});
            await refetch();
        } catch {
            setPreferenceError('Nie udało się potwierdzić wyboru algorytmu. Spróbuj ponownie.');
        }
    };

    const sidebar = (
        <Stack spacing={2} sx={{minWidth: 0}}>
            {stage !== CfopStage.Cross && (
                <Tabs
                    value={panel}
                    aria-label="Panel trenażera"
                    variant="fullWidth"
                    onChange={(_, value: 'catalog' | 'history') => setPanel(value)}
                >
                    <Tab value="catalog" label="Przypadki i algorytmy"/>
                    <Tab value="history" label={`Historia (${attempts.length})`}/>
                </Tabs>
            )}
            {stage !== CfopStage.Cross && panel === 'catalog'
                ? (
                    <Stack spacing={2}>
                        <Typography variant="h4">
                            Przypadki {stage} <Chip size="small" label={cases.length}/>
                        </Typography>
                        {cases.length === 0 ? (
                            <Alert severity="info">
                                Katalog {stage} jest pusty. Przypadki, ich mieszania i warianty
                                algorytmów pojawią się po uzupełnieniu katalogu.
                            </Alert>
                        ) : (
                            <>
                                {groups.some(group => group !== '__ungrouped__') && (
                                    <FormControl fullWidth>
                                        <InputLabel id="trainer-group-label">Grupa
                                            przypadków</InputLabel>
                                        <Select
                                            labelId="trainer-group-label"
                                            label="Grupa przypadków"
                                            value={groupName}
                                            disabled={busy}
                                            onChange={event => {
                                                setGroupName(event.target.value);
                                                setCaseId('');
                                                setAlgorithmId('');
                                            }}
                                        >
                                            <MenuItem value="__all__">Wszystkie grupy</MenuItem>
                                            {groups.map(group => (
                                                <MenuItem key={group} value={group}>
                                                    {group === '__ungrouped__' ? 'Bez grupy' : group}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                )}
                                <FormControl fullWidth>
                                    <InputLabel id="trainer-case-label">Przypadek</InputLabel>
                                    <Select
                                        labelId="trainer-case-label"
                                        label="Przypadek"
                                        value={trainerCase?.publicId ?? ''}
                                        disabled={busy}
                                        onChange={event => {
                                            setCaseId(event.target.value);
                                            setAlgorithmId('');
                                        }}
                                    >
                                        {groups.filter(
                                            group => groupName === '__all__' || group === groupName).flatMap(
                                            group => [
                                                ...(groups.some(value => value !== '__ungrouped__')
                                                    ? [
                                                        <ListSubheader key={`group-${group}`}>
                                                            {group === '__ungrouped__' ? 'Bez grupy' : group}
                                                        </ListSubheader>,
                                                    ]
                                                    : []),
                                                ...visibleCases.filter(
                                                    item => (item.groupName ?? '__ungrouped__') === group).map(
                                                    item => (
                                                        <MenuItem
                                                            key={item.publicId}
                                                            value={item.publicId}
                                                        >
                                                            <Stack
                                                                direction="row"
                                                                spacing={1.5}
                                                                alignItems="center"
                                                                sx={{minWidth: 0, whiteSpace: 'normal'}}
                                                            >
                                                                <TrainerCaseThumbnail
                                                                    setupAlgorithm={item.setupAlgorithm}
                                                                    stage={stage}
                                                                    label={item.name}
                                                                    size={56}
                                                                />
                                                                <Typography sx={{overflowWrap: 'anywhere'}}>
                                                                    {item.name}
                                                                </Typography>
                                                            </Stack>
                                                        </MenuItem>
                                                    )),
                                            ])}
                                    </Select>
                                </FormControl>
                                {trainerCase?.description && (
                                    <Typography>{trainerCase.description}</Typography>
                                )}
                                <ToggleButtonGroup
                                    exclusive
                                    value={mode}
                                    disabled={busy}
                                    aria-label="Tryb treningu"
                                    onChange={(_, value: CubeTrainerMode | null) => {
                                        if (value) setMode(value);
                                    }}
                                >
                                    <ToggleButton value={CubeTrainerMode.Explore}>
                                        Poznaj i wybierz
                                    </ToggleButton>
                                    <ToggleButton value={CubeTrainerMode.Train}>Ćwicz</ToggleButton>
                                </ToggleButtonGroup>
                                {trainerCase?.algorithms.length === 0 && (
                                    <Alert severity="info">
                                        Ten przypadek nie ma jeszcze wariantów algorytmu.
                                    </Alert>
                                )}
                                {trainerCase?.algorithms.map(variant => {
                                    const results = attempts.filter(
                                        attempt => attempt.algorithmPublicId === variant.publicId
                                    );
                                    const average = results.length
                                        ? Math.round(
                                            results.reduce(
                                                (sum, attempt) => sum + attempt.durationMs,
                                                0
                                            ) / results.length
                                        )
                                        : null;
                                    return (
                                        <Paper
                                            key={variant.publicId}
                                            variant="outlined"
                                            sx={{
                                                p: 2,
                                                borderColor:
                                                    algorithm?.publicId === variant.publicId
                                                        ? 'primary.main'
                                                        : 'divider',
                                            }}
                                        >
                                            <Stack direction="row" spacing={2} alignItems="flex-start">
                                                <TrainerCaseThumbnail
                                                    setupAlgorithm={trainerCase.setupAlgorithm}
                                                    stage={stage}
                                                    label={`${trainerCase.name}, ${variant.name}`}
                                                    size={48}
                                                />
                                                <Stack spacing={1} sx={{minWidth: 0, flex: 1}}>
                                                    <Stack
                                                        direction="row"
                                                        spacing={1}
                                                        alignItems="center"
                                                        flexWrap="wrap"
                                                    >
                                                        <Typography variant="h5">
                                                            {variant.name}
                                                        </Typography>
                                                        {trainerCase.preferredAlgorithmPublicId ===
                                                            variant.publicId && (
                                                                <Chip
                                                                    label="Wybrany do nauki"
                                                                    size="small"
                                                                    color="primary"
                                                                />
                                                            )}
                                                    </Stack>
                                                    <Typography
                                                        sx={{
                                                            fontFamily: 'monospace',
                                                            overflowWrap: 'anywhere',
                                                        }}
                                                    >
                                                        {variant.sequence}
                                                    </Typography>
                                                    {average !== null && (
                                                        <Typography
                                                            variant="body2"
                                                            color="text.secondary"
                                                        >
                                                            Próby: {results.length} · Średnia:{' '}
                                                            {formatStopWatchTime(average)}
                                                        </Typography>
                                                    )}
                                                    <Button
                                                        color="primary"
                                                        variant={
                                                            algorithm?.publicId === variant.publicId
                                                                ? 'contained'
                                                                : 'outlined'
                                                        }
                                                        disabled={busy}
                                                        onClick={() => setAlgorithmId(variant.publicId)}
                                                    >
                                                        {algorithm?.publicId === variant.publicId
                                                            ? 'Wybrany wariant'
                                                            : 'Wypróbuj wariant'}
                                                    </Button>
                                                </Stack>
                                            </Stack>
                                        </Paper>
                                    );
                                })}
                                {algorithm && (
                                    <Button
                                        color="primary"
                                        disabled={
                                            busy ||
                                            preferring ||
                                            trainerCase?.preferredAlgorithmPublicId ===
                                            algorithm.publicId
                                        }
                                        onClick={() => void prefer()}
                                    >
                                        Wybierz ten algorytm do nauki
                                    </Button>
                                )}
                                {preferenceError && <Alert severity="error">{preferenceError}</Alert>}
                            </>
                        )}
                    </Stack>
                )
                : (
                    <Stack spacing={2}>
                        <Typography variant="h4">Historia prób</Typography>
                        <Typography variant="body2" color="text.secondary">
                            Ostatnie 100 zapisanych prób etapu; lista pokazuje wybrany przypadek. Średnie
                            obejmują widoczną historię.
                        </Typography>
                        {attempts.length === 0 ? (
                            <Typography color="text.secondary">Brak zapisanych prób.</Typography>
                        ) : (
                            <TableContainer>
                                <Table size="small" aria-label="Historia prób trenażera">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Data</TableCell>
                                            <TableCell align="right">Czas</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {attempts.map(attempt => (
                                            <Fragment key={attempt.publicId}>
                                                <TableRow>
                                                    <TableCell>
                                                        {dayjs(attempt.performedAt).format('DD.MM.YYYY HH:mm')}
                                                        <Typography variant="caption" display="block">
                                                            {attempt.mode === CubeTrainerMode.Explore ? 'Wypróbowanie' : 'Trening'}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell align="right" sx={{fontVariantNumeric: 'tabular-nums'}}>
                                                        {formatStopWatchTime(attempt.durationMs)}
                                                        {attempt.device !== CubeTrainerDevice.Manual && (
                                                            <Typography variant="caption" display="block">
                                                                {attempt.moveCount} ruchów
                                                                · {attempt.quarterTurnCount} QTM
                                                            </Typography>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                                <TableRow>
                                                    <TableCell colSpan={2} sx={{overflowWrap: 'anywhere'}}>
                                                        {attempt.algorithmSnapshot && (
                                                            <Typography
                                                                variant="body2">Wariant: {attempt.algorithmSnapshot}</Typography>
                                                        )}
                                                        <Typography variant="body2" color="text.secondary">
                                                            {attempt.actualAlgorithm
                                                                ? `Wykonano: ${attempt.actualAlgorithm}`
                                                                : 'Zwykła kostka — bez zapisu ruchów'}
                                                        </Typography>
                                                        {attempt.feedbackStatus === CubeTrainerFeedbackStatus.Failed
                                                            ? <TrainerFeedback publicId={attempt.publicId}/>
                                                            : <TrainerFeedbackText attempt={attempt}/>}
                                                    </TableCell>
                                                </TableRow>
                                            </Fragment>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        )}
                    </Stack>
                )}
        </Stack>
    );

    return (
        <Stack
            alignItems="center"
            sx={{
                width: '100%',
                px: {xs: 1.5, sm: 3, lg: 2},
                py: 2,
                minWidth: 0,
                '& .MuiButton-text:not(.Mui-disabled), & .MuiButton-outlined:not(.Mui-disabled), & .MuiTab-root.Mui-selected':
                    {color: 'text.primary'},
                '& .MuiTabs-indicator': {backgroundColor: 'text.primary'},
            }}
        >
            <Stack spacing={2} sx={{width: '100%', minWidth: 0}}>
                <Typography variant="h3">Trenażer CFOP</Typography>
                <Tabs
                    value={stage}
                    variant="scrollable"
                    scrollButtons="auto"
                    aria-label="Etap treningu CFOP"
                    onChange={(_, value: CfopStage) => {
                        setStage(value);
                        setCaseId('');
                        setGroupName('__all__');
                        setAlgorithmId('');
                        setPreferenceError(null);
                        setPanel('catalog');
                    }}
                >
                    {Object.values(CfopStage).map(value => (
                        <Tab key={value} value={value} label={value} disabled={busy}/>
                    ))}
                </Tabs>
                {loading && !data ? (
                    <LoadingIndicator label="Ładowanie trenażera…"/>
                ) : error && !data ? (
                    <ErrorDisplay error={error} onRetry={() => void refetch()}/>
                ) : (
                    <>
                        {(stage === CfopStage.Cross || (algorithm && trainerCase))
                            ? (
                                <TrainerSession
                                    key={stage}
                                    stage={stage}
                                    mode={stage === CfopStage.Cross ? CubeTrainerMode.Train : mode}
                                    algorithmPublicId={algorithm?.publicId}
                                    algorithmSequence={algorithm?.sequence}
                                    setupAlgorithm={trainerCase?.setupAlgorithm}
                                    sidebar={sidebar}
                                    onSaved={refetch}
                                    onBusyChange={setBusy}
                                />
                            )
                            : <Paper variant="outlined" sx={{p: 2}}>{sidebar}</Paper>}
                    </>
                )}
            </Stack>
        </Stack>
    );
}
