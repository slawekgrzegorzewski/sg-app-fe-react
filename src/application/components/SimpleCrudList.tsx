import {FormDialogButton} from '../../utils/buttons/FormDialogButton';
import React, {useEffect, useRef, useState} from 'react';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import {Button, Chip, Paper, Theme, Tooltip, Typography} from '@mui/material';
import ConfirmationDialog from '../../utils/dialogs/ConfirmationDialog';
import {FormDialog} from '../../utils/dialogs/FormDialog';
import IconButton from '@mui/material/IconButton';
import {FormProps} from '../../utils/forms/Form';
import {ReorderEvent, SimpleCrudListRow} from './SimpleCrudListRow';
import {ResponsiveStyleValue, SxProps} from '@mui/system';
import {StandOutText} from './StandOutText';

type DialogCopy<T> = React.ReactNode | ((entity: T) => React.ReactNode);

export interface SimpleCrudListProps<T> {
    title: string;
    list: T[];
    idExtractor: (t: T) => string;
    highlightRowOnHover?: boolean;
    createSettings?: {
        showControl?: boolean;
        dialogTitle: string;
        buttonLabel?: string;
        trigger?: React.RefObject<() => void>;
        onCreate?(t: T): Promise<void>;
    };
    editSettings?: {
        rowClickIsTrigger?: boolean;
        dialogTitle: string;
        trigger?: React.RefObject<(t: T) => void>;
        onUpdate?(t: T): Promise<void>;
    };
    deleteSettings?: {
        showControl?: boolean;
        trigger?: React.RefObject<(t: T) => void>;
        confirmationTitle?: DialogCopy<T>;
        confirmationMessage?: DialogCopy<T>;
        onDelete?(t: T): Promise<void>;
    };

    onReorder?(event: ReorderEvent): Promise<void>;

    formSupplier?: (t?: T) => Omit<FormProps<any>, 'onSave' | 'onCancel'>;
    elementsDirection?: ResponsiveStyleValue<'row' | 'row-reverse' | 'column' | 'column-reverse'>;
    rowContainerProvider?: (key: string, sx: SxProps<Theme>, additionalProperties: any) => React.JSX.Element;

    entityDisplay(t: T, index: number): React.JSX.Element;

    rowStyle?(t: T, index: number): React.CSSProperties;

    dialogOptions?: any;
    enableDndReorder: boolean;

    selectEntityListener?(t: T): void;
    presentation?: 'plain' | 'settings';
    emptyStateLabel?: string;
}

