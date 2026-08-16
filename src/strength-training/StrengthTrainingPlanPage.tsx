import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import {
    Autocomplete,
    Button,
    Checkbox,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControlLabel,
    IconButton,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import {useLazyQuery, useMutation, useQuery} from '@apollo/client/react';
import {useEffect, useState} from 'react';
import * as Yup from 'yup';
import {ErrorDisplay, LoadingIndicator} from '../application/components/QueryState';
import {SimpleCrudList} from '../application/components/SimpleCrudList';
import {StandOutText} from '../application/components/StandOutText';
import {EditorField, FormProps} from '../utils/forms/Form';
import {useNavigate, useParams} from 'react-router-dom';
import {
    CreateStrengthTrainingWorkoutTemplate,
    CreateStrengthTrainingWorkoutTemplateMutation,
    DeleteStrengthTrainingWorkoutTemplate,
    DeleteStrengthTrainingWorkoutTemplateMutation,
    GetStrengthTrainingPlan,
    GetStrengthTrainingPlanQuery,
    GetStrengthTrainingExercisePresets,
    GetStrengthTrainingExercisePresetsQuery,
    GetStrengthTrainingExerciseCatalog,
    GetStrengthTrainingExerciseCatalogQuery,
    UpdateStrengthTrainingWorkoutTemplate,
    UpdateStrengthTrainingWorkoutTemplateMutation,
    UpdateStrengthTrainingTemplateExercises,
    UpdateStrengthTrainingTemplateExercisesMutation,
} from '../types';

type Plan = GetStrengthTrainingPlanQuery['strengthTraining']['plans'][number];
type Template = Plan['templates'][number];
type ExercisePreset = GetStrengthTrainingExercisePresetsQuery['strengthTraining']['exercisePresets'][number];
type ExerciseFamily = GetStrengthTrainingExerciseCatalogQuery['strengthTraining']['exerciseFamilies'][number];

type ExerciseDraft = {
    publicId?: string;
    exerciseFamilyPublicId: string;
    name: string;
    variantValuePublicIds: string[];
    variantSignature: string;
    position: number;
    notes: string;
    preset: ExercisePreset | null;
};

type TemplateForm = {
    name: string;
    description: string;
};

const templateFields: EditorField[] = [
    {label: 'Nazwa', type: 'TEXT', key: 'name', editable: true},
    {label: 'Opis', type: 'TEXTAREA', key: 'description', editable: true} as EditorField,
];

function templateForm(template?: Template): Omit<FormProps<TemplateForm>, 'onSave' | 'onCancel'> {
    const editing = Boolean(template);
    return {
        presentation: 'dialog',
        submitLabel: editing ? 'Zapisz zmiany' : 'Dodaj dzień treningowy',
        submitColor: 'secondary',
        validationSchema: Yup.object({
            name: Yup.string().trim().required('Wymagana'),
            description: Yup.string(),
        }),
        initialValues: {name: template?.name ?? '', description: template?.description ?? ''},
        fields: templateFields,
    };
}

function ExercisePresetAutocomplete({
    value,
    onChange,
    label,
}: {
    value: ExercisePreset | null;
    onChange: (preset: ExercisePreset | null) => void;
    label: string;
}) {
    const [searchPresets, {data, loading}] = useLazyQuery<GetStrengthTrainingExercisePresetsQuery>(
        GetStrengthTrainingExercisePresets
    );
    const [inputValue, setInputValue] = useState('');

    useEffect(() => {
        if (inputValue.trim().length < 2) {
            return;
        }
        const timeout = window.setTimeout(() => {
            void searchPresets({variables: {search: inputValue.trim(), limit: 20}});
        }, 300);
        return () => window.clearTimeout(timeout);
    }, [inputValue, searchPresets]);

    const options =
        value && !data?.strengthTraining.exercisePresets.some(preset => preset.publicId === value.publicId)
            ? [value, ...(data?.strengthTraining.exercisePresets ?? [])]
            : (data?.strengthTraining.exercisePresets ?? []);

    return (
        <Autocomplete
            fullWidth
            size="small"
            options={options}
            value={value}
            loading={loading}
            onInputChange={(_, nextValue) => setInputValue(nextValue)}
            onChange={(_, nextValue) => onChange(nextValue)}
            isOptionEqualToValue={(option, selected) => option.publicId === selected.publicId}
            getOptionLabel={preset => `${preset.name} (${preset.variantSignature || 'brak wariantów'})`}
            filterOptions={options => options}
            renderInput={params => <TextField {...params} label={label} />}
        />
    );
}

function CustomExerciseDialog({
    open,
    families,
    initialFamilyPublicId,
    initialVariantValuePublicIds,
    onClose,
    onSave,
}: {
    open: boolean;
    families: ExerciseFamily[];
    initialFamilyPublicId: string;
    initialVariantValuePublicIds: string[];
    onClose: () => void;
    onSave: (family: ExerciseFamily, variantValuePublicIds: string[], variantSignature: string) => void;
}) {
    const [familyPublicId, setFamilyPublicId] = useState(initialFamilyPublicId);
    const [variantValuePublicIds, setVariantValuePublicIds] = useState(initialVariantValuePublicIds);

    useEffect(() => {
        if (open) {
            setFamilyPublicId(initialFamilyPublicId);
            setVariantValuePublicIds(initialVariantValuePublicIds);
        }
    }, [open, initialFamilyPublicId, initialVariantValuePublicIds]);

    const family = families.find(item => item.publicId === familyPublicId) ?? null;
    const variantNames =
        family?.dimensions
            .flatMap(dimension => dimension.allowedValues)
            .filter(value => variantValuePublicIds.includes(value.publicId))
            .map(value => value.variantValue.name) ?? [];

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
            <DialogTitle>Wybierz ćwiczenie i warianty</DialogTitle>
            <DialogContent>
                <Stack spacing={2} sx={{pt: 1}}>
                    <Autocomplete
                        options={families}
                        value={family}
                        onChange={(_, nextFamily) => {
                            setFamilyPublicId(nextFamily?.publicId ?? '');
                            setVariantValuePublicIds([]);
                        }}
                        getOptionLabel={option => option.name}
                        isOptionEqualToValue={(option, selected) => option.publicId === selected.publicId}
                        renderInput={params => <TextField {...params} label="Ćwiczenie główne" />}
                    />
                    {family ? (
                        <Stack spacing={1.5}>
                            {family.dimensions.map(dimension => (
                                <Stack key={dimension.publicId} spacing={0.5}>
                                    <Typography variant="subtitle2">
                                        {dimension.variantDimension.name}
                                        {dimension.required ? ' (wymagany)' : ' (opcjonalny)'}
                                    </Typography>
                                    <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap">
                                        {dimension.allowedValues.map(value => {
                                            const selected = variantValuePublicIds.includes(value.publicId);
                                            return (
                                                <FormControlLabel
                                                    key={value.publicId}
                                                    control={
                                                        <Checkbox
                                                            checked={selected}
                                                            onChange={() =>
                                                                setVariantValuePublicIds(current =>
                                                                    selected
                                                                        ? current.filter(
                                                                              publicId => publicId !== value.publicId
                                                                          )
                                                                        : [...current, value.publicId]
                                                                )
                                                            }
                                                        />
                                                    }
                                                    label={value.variantValue.name}
                                                />
                                            );
                                        })}
                                    </Stack>
                                </Stack>
                            ))}
                            {variantNames.length > 0 && (
                                <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap">
                                    {variantNames.map(name => (
                                        <Chip key={name} size="small" label={name} />
                                    ))}
                                </Stack>
                            )}
                        </Stack>
                    ) : (
                        <Typography color="text.secondary">Wybierz ćwiczenie główne, aby zobaczyć warianty.</Typography>
                    )}
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Anuluj</Button>
                <Button
                    variant="contained"
                    disabled={!family}
                    onClick={() => {
                        if (family) onSave(family, variantValuePublicIds, variantNames.join(', '));
                    }}
                >
                    Użyj ćwiczenia
                </Button>
            </DialogActions>
        </Dialog>
    );
}

