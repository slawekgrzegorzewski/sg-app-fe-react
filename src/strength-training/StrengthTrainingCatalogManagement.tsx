import {useMutation} from '@apollo/client/react';
import {useState} from 'react';
import * as Yup from 'yup';
import {
    Button,
    Checkbox,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControlLabel,
    Stack,
    Typography,
} from '@mui/material';
import {
    AssignStrengthTrainingDimensionToFamily,
    AssignStrengthTrainingDimensionToFamilyMutation,
    CreateStrengthTrainingExerciseFamily,
    CreateStrengthTrainingExerciseFamilyMutation,
    CreateStrengthTrainingVariantDimension,
    CreateStrengthTrainingVariantDimensionMutation,
    CreateStrengthTrainingVariantValue,
    CreateStrengthTrainingVariantValueMutation,
    GetStrengthTrainingExerciseCatalogQuery,
    SetAllowedStrengthTrainingVariantValues,
    SetAllowedStrengthTrainingVariantValuesMutation,
    StrengthTrainingExerciseType,
} from '../types';
import {EditorField, FormProps} from '../utils/forms/Form';
import {SimpleCrudList} from '../application/components/SimpleCrudList';
import {StandOutText} from '../application/components/StandOutText';

type Catalog = GetStrengthTrainingExerciseCatalogQuery['strengthTraining'];
type ExerciseFamily = Catalog['exerciseFamilies'][number];
type VariantDimension = Catalog['variantDimensions'][number];

type FamilyDimensionRow = {
    publicId: string;
    familyPublicId: string;
    familyName: string;
    dimensionPublicId: string;
    dimensionName: string;
    scope: string;
    position: number;
    required: boolean;
};

type AllowedValueRow = {
    publicId: string;
    familyPublicId: string;
    familyName: string;
    familyDimensionPublicId: string;
    dimensionName: string;
    valuePublicId: string;
    valueName: string;
    scope: string;
    defaultValue: boolean;
};

type ExerciseFamilyForm = {
    name: string;
    exerciseType: StrengthTrainingExerciseType;
};

type VariantDimensionForm = {name: string};

type VariantValueForm = {
    name: string;
    variantDimensionPublicId: string;
};

type FamilyDimensionForm = {
    exerciseFamilyPublicId: string;
    exerciseFamilyName?: string;
    variantDimensionPublicId: string;
    position: number;
    required: boolean;
};

type FormSettings<T> = Omit<FormProps<T>, 'onSave' | 'onCancel'>;

const exerciseTypeOptions = [
    [StrengthTrainingExerciseType.WeightReps, 'Ciężar i powtórzenia'],
    [StrengthTrainingExerciseType.BodyweightReps, 'Masa ciała i powtórzenia'],
    [StrengthTrainingExerciseType.Duration, 'Czas trwania'],
    [StrengthTrainingExerciseType.Distance, 'Dystans'],
].map(([key, label]) => ({key, displayElement: <span>{label}</span>}));

const exerciseTypeLabels: Record<string, string> = {
    WEIGHT_REPS: 'Ciężar i powtórzenia',
    BODYWEIGHT_REPS: 'Masa ciała i powtórzenia',
    DURATION: 'Czas trwania',
    DISTANCE: 'Dystans',
};

function selectOptions(items: Array<{publicId: string; name: string; scope?: string}>) {
    return items.map(item => ({
        key: item.publicId,
        displayElement: (
            <Stack direction="row" alignItems="center" spacing={0.5}>
                <span>{item.name}</span>
                {item.scope === 'SYSTEM' && <Chip size="small" label="Systemowa" aria-hidden="true" />}
            </Stack>
        ),
    }));
}

export function uniquePublicIds(publicIds: string[]): string[] {
    return [...new Set(publicIds)];
}

const exerciseFamilyForm = (): FormSettings<ExerciseFamilyForm> => ({
    presentation: 'dialog' as const,
    submitLabel: 'Dodaj ćwiczenie',
    submitColor: 'secondary' as const,
    validationSchema: Yup.object({
        name: Yup.string().trim().required('Wymagana'),
        exerciseType: Yup.string().required('Wymagany'),
    }),
    initialValues: {
        name: '',
        exerciseType: StrengthTrainingExerciseType.WeightReps,
    } as ExerciseFamilyForm,
    fields: [
        {label: 'Nazwa', type: 'TEXT', key: 'name', editable: true},
        {
            label: 'Typ ćwiczenia',
            type: 'SELECT',
            key: 'exerciseType',
            editable: true,
            selectOptions: exerciseTypeOptions,
        },
    ] as EditorField[],
});