export function SimpleCrudList<T>({
    idExtractor,
    highlightRowOnHover = true,
    title,
    createSettings: {
        showControl: showCreateControl = true,
        dialogTitle: createDialogTitle,
        buttonLabel: createButtonLabel = 'Dodaj',
        trigger: createTrigger,
        onCreate,
    } = {
        showControl: false,
        dialogTitle: '',
    },
    editSettings: {rowClickIsTrigger = true, dialogTitle: editDialogTitle, trigger: editTrigger, onUpdate} = {
        rowClickIsTrigger: false,
        dialogTitle: '',
    },
    deleteSettings: {
        showControl: showDeleteControl = true,
        trigger: deleteTrigger,
        confirmationTitle = 'Usunąć element?',
        confirmationMessage = 'Tej operacji nie można cofnąć.',
        onDelete,
    } = {
        showControl: false,
    },
    list,
    formSupplier,
    entityDisplay,
    elementsDirection,
    rowContainerProvider,
    rowStyle,
    dialogOptions,
    onReorder,
    enableDndReorder,
    selectEntityListener,
    presentation = 'plain',
    emptyStateLabel = 'Brak elementów.',
}: SimpleCrudListProps<T>) {
    const settingsPresentation = presentation === 'settings';
    const editButtonClick: React.MutableRefObject<() => void> = useRef<() => void>(() => {});

    useEffect(() => {
        if (createTrigger) {
            createTrigger.current = editButtonClick.current;
        }
        if (editTrigger) {
            editTrigger.current = selectEntity;
        }
        if (deleteTrigger) {
            deleteTrigger.current = selectEntityForDeletion;
        }
    });
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [showDeleteConfirmationDialog, setShowDeleteConfirmationDialog] = useState(false);
    const [selectedEntity, setSelectedEntity] = useState<T | null>(null);

    function selectEntity(t: T) {
        setSelectedEntity(t);
        setShowEditDialog(true);
        selectEntityListener?.(t);
    }

    function selectEntityForDeletion(t: T) {
        setSelectedEntity(t);
        setShowEditDialog(true);
        selectEntityListener?.(t);
        showDeleteConfirmation();
    }

    function showDeleteConfirmation() {
        setShowEditDialog(false);
        setShowDeleteConfirmationDialog(true);
    }

    const editDialogTitleElement = (
        <Stack direction={'row'} justifyContent={'space-between'} alignItems={'center'}>
            <Box>{editDialogTitle}</Box>
            {!settingsPresentation && onDelete && showDeleteControl && (
                <Tooltip title="Usuń">
                    <IconButton aria-label="Usuń" color="primary" size="small" onClick={() => showDeleteConfirmation()}>
                        <DeleteOutlineRoundedIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
            )}
        </Stack>
    );

    const elements = [];

    for (let i = 0; i < list.length; i++) {
        elements.push(
            <SimpleCrudListRow
                index={i}
                entity={list[i]}
                idExtractor={idExtractor}
                highlightRowOnHover={settingsPresentation ? false : highlightRowOnHover}
                key={idExtractor(list[i])}
                rowContainerProvider={rowContainerProvider}
                entityDisplay={(entity, index) =>
                    settingsPresentation ? (
                        <Stack direction="row" alignItems="flex-start" width="100%" minWidth={0} gap={1}>
                            <Box sx={{flex: 1, minWidth: 0}}>{entityDisplay(entity, index)}</Box>
                            <Stack direction="row" flexShrink={0}>
                                {onUpdate && formSupplier && (
                                    <Tooltip title="Edytuj">
                                        <IconButton
                                            size="small"
                                            aria-label={`Edytuj element ${index + 1} w sekcji ${title}`}
                                            onClick={event => {
                                                event.stopPropagation();
                                                selectEntity(entity);
                                            }}
                                        >
                                            <EditRoundedIcon fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                )}
                                {onDelete && showDeleteControl && (
                                    <Tooltip title="Usuń">
                                        <IconButton
                                            size="small"
                                            aria-label={`Usuń element ${index + 1} z sekcji ${title}`}
                                            onClick={event => {
                                                event.stopPropagation();
                                                setSelectedEntity(entity);
                                                setShowDeleteConfirmationDialog(true);
                                            }}
                                        >
                                            <DeleteOutlineRoundedIcon fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                )}
                            </Stack>
                        </Stack>
                    ) : (
                        entityDisplay(entity, index)
                    )
                }
                rowStyle={(entity, index) => ({
                    ...(settingsPresentation
                        ? {boxSizing: 'border-box', width: '100%', maxWidth: '100%', minWidth: 0}
                        : {}),
                    ...(rowStyle?.(entity, index) || {}),
                })}
                selectEntityListener={(entity: T) => {
                    if (!settingsPresentation && rowClickIsTrigger) {
                        selectEntity(entity);
                    }
                }}
                reorderProps={
                    enableDndReorder
                        ? {
                              aboveId: i === 0 ? null : idExtractor(list[i - 1]),
                              belowId: i === list.length - 1 ? null : idExtractor(list[i + 1]),
                              dndLabel: idExtractor(list[i]),
                              onReorder: onReorder,
                          }
                        : undefined
                }
            />
        );
    }

    const listContent = (
        <Stack direction="column" spacing={settingsPresentation ? 1.5 : 0}>
            <Stack
                direction={{xs: settingsPresentation ? 'column' : 'row', sm: 'row'}}
                justifyContent="space-between"
                alignItems={{xs: settingsPresentation ? 'stretch' : 'center', sm: 'center'}}
                gap={settingsPresentation ? 1 : 0}
                sx={{mb: settingsPresentation ? 0 : 1}}
            >
                {settingsPresentation ? (
                    <Stack direction="row" alignItems="center" spacing={1}>
                        <Typography variant="h4">{title}</Typography>
                        <Chip size="small" variant="outlined" label={`Liczba: ${list.length}`} />
                    </Stack>
                ) : (
                    <StandOutText standOutBy="both" sx={{fontSize: theme => theme.typography.pxToRem(18)}}>
                        {title}
                    </StandOutText>
                )}
                {onCreate && formSupplier && showCreateControl && (
                    <FormDialogButton
                        clickTrigger={editButtonClick}
                        title={createDialogTitle}
                        onConfirm={t => onCreate(t)}
                        onCancel={() => {
                            return Promise.resolve();
                        }}
                        buttonContent={
                            settingsPresentation ? (
                                <Button variant="outlined" color="secondary" startIcon={<AddRoundedIcon />} fullWidth>
                                    {createButtonLabel}
                                </Button>
                            ) : (
                                <IconButton aria-label={createButtonLabel} color="secondary" size="small">
                                    <AddRoundedIcon />
                                </IconButton>
                            )
                        }
                        formProps={formSupplier()}
                    />
                )}
            </Stack>

            {settingsPresentation && elements.length === 0 ? (
                <Typography color="text.secondary" textAlign="center" sx={{py: 3}}>
                    {emptyStateLabel}
                </Typography>
            ) : (
                <Stack direction={elementsDirection ? elementsDirection : 'column'}>{elements}</Stack>
            )}
        </Stack>
    );

    const resolveDialogCopy = (copy: DialogCopy<T>, entity: T) => (typeof copy === 'function' ? copy(entity) : copy);

    return (
        <>
            {settingsPresentation ? (
                <Paper component="section" variant="outlined" sx={{width: '100%', p: {xs: 1.5, sm: 2}}}>
                    {listContent}
                </Paper>
            ) : (
                listContent
            )}

            {selectedEntity && onUpdate && formSupplier && (
                <FormDialog
                    dialogTitle={editDialogTitleElement}
                    open={showEditDialog}
                    onConfirm={async value => {
                        await onUpdate(value);
                        setShowEditDialog(false);
                        setSelectedEntity(null);
                    }}
                    onCancel={() => {
                        setShowEditDialog(false);
                        return Promise.resolve();
                    }}
                    formProps={formSupplier(selectedEntity)}
                    dialogOptions={dialogOptions}
                />
            )}
            {selectedEntity && onDelete && (
                <ConfirmationDialog
                    companionObject={selectedEntity}
                    title={resolveDialogCopy(confirmationTitle, selectedEntity)}
                    message={resolveDialogCopy(confirmationMessage, selectedEntity)}
                    open={showDeleteConfirmationDialog}
                    tone="danger"
                    confirmLabel="Usuń"
                    onConfirm={(entity: T) => {
                        setShowDeleteConfirmationDialog(false);
                        return onDelete(entity);
                    }}
                    onCancel={() => {
                        setShowDeleteConfirmationDialog(false);
                        return Promise.resolve();
                    }}
                />
            )}
        </>
    );
}