function TemplateExerciseRows({
    template,
    families,
    onChange,
}: {
    template: Template;
    families: ExerciseFamily[];
    onChange: (rows: ExerciseDraft[]) => void;
}) {
    const [rows, setRows] = useState<ExerciseDraft[]>(() =>
        template.exercises.map(exercise => ({
            publicId: exercise.publicId,
            exerciseFamilyPublicId: exercise.exerciseFamilyPublicId,
            name: exercise.name,
            variantValuePublicIds: exercise.variantValuePublicIds,
            variantSignature: exercise.variantSignature,
            position: exercise.position,
            notes: exercise.notes ?? '',
            preset: {
                publicId: exercise.publicId,
                exerciseFamilyPublicId: exercise.exerciseFamilyPublicId,
                exerciseFamilyName: '',
                name: exercise.name,
                variantSignature: exercise.variantSignature,
                variantValuePublicIds: exercise.variantValuePublicIds,
            },
        }))
    );
    const [customDialogIndex, setCustomDialogIndex] = useState<number | null>(null);

    const updateRows = (nextRows: ExerciseDraft[]) => {
        setRows(nextRows);
        onChange(nextRows);
    };

    return (
        <Stack spacing={1.5} sx={{mt: 2}}>
            <Typography variant="subtitle1">Ćwiczenia</Typography>
            {rows.map((row, index) => (
                <Stack
                    key={row.publicId ?? `new-${index}`}
                    spacing={1.5}
                    sx={{p: 1.5, border: 1, borderColor: 'divider', borderRadius: 1}}
                >
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="subtitle2">Ćwiczenie {index + 1}</Typography>
                        <IconButton
                            aria-label={`Usuń wiersz ćwiczenia ${index + 1}`}
                            onClick={() => updateRows(rows.filter((_, rowIndex) => rowIndex !== index))}
                        >
                            <DeleteOutlineRoundedIcon />
                        </IconButton>
                    </Stack>
                    <Stack direction={{xs: 'column', sm: 'row'}} spacing={1}>
                        <ExercisePresetAutocomplete
                            label="Ćwiczenie"
                            value={row.preset}
                            onChange={preset => {
                                const nextRows = [...rows];
                                nextRows[index] = {
                                    ...row,
                                    preset,
                                    exerciseFamilyPublicId: preset?.exerciseFamilyPublicId ?? '',
                                    name: preset?.name ?? '',
                                    variantValuePublicIds: preset?.variantValuePublicIds ?? [],
                                    variantSignature: preset?.variantSignature ?? '',
                                };
                                updateRows(nextRows);
                            }}
                        />
                        <TextField
                            fullWidth
                            size="small"
                            label="Warianty"
                            value={row.variantSignature || 'Brak wariantów'}
                            disabled
                        />
                        <Button
                            size="small"
                            variant="text"
                            onClick={() => setCustomDialogIndex(index)}
                            aria-label={`Wybierz ćwiczenie główne dla wiersza ${index + 1}`}
                        >
                            Własne warianty
                        </Button>
                    </Stack>
                    <TextField
                        type="number"
                        size="small"
                        label="Pozycja"
                        value={row.position}
                        onChange={event => {
                            const nextRows = [...rows];
                            nextRows[index] = {...row, position: Number(event.target.value)};
                            updateRows(nextRows);
                        }}
                    />
                    <TextField
                        fullWidth
                        size="small"
                        label="Nazwa"
                        value={row.name}
                        onChange={event => {
                            const nextRows = [...rows];
                            nextRows[index] = {...row, name: event.target.value};
                            updateRows(nextRows);
                        }}
                    />
                    <TextField
                        fullWidth
                        size="small"
                        label="Notatki"
                        value={row.notes}
                        onChange={event => {
                            const nextRows = [...rows];
                            nextRows[index] = {...row, notes: event.target.value};
                            updateRows(nextRows);
                        }}
                    />
                </Stack>
            ))}
            <Button
                variant="outlined"
                startIcon={<AddRoundedIcon />}
                onClick={() =>
                    updateRows([
                        ...rows,
                        {
                            exerciseFamilyPublicId: '',
                            name: '',
                            variantValuePublicIds: [],
                            variantSignature: '',
                            position: rows.length + 1,
                            notes: '',
                            preset: null,
                        },
                    ])
                }
            >
                Dodaj ćwiczenie
            </Button>
            <CustomExerciseDialog
                open={customDialogIndex !== null}
                families={families}
                initialFamilyPublicId={
                    customDialogIndex === null ? '' : (rows[customDialogIndex]?.exerciseFamilyPublicId ?? '')
                }
                initialVariantValuePublicIds={
                    customDialogIndex === null ? [] : (rows[customDialogIndex]?.variantValuePublicIds ?? [])
                }
                onClose={() => setCustomDialogIndex(null)}
                onSave={(family, variantValuePublicIds, variantSignature) => {
                    if (customDialogIndex === null || !rows[customDialogIndex]) return;
                    const nextRows = [...rows];
                    nextRows[customDialogIndex] = {
                        ...rows[customDialogIndex],
                        preset: null,
                        exerciseFamilyPublicId: family.publicId,
                        name: family.name,
                        variantValuePublicIds,
                        variantSignature,
                    };
                    updateRows(nextRows);
                    setCustomDialogIndex(null);
                }}
            />
        </Stack>
    );
}

