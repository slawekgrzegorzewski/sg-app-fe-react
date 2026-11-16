import {useEffect} from 'react';
import {useMutation, useQuery} from '@apollo/client/react';
import {Alert, Button, Stack, Typography} from '@mui/material';
import {ErrorDisplay, LoadingIndicator} from '../../application/components/QueryState';
import {
    CubeTrainerFeedbackStatus,
    GetCubeTrainerAttemptFeedback,
    GetCubeTrainerAttemptFeedbackQuery,
    GetCubeTrainerAttemptFeedbackQueryVariables,
    RetryCubeTrainerFeedback,
    RetryCubeTrainerFeedbackMutation,
    RetryCubeTrainerFeedbackMutationVariables,
} from '../../types';

type Feedback = GetCubeTrainerAttemptFeedbackQuery['cubeTrainerAttempt'];

export function feedbackPending(status: CubeTrainerFeedbackStatus): boolean {
    return status === CubeTrainerFeedbackStatus.Pending || status === CubeTrainerFeedbackStatus.Running;
}

export function TrainerFeedbackText({attempt}: { attempt: Feedback }) {
    if (attempt.feedbackStatus === CubeTrainerFeedbackStatus.NotRequested) {
        return null;
    }
    return (
        <Stack spacing={1} aria-live="polite" sx={{minWidth: 0}}>
            <Typography variant="subtitle2">Ocena trenera AI</Typography>
            {feedbackPending(attempt.feedbackStatus) && (
                <Typography variant="body2" color="text.secondary">Przygotowywanie oceny…</Typography>
            )}
            {attempt.feedbackStatus === CubeTrainerFeedbackStatus.Failed && (
                <Alert severity="warning">{attempt.feedbackError ?? 'Nie udało się przygotować oceny.'}</Alert>
            )}
            {attempt.feedback && (
                <Typography variant="body2" sx={{whiteSpace: 'pre-wrap', overflowWrap: 'anywhere'}}>
                    {attempt.feedback}
                </Typography>
            )}
            {attempt.feedbackModel && (
                <Typography variant="caption" color="text.secondary">Model: {attempt.feedbackModel}</Typography>
            )}
        </Stack>
    );
}

export function TrainerFeedback({publicId}: { publicId: string }) {
    const {data, error, refetch, startPolling, stopPolling} = useQuery<
        GetCubeTrainerAttemptFeedbackQuery,
        GetCubeTrainerAttemptFeedbackQueryVariables
    >(GetCubeTrainerAttemptFeedback, {variables: {publicId}, fetchPolicy: 'network-only'});
    const [retry, {loading: retrying, error: retryError}] = useMutation<
        RetryCubeTrainerFeedbackMutation,
        RetryCubeTrainerFeedbackMutationVariables
    >(RetryCubeTrainerFeedback);
    const status = data?.cubeTrainerAttempt.feedbackStatus;
    useEffect(() => {
        if (status && feedbackPending(status)) {
            startPolling(2000);
        } else {
            stopPolling();
        }
        return stopPolling;
    }, [status, startPolling, stopPolling]);

    if (error) {
        return <ErrorDisplay error={error} onRetry={() => void refetch()}/>;
    }
    if (!data) {
        return <LoadingIndicator/>;
    }
    return (
        <Stack spacing={1}>
            <TrainerFeedbackText attempt={data.cubeTrainerAttempt}/>
            {retryError && <ErrorDisplay error={retryError}/>}
            {status === CubeTrainerFeedbackStatus.Failed && (
                <Button disabled={retrying} onClick={() => {
                    void retry({variables: {publicId}}).then(() => refetch()).catch(() => undefined);
                }}>Ponów ocenę</Button>
            )}
        </Stack>
    );
}