const variantDimensionForm = (): FormSettings<VariantDimensionForm> => ({
    presentation: 'dialog' as const,
    submitLabel: 'Dodaj wariant',
    submitColor: 'secondary' as const,
    validationSchema: Yup.object({name: Yup.string().trim().required('Wymagana')}),
    initialValues: {name: ''} as VariantDimensionForm,
    fields: [{label: 'Nazwa', type: 'TEXT', key: 'name', editable: true}] as EditorField[],
});

function variantValueForm(
    dimensions: VariantDimension[],
    fixedVariantDimensionPublicId?: string
): FormSettings<VariantValueForm> {
    const variantFields: EditorField[] = fixedVariantDimensionPublicId
        ? []
        : [
              {
                  label: 'Wariant',
                  type: 'SELECT',
                  key: 'variantDimensionPublicId',
                  editable: true,
                  selectOptions: selectOptions(dimensions),
              },
          ];

    return {
        presentation: 'dialog' as const,
        submitLabel: 'Dodaj wartość',
        submitColor: 'secondary' as const,
        validationSchema: Yup.object({
            variantDimensionPublicId: Yup.string().required('Wymagany'),
            name: Yup.string().trim().required('Wymagana'),
        }),
        initialValues: {
            name: '',
            variantDimensionPublicId: fixedVariantDimensionPublicId ?? '',
        } as VariantValueForm,
        fields: [...variantFields, {label: 'Nazwa', type: 'TEXT', key: 'name', editable: true}] as EditorField[],
    };
}

function getNextAvailablePosition(existingPositions: number[]): number {
    const occupiedPositions = new Set(existingPositions.filter(position => Number.isInteger(position) && position > 0));
    let nextPosition = 1;
    while (occupiedPositions.has(nextPosition)) {
        nextPosition += 1;
    }
    return nextPosition;
}

function familyDimensionForm(
    families: ExerciseFamily[],
    dimensions: VariantDimension[],
    existingPositions: number[],
    fixedFamilyPublicId?: string
): FormSettings<FamilyDimensionForm> {
    const nextAvailablePosition = getNextAvailablePosition(existingPositions);
    const fixedFamilyName = families.find(family => family.publicId === fixedFamilyPublicId)?.name ?? '';

    return {
        presentation: 'dialog' as const,
        submitLabel: 'Dodaj wariant',
        submitColor: 'secondary' as const,
        validationSchema: Yup.object({
            exerciseFamilyPublicId: Yup.string().required('Wymagane'),
            variantDimensionPublicId: Yup.string().required('Wymagane'),
            position: Yup.number()
                .integer('Musi być liczbą całkowitą')
                .min(1, 'Musi być większe od zera')
                .test(
                    'unique-position',
                    'Ta pozycja jest już zajęta.',
                    value => value === undefined || !existingPositions.includes(value)
                )
                .required('Wymagana'),
            required: Yup.boolean().required(),
        }),
        initialValues: {
            exerciseFamilyPublicId: fixedFamilyPublicId ?? '',
            exerciseFamilyName: fixedFamilyName,
            variantDimensionPublicId: '',
            position: nextAvailablePosition,
            required: true,
        } as FamilyDimensionForm,
        fields: [
            ...(!fixedFamilyPublicId
                ? [
                      {
                          label: 'Ćwiczenie',
                          type: 'SELECT' as const,
                          key: 'exerciseFamilyPublicId',
                          editable: true,
                          selectOptions: selectOptions(families),
                      },
                  ]
                : []),
            {
                label: 'Wariant',
                type: 'SELECT',
                key: 'variantDimensionPublicId',
                editable: true,
                selectOptions: selectOptions(dimensions),
            },
            {label: 'Pozycja', type: 'NUMBER', key: 'position', editable: true},
            {label: 'Wymagany', type: 'CHECKBOX', key: 'required', editable: true} as EditorField,
        ] as EditorField[],
    };
}