export function StrengthTrainingPlanPage() {
    const navigate = useNavigate();
    const {param1: planPublicId} = useParams<{param1: string}>() ?? {};
    const {loading, error, data, refetch} = useQuery<GetStrengthTrainingPlanQuery>(GetStrengthTrainingPlan, {
        variables: {planPublicId: planPublicId!},
        skip: !planPublicId,
    });
    const {data: catalogData} = useQuery<GetStrengthTrainingExerciseCatalogQuery>(GetStrengthTrainingExerciseCatalog);
    const [createTemplate] = useMutation<CreateStrengthTrainingWorkoutTemplateMutation>(
        CreateStrengthTrainingWorkoutTemplate
    );
    const [updateTemplate] = useMutation<UpdateStrengthTrainingWorkoutTemplateMutation>(
        UpdateStrengthTrainingWorkoutTemplate
    );
    const [deleteTemplate] = useMutation<DeleteStrengthTrainingWorkoutTemplateMutation>(
        DeleteStrengthTrainingWorkoutTemplate
    );
    const [updateExercises] = useMutation<UpdateStrengthTrainingTemplateExercisesMutation>(
        UpdateStrengthTrainingTemplateExercises
    );
    const [exerciseRows, setExerciseRows] = useState<Record<string, ExerciseDraft[]>>({});

    if (loading) {
        return <LoadingIndicator label="Ładowanie planu treningowego..." />;
    }

    if (error) {
        return <ErrorDisplay error={error} onRetry={() => void refetch()} />;
    }

    const plan = data?.strengthTraining.plans[0];
    if (!plan) {
        return <Typography>Nie znaleziono planu treningowego.</Typography>;
    }

    const saveTemplate = async (value: TemplateForm) => {
        await createTemplate({
            variables: {
                planPublicId: plan.publicId,
                name: value.name.trim(),
                position: plan.templates.length + 1,
                description: value.description.trim() || null,
            },
        });
        await refetch();
    };

    const editTemplate = async (value: TemplateForm, template: Template) => {
        await updateTemplate({
            variables: {
                templatePublicId: template.publicId,
                name: value.name.trim(),
                description: value.description.trim() || null,
            },
        });
        const rows =
            exerciseRows[template.publicId] ??
            template.exercises.map(exercise => ({
                publicId: exercise.publicId,
                exerciseFamilyPublicId: exercise.exerciseFamilyPublicId,
                name: exercise.name,
                variantValuePublicIds: exercise.variantValuePublicIds,
                variantSignature: exercise.variantSignature,
                position: exercise.position,
                notes: exercise.notes ?? '',
                preset: null,
            }));
        await updateExercises({
            variables: {
                templatePublicId: template.publicId,
                exercises: rows
                    .filter(row => row.exerciseFamilyPublicId)
                    .map(row => ({
                        ...(row.publicId ? {publicId: row.publicId} : {}),
                        exerciseFamilyPublicId: row.exerciseFamilyPublicId,
                        name: row.name.trim() || null,
                        variantValuePublicIds: row.variantValuePublicIds,
                        position: row.position,
                        notes: row.notes.trim() || null,
                    })),
            },
        });
        await refetch();
    };

    return (
        <Stack alignItems="center" sx={{width: '100%', px: {xs: 1, sm: 2}, py: 2}}>
            <Stack spacing={3} sx={{width: '100%', maxWidth: 960}}>
                <Button
                    startIcon={<ArrowBackRoundedIcon />}
                    onClick={() => navigate(-1)}
                    sx={{alignSelf: 'flex-start'}}
                >
                    Powrót do planów
                </Button>
                <Stack spacing={1}>
                    <Typography variant="h3">
                        <StandOutText standOutBy="both">{plan.name}</StandOutText>
                    </Typography>
                    <Typography color="text.secondary">{plan.description || 'Bez opisu'}</Typography>
                </Stack>
                <SimpleCrudList<Template>
                    title="Dni treningowe"
                    presentation="settings"
                    emptyStateLabel="Brak dni treningowych."
                    createSettings={{
                        dialogTitle: 'Dodaj dzień treningowy',
                        buttonLabel: 'Dodaj dzień treningowy',
                        onCreate: value => saveTemplate(value as unknown as TemplateForm),
                    }}
                    editSettings={{
                        dialogTitle: 'Edytuj dzień treningowy',
                        onUpdate: (value, template) => editTemplate(value as TemplateForm, template),
                        children: template => (
                            <TemplateExerciseRows
                                template={template}
                                families={catalogData?.strengthTraining.exerciseFamilies ?? []}
                                onChange={rows =>
                                    setExerciseRows(previous => ({...previous, [template.publicId]: rows}))
                                }
                            />
                        ),
                    }}
                    deleteSettings={{
                        showControl: template => template.canDelete,
                        confirmationTitle: template => `Usunąć dzień treningowy „${template.name}”?`,
                        confirmationMessage: 'Dzień treningowy zostanie usunięty. Tej operacji nie można cofnąć.',
                        onDelete: async template => {
                            await deleteTemplate({variables: {publicId: template.publicId}});
                            await refetch();
                        },
                    }}
                    list={plan.templates}
                    idExtractor={template => template.publicId}
                    formSupplier={template => templateForm(template)}
                    entityDisplay={template => (
                        <Stack spacing={0.5} sx={{width: '100%', minWidth: 0}}>
                            <Typography variant="h6">{template.name}</Typography>
                            <Typography variant="body2" color="text.secondary">
                                {template.description || 'Bez opisu'}
                            </Typography>
                            <Stack spacing={0.25} sx={{mt: 0.5}}>
                                {template.exercises.length > 0 ? (
                                    template.exercises.map(exercise => (
                                        <Stack key={exercise.publicId} spacing={0.1}>
                                            <Typography variant="body2">
                                                {exercise.position}. {exercise.name}
                                                {exercise.variantSignature ? ` (${exercise.variantSignature})` : ''}
                                            </Typography>
                                            {exercise.notes && (
                                                <Typography variant="caption" color="text.secondary">
                                                    {exercise.notes}
                                                </Typography>
                                            )}
                                        </Stack>
                                    ))
                                ) : (
                                    <Typography variant="body2" color="text.secondary">
                                        Brak ćwiczeń
                                    </Typography>
                                )}
                            </Stack>
                        </Stack>
                    )}
                    enableDndReorder={false}
                />
            </Stack>
        </Stack>
    );
}
