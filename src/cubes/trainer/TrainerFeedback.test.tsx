import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import {useMutation, useQuery} from '@apollo/client/react';
import {
    CubeTrainerFeedbackStatus,
    GetCubeTrainerAttemptFeedback,
    RetryCubeTrainerFeedback,
} from '../../types';
import {TrainerFeedback, TrainerFeedbackText} from './TrainerFeedback';

jest.mock('@apollo/client/react', () => ({useMutation: jest.fn(), useQuery: jest.fn()}));

const publicId = '00000000-0000-4000-8000-000000000001';
const feedback = {
    publicId,
    feedbackStatus: CubeTrainerFeedbackStatus.Completed,
    feedback: 'Zaplanuj ostatnią krawędź przed pierwszym ruchem.',
    feedbackError: null,
    feedbackModel: 'test-model',
    feedbackPromptVersion: 'cross-v1',
    feedbackUpdatedAt: '2026-11-16T12:00:00',
};

test('wyświetla zapisaną ocenę oraz model i zachowuje tekst bez interpretowania HTML', () => {
    render(<TrainerFeedbackText attempt={{...feedback, feedback: '<script>test</script>'}}/>);
    expect(screen.getByText('<script>test</script>')).toBeInTheDocument();
    expect(screen.getByText('Model: test-model')).toBeInTheDocument();
});

test('po błędzie pozwala ponowić ocenę zapisanej próby', async () => {
    const retry = jest.fn().mockResolvedValue({});
    const refetch = jest.fn().mockResolvedValue({});
    const stopPolling = jest.fn();
    const startPolling = jest.fn();
    const query = {
        data: {
            cubeTrainerAttempt: {
                ...feedback,
                feedbackStatus: CubeTrainerFeedbackStatus.Failed,
                feedback: null as string | null,
                feedbackError: 'Przekroczony limit API' as string | null,
            }
        },
        refetch,
        stopPolling,
        startPolling,
    };
    (useQuery as unknown as jest.Mock).mockReturnValue(query);
    (useMutation as unknown as jest.Mock).mockReturnValue([retry, {loading: false}]);
    const view = render(<TrainerFeedback publicId={publicId}/>);
    expect(screen.getByText('Przekroczony limit API')).toBeInTheDocument();
    expect(useQuery).toHaveBeenCalledWith(GetCubeTrainerAttemptFeedback,
        {variables: {publicId}, fetchPolicy: 'network-only'});
    expect(useMutation).toHaveBeenCalledWith(RetryCubeTrainerFeedback);
    fireEvent.click(screen.getByRole('button', {name: 'Ponów ocenę'}));
    await waitFor(() => expect(refetch).toHaveBeenCalled());
    expect(retry).toHaveBeenCalledWith({variables: {publicId}});
    query.data.cubeTrainerAttempt = {...feedback};
    view.rerender(<TrainerFeedback publicId={publicId}/>);
    expect(screen.getByText(feedback.feedback)).toBeInTheDocument();
    expect(screen.queryByRole('button', {name: 'Ponów ocenę'})).not.toBeInTheDocument();
    expect(startPolling).not.toHaveBeenCalled();
});