function flattenFamilyDimensions(families: ExerciseFamily[]): FamilyDimensionRow[] {
    return families.flatMap(family =>
        family.dimensions.map(dimension => ({
            publicId: dimension.publicId,
            familyPublicId: family.publicId,
            familyName: family.name,
            dimensionPublicId: dimension.variantDimension.publicId,
            dimensionName: dimension.variantDimension.name,
            scope: dimension.scope,
            position: dimension.position,
            required: dimension.required,
        }))
    );
}

function flattenAllowedValues(families: ExerciseFamily[]): AllowedValueRow[] {
    return families.flatMap(family =>
        family.dimensions.flatMap(dimension =>
            dimension.allowedValues.map(value => ({
                publicId: value.publicId,
                familyPublicId: family.publicId,
                familyName: family.name,
                familyDimensionPublicId: dimension.publicId,
                dimensionName: dimension.variantDimension.name,
                valuePublicId: value.variantValue.publicId,
                valueName: value.variantValue.name,
                scope: value.scope,
                defaultValue: value.defaultValue,
            }))
        )
    );
}

export function StrengthTrainingCatalogManagement({
    catalog,
    refetch,
    selectedFamilyPublicId,
    selectedVariantDimensionPublicId,
    onSelectFamily,
    onSelectVariantDimension,
    onBackToCatalog,
}: {
    catalog: Catalog;
    refetch: () => Promise<unknown>;
    selectedFamilyPublicId?: string;
    selectedVariantDimensionPublicId?: string;
    onSelectFamily: (familyPublicId: string) => void;
    onSelectVariantDimension: (dimensionPublicId: string) => void;
    onBackToCatalog: () => void;
}) {
    const [createFamilyMutation] = useMutation<CreateStrengthTrainingExerciseFamilyMutation>(
        CreateStrengthTrainingExerciseFamily
    );
    const [createDimensionMutation] = useMutation<CreateStrengthTrainingVariantDimensionMutation>(
        CreateStrengthTrainingVariantDimension
    );
    const [createValueMutation] = useMutation<CreateStrengthTrainingVariantValueMutation>(
        CreateStrengthTrainingVariantValue
    );
    const [assignDimensionMutation] = useMutation<AssignStrengthTrainingDimensionToFamilyMutation>(
        AssignStrengthTrainingDimensionToFamily
    );
    const [setAllowedVariantValuesMutation] = useMutation<SetAllowedStrengthTrainingVariantValuesMutation>(
        SetAllowedStrengthTrainingVariantValues
    );

    const familyDimensions = flattenFamilyDimensions(catalog.exerciseFamilies);
    const allowedValues = flattenAllowedValues(catalog.exerciseFamilies);
    const selectedFamily = catalog.exerciseFamilies.find(family => family.publicId === selectedFamilyPublicId);
    const selectedVariantDimension = catalog.variantDimensions.find(
        dimension => dimension.publicId === selectedVariantDimensionPublicId
    );
    const [configuredFamilyDimension, setConfiguredFamilyDimension] = useState<FamilyDimensionRow | null>(null);
    const [selectedVariantValuePublicIds, setSelectedVariantValuePublicIds] = useState<string[]>([]);
    const [defaultVariantValuePublicId, setDefaultVariantValuePublicId] = useState<string | null>(null);

    const refresh = async () => {
        await refetch();
    };

    const createFamily = async (value: ExerciseFamilyForm) => {
        await createFamilyMutation({variables: value});
        await refresh();
    };

    const createDimension = async (value: VariantDimensionForm) => {
        await createDimensionMutation({variables: value});
        await refresh();
    };

    const createValue = async (value: VariantValueForm) => {
        await createValueMutation({variables: value});
        await refresh();
    };

    const assignDimension = async (value: FamilyDimensionForm) => {
        await assignDimensionMutation({
            variables: {
                exerciseFamilyPublicId: value.exerciseFamilyPublicId,
                variantDimensionPublicId: value.variantDimensionPublicId,
                position: value.position,
                required: value.required,
            },
        });
        await refresh();
    };

    const openVariantValuesDialog = (familyDimension: FamilyDimensionRow) => {
        const assignedValues = allowedValues.filter(
            value => value.familyDimensionPublicId === familyDimension.publicId
        );
        setConfiguredFamilyDimension(familyDimension);
        setSelectedVariantValuePublicIds(uniquePublicIds(assignedValues.map(value => value.valuePublicId)));
        setDefaultVariantValuePublicId(assignedValues.find(value => value.defaultValue)?.valuePublicId ?? null);
    };

    const closeVariantValuesDialog = () => {
        setConfiguredFamilyDimension(null);
        setSelectedVariantValuePublicIds([]);
        setDefaultVariantValuePublicId(null);
    };

    const saveVariantValues = async () => {
        if (!configuredFamilyDimension) {
            return;
        }
        await setAllowedVariantValuesMutation({
            variables: {
                familyDimensionPublicId: configuredFamilyDimension.publicId,
                variantValuePublicIds: uniquePublicIds(selectedVariantValuePublicIds),
                defaultValuePublicId: defaultVariantValuePublicId,
            },
        });
        await refresh();
        closeVariantValuesDialog();
    };

    if (selectedVariantDimensionPublicId) {
        if (!selectedVariantDimension) {
            return (
                <Stack spacing={2}>
                    <Button variant="outlined" onClick={onBackToCatalog} sx={{alignSelf: 'flex-start'}}>
                        Powrót do katalogu
                    </Button>
                    <Typography color="text.secondary">Nie znaleziono wybranego wariantu.</Typography>
                </Stack>
            );
        }

        return (
            <Stack spacing={2}>
                <Button variant="outlined" onClick={onBackToCatalog} sx={{alignSelf: 'flex-start'}}>
                    Powrót do katalogu
                </Button>
                <Stack direction="row" alignItems="center" spacing={1}>
                    <Typography variant="h4">{selectedVariantDimension.name}</Typography>
                    <Chip size="small" label="Wariant" />
                    {selectedVariantDimension.scope === 'SYSTEM' && <Chip size="small" label="Systemowa" />}
                </Stack>
                <SimpleCrudList<any>
                    title="Możliwe wartości wariantu"
                    presentation="settings"
                    emptyStateLabel="Brak możliwych wartości wariantu."
                    createSettings={{
                        showControl: selectedVariantDimension.scope !== 'SYSTEM',
                        dialogTitle: 'Dodaj wartość',
                        buttonLabel: 'Dodaj wartość',
                        onCreate: createValue,
                    }}
                    list={selectedVariantDimension.values}
                    idExtractor={value => value.publicId}
                    formSupplier={() => variantValueForm([selectedVariantDimension], selectedVariantDimension.publicId)}
                    entityDisplay={value => (
                        <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1}>
                            <Stack direction="row" alignItems="center" spacing={0.5} sx={{minWidth: 0}}>
                                <Typography sx={{overflowWrap: 'anywhere'}}>{value.name}</Typography>
                                {value.scope === 'SYSTEM' && <Chip size="small" label="Systemowa" />}
                            </Stack>
                            <Chip size="small" label={value.active ? 'Aktywna' : 'Nieaktywna'} />
                        </Stack>
                    )}
                    enableDndReorder={false}
                />
            </Stack>
        );
    }

    if (selectedFamilyPublicId) {
        if (!selectedFamily) {
            return (
                <Stack spacing={2}>
                    <Button variant="outlined" onClick={onBackToCatalog} sx={{alignSelf: 'flex-start'}}>
                        Powrót do katalogu
                    </Button>
                    <Typography color="text.secondary">Nie znaleziono wybranego ćwiczenia.</Typography>
                </Stack>
            );
        }

        const selectedFamilyDimensions = familyDimensions.filter(
            dimension => dimension.familyPublicId === selectedFamily.publicId
        );
        const assignedVariantDimensionPublicIds = new Set(
            selectedFamilyDimensions.map(dimension => dimension.dimensionPublicId)
        );
        const availableVariantDimensions = catalog.variantDimensions.filter(
            dimension => !assignedVariantDimensionPublicIds.has(dimension.publicId)
        );
        const configuredVariantDimension = configuredFamilyDimension
            ? catalog.variantDimensions.find(
                  dimension => dimension.publicId === configuredFamilyDimension.dimensionPublicId
              )
            : undefined;

        return (
            <Stack spacing={2}>
                <Button variant="outlined" onClick={onBackToCatalog} sx={{alignSelf: 'flex-start'}}>
                    Powrót do katalogu
                </Button>
                <Stack direction="row" alignItems="center" spacing={1}>
                    <Typography variant="h4">{selectedFamily.name}</Typography>
                    <Chip size="small" label="Ćwiczenie" />
                    {selectedFamily.scope === 'SYSTEM' && <Chip size="small" label="Systemowa" />}
                </Stack>
                <SimpleCrudList<any>
                    title="Warianty"
                    presentation="settings"
                    emptyStateLabel="Brak przypisanych wariantów."
                    createSettings={{
                        showControl: availableVariantDimensions.length > 0,
                        dialogTitle: 'Dodaj przypisany wariant',
                        buttonLabel: 'Dodaj wariant',
                        onCreate: assignDimension,
                    }}
                    list={selectedFamilyDimensions}
                    idExtractor={dimension => dimension.publicId}
                    selectEntityListener={openVariantValuesDialog}
                    formSupplier={() =>
                        familyDimensionForm(
                            [selectedFamily],
                            availableVariantDimensions,
                            selectedFamilyDimensions.map(dimension => dimension.position),
                            selectedFamily.publicId
                        )
                    }
                    entityDisplay={dimension => {
                        const familyDimension = selectedFamily.dimensions.find(
                            selectedDimension => selectedDimension.publicId === dimension.publicId
                        );
                        const defaultValuePublicId = familyDimension?.allowedValues.find(value => value.defaultValue)
                            ?.variantValue.publicId;
                        const possibleValues = familyDimension?.allowedValues ?? [];

                        return (
                            <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1}>
                                <Stack sx={{minWidth: 0}}>
                                    <Stack direction="row" alignItems="center" spacing={0.5}>
                                        <Typography>{dimension.dimensionName}</Typography>
                                        {dimension.scope === 'SYSTEM' && <Chip size="small" label="Systemowa" />}
                                    </Stack>
                                    <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap" alignItems="center">
                                        <Typography variant="body2" color="text.secondary">
                                            Możliwe wartości:
                                        </Typography>
                                        {possibleValues.length > 0 ? (
                                            possibleValues.map(value => (
                                                <Chip
                                                    key={value.variantValue.publicId}
                                                    size="small"
                                                    label={
                                                        value.variantValue.publicId === defaultValuePublicId
                                                            ? `${value.variantValue.name} (domyślna)`
                                                            : value.variantValue.name
                                                    }
                                                />
                                            ))
                                        ) : (
                                            <Typography variant="body2" color="text.secondary">
                                                Brak
                                            </Typography>
                                        )}
                                    </Stack>
                                </Stack>
                                <Chip size="small" label={dimension.required ? 'Wymagany' : 'Opcjonalny'} />
                            </Stack>
                        );
                    }}
                    enableDndReorder={false}
                />
                <Dialog
                    open={configuredFamilyDimension !== null}
                    onClose={closeVariantValuesDialog}
                    fullWidth
                    maxWidth="sm"
                >
                    <DialogTitle>
                        Możliwe wartości wariantu
                        {configuredVariantDimension ? `: ${configuredVariantDimension.name}` : ''}
                    </DialogTitle>
                    <DialogContent>
                        <Stack spacing={1} sx={{pt: 1}}>
                            {configuredVariantDimension?.values.map(value => {
                                const selected = selectedVariantValuePublicIds.includes(value.publicId);
                                const isDefault = defaultVariantValuePublicId === value.publicId;

                                return (
                                    <Stack
                                        key={value.publicId}
                                        direction="row"
                                        alignItems="center"
                                        sx={{width: '100%', minWidth: 0}}
                                    >
                                        <FormControlLabel
                                            sx={{m: 0, mr: 1, flex: '0 0 auto', width: 'max-content'}}
                                            control={
                                                <Checkbox
                                                    checked={selected}
                                                    onChange={() => {
                                                        setSelectedVariantValuePublicIds(current =>
                                                            selected
                                                                ? current.filter(
                                                                      publicId => publicId !== value.publicId
                                                                  )
                                                                : [...current, value.publicId]
                                                        );
                                                        if (selected && isDefault) {
                                                            setDefaultVariantValuePublicId(null);
                                                        }
                                                    }}
                                                />
                                            }
                                            label={value.name}
                                        />
                                        {value.scope === 'SYSTEM' && <Chip size="small" label="Systemowa" />}
                                        <FormControlLabel
                                            sx={{m: 0, ml: 'auto', flex: '0 0 auto', width: 'max-content'}}
                                            control={
                                                <Checkbox
                                                    checked={isDefault}
                                                    disabled={!selected}
                                                    onChange={() =>
                                                        setDefaultVariantValuePublicId(
                                                            isDefault ? null : value.publicId
                                                        )
                                                    }
                                                />
                                            }
                                            label="Domyślna"
                                        />
                                    </Stack>
                                );
                            })}
                        </Stack>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={closeVariantValuesDialog}>Anuluj</Button>
                        <Button variant="contained" onClick={saveVariantValues}>
                            Zapisz
                        </Button>
                    </DialogActions>
                </Dialog>
            </Stack>
        );
    }

    return (
        <Stack spacing={2}>
            <SimpleCrudList<ExerciseFamily>
                title="Ćwiczenia"
                presentation="settings"
                emptyStateLabel="Brak ćwiczeń."
                createSettings={{
                    dialogTitle: 'Dodaj ćwiczenie',
                    buttonLabel: 'Dodaj ćwiczenie',
                    onCreate: createFamily,
                }}
                list={[...catalog.exerciseFamilies].sort((left, right) => left.name.localeCompare(right.name, 'pl'))}
                idExtractor={family => family.publicId}
                formSupplier={() => exerciseFamilyForm()}
                entityDisplay={family => (
                    <Stack direction="row" alignItems="center" sx={{width: '100%', minWidth: 0}}>
                        <Stack direction="row" alignItems="center" spacing={1} sx={{minWidth: 0}}>
                            <Stack sx={{minWidth: 0}}>
                                <Typography>
                                    <StandOutText standOutBy="bold">{family.name}</StandOutText>
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    {exerciseTypeLabels[family.exerciseType] ?? family.exerciseType}
                                </Typography>
                            </Stack>
                            <Stack direction="row" spacing={0.5} alignItems="center">
                                {family.scope === 'SYSTEM' && <Chip size="small" label="Systemowa" />}
                                <Chip size="small" label={family.active ? 'Aktywne' : 'Nieaktywne'} />
                            </Stack>
                        </Stack>
                        <Button
                            size="small"
                            sx={{ml: 'auto'}}
                            onClick={event => {
                                event.stopPropagation();
                                onSelectFamily(family.publicId);
                            }}
                            aria-label={`Konfiguruj warianty ćwiczenia ${family.name}`}
                        >
                            Konfiguruj
                        </Button>
                    </Stack>
                )}
                enableDndReorder={false}
            />

            <SimpleCrudList<any>
                title="Warianty"
                presentation="settings"
                emptyStateLabel="Brak wariantów."
                createSettings={{
                    dialogTitle: 'Dodaj wariant',
                    buttonLabel: 'Dodaj wariant',
                    onCreate: createDimension,
                }}
                list={[...catalog.variantDimensions].sort((left, right) => left.name.localeCompare(right.name, 'pl'))}
                idExtractor={dimension => dimension.publicId}
                formSupplier={() => variantDimensionForm()}
                entityDisplay={dimension => (
                    <Stack direction="row" alignItems="center" sx={{width: '100%'}}>
                        <Stack direction="row" alignItems="center" spacing={1}>
                            <Typography>{dimension.name}</Typography>
                            <Stack direction="row" spacing={0.5} alignItems="center">
                                {dimension.scope === 'SYSTEM' && <Chip size="small" label="Systemowa" />}
                                <Chip size="small" label={`${dimension.values.length} wartości`} />
                            </Stack>
                        </Stack>
                        <Button
                            size="small"
                            sx={{ml: 'auto'}}
                            onClick={event => {
                                event.stopPropagation();
                                onSelectVariantDimension(dimension.publicId);
                            }}
                            aria-label={`Otwórz wartości wariantu ${dimension.name}`}
                        >
                            Wartości
                        </Button>
                    </Stack>
                )}
                enableDndReorder={false}
            />
        </Stack>
    );
}
