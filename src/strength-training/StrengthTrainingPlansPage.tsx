import {useMutation, useQuery} from '@apollo/client/react';
import {Stack, Typography} from '@mui/material';
import dayjs, {Dayjs} from 'dayjs';
import * as Yup from 'yup';
import {ErrorDisplay, LoadingIndicator} from '../application/components/QueryState';
import {StandOutText} from '../application/components/StandOutText';
import {SimpleCrudList} from '../application/components/SimpleCrudList';
import {DatePickerEditorField, EditorField, FormProps} from '../utils/forms/Form';
import {useLocation, useNavigate} from 'react-router-dom';
import {
    CreateStrengthTrainingPlan,
    CreateStrengthTrainingPlanMutation,
    DeleteStrengthTrainingPlan,
    DeleteStrengthTrainingPlanMutation,
    GetStrengthTrainingPlans,
    GetStrengthTrainingPlansQuery,
    UpdateStrengthTrainingPlan,
    UpdateStrengthTrainingPlanMutation,
} from '../types';

type Plan = GetStrengthTrainingPlansQuery['strengthTraining']['plans'][number];

type PlanForm = {
    name: string;
    description: string;
    startedAt: Dayjs | null;
    finishedAt: Dayjs | null;
};

const planFormFields: EditorField[] = [
    {label: 'Nazwa', type: 'TEXT', key: 'name', editable: true},
    {label: 'Opis', type: 'TEXTAREA', key: 'description', editable: true} as EditorField,
    {label: 'Początek planu', type: 'DATEPICKER', key: 'startedAt', editable: true} as DatePickerEditorField,
    {label: 'Koniec planu', type: 'DATEPICKER', key: 'finishedAt', editable: true} as DatePickerEditorField,
];

function planForm(plan?: Plan): Omit<FormProps<PlanForm>, 'onSave' | 'onCancel'> {
    const editing = Boolean(plan);
    return {
        presentation: 'dialog',
        submitLabel: editing ? 'Zapisz zmiany' : 'Dodaj plan',
        submitColor: 'secondary',
        validationSchema: Yup.object({
            name: Yup.string().trim().required('Wymagana'),
            description: Yup.string(),
            startedAt: Yup.mixed<Dayjs>().required('Wymagana'),
            finishedAt: Yup.mixed<Dayjs>().nullable(),
        }),
        initialValues: {
            name: plan?.name ?? '',
            description: plan?.description ?? '',
            startedAt: plan?.startedAt ? dayjs(plan.startedAt) : dayjs(),
            finishedAt: plan?.finishedAt ? dayjs(plan.finishedAt) : null,
        },
        fields: editing
            ? planFormFields.map(field => (field.key === 'startedAt' ? {...field, editable: false} : field))
            : planFormFields,
    };
}

function formatDate(value: string | null): string {
    return value ? dayjs(value).format('DD.MM.YYYY') : 'brak';
}

function formatTrainingDaysLabel(count: number): string {
    const lastTwoDigits = count % 100;
    const lastDigit = count % 10;

    if (count === 1) {
        return 'dzień treningowy';
    }
    if (lastDigit >= 2 && lastDigit <= 4 && (lastTwoDigits < 12 || lastTwoDigits > 14)) {
        return 'dni treningowe';
    }
    return 'dni treningowych';
}

export function StrengthTrainingPlansPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const {loading, error, data, refetch} = useQuery<GetStrengthTrainingPlansQuery>(GetStrengthTrainingPlans);
    const [createPlan] = useMutation<CreateStrengthTrainingPlanMutation>(CreateStrengthTrainingPlan);
    const [deletePlan] = useMutation<DeleteStrengthTrainingPlanMutation>(DeleteStrengthTrainingPlan);
    const [updatePlan] = useMutation<UpdateStrengthTrainingPlanMutation>(UpdateStrengthTrainingPlan);

    if (loading) {
        return <LoadingIndicator label="Ładowanie planów treningowych..." />;
    }

    if (error) {
        return <ErrorDisplay error={error} onRetry={() => void refetch()} />;
    }

    if (!data) {
        return <></>;
    }

    const savePlan = async (value: PlanForm) => {
        await createPlan({
            variables: {
                name: value.name.trim(),
                description: value.description.trim() || null,
                startedAt: value.startedAt!.format('YYYY-MM-DD'),
                finishedAt: value.finishedAt?.format('YYYY-MM-DD') ?? null,
            },
        });
        await refetch();
    };

    const editPlan = async (value: PlanForm, plan: Plan) => {
        await updatePlan({
            variables: {
                planPublicId: plan.publicId,
                name: value.name.trim(),
                description: value.description.trim() || null,
                finishedAt: value.finishedAt?.format('YYYY-MM-DD') ?? null,
            },
        });
        await refetch();
    };

    return (
        <Stack alignItems="center" sx={{width: '100%', px: {xs: 1, sm: 2}, py: 2}}>
            <Stack spacing={3} sx={{width: '100%', maxWidth: 960}}>
                <Typography variant="h3">
                    <StandOutText standOutBy="both">Plany treningowe</StandOutText>
                </Typography>
                <SimpleCrudList<Plan>
                    title="Plany"
                    presentation="settings"
                    emptyStateLabel="Brak planów treningowych."
                    createSettings={{
                        dialogTitle: 'Dodaj plan treningowy',
                        buttonLabel: 'Dodaj plan',
                        onCreate: value => savePlan(value as unknown as PlanForm),
                    }}
                    editSettings={{
                        dialogTitle: 'Edytuj plan treningowy',
                        onUpdate: (value, plan) => editPlan(value as PlanForm, plan),
                    }}
                    deleteSettings={{
                        showControl: plan => plan.canDelete,
                        confirmationTitle: plan => `Usunąć plan „${plan.name}”?`,
                        confirmationMessage: 'Plan zostanie usunięty. Tej operacji nie można cofnąć.',
                        onDelete: async plan => {
                            await deletePlan({variables: {publicId: plan.publicId}});
                            await refetch();
                        },
                    }}
                    list={data.strengthTraining.plans}
                    idExtractor={plan => plan.publicId}
                    formSupplier={plan => planForm(plan)}
                    selectEntityListener={plan => navigate(`${location?.pathname ?? '/plans'}/${plan.publicId}`)}
                    entityDisplay={plan => (
                        <Stack spacing={0.5} sx={{width: '100%', minWidth: 0}}>
                            <Typography variant="h6">{plan.name}</Typography>
                            <Typography variant="body2" color="text.secondary">
                                {plan.description || 'Bez opisu'}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                {formatDate(plan.startedAt ?? null)} – {formatDate(plan.finishedAt ?? null)} ·{' '}
                                {plan.templates.length} {formatTrainingDaysLabel(plan.templates.length)}
                            </Typography>
                        </Stack>
                    )}
                    enableDndReorder={false}
                />
            </Stack>
        </Stack>
    );
}
