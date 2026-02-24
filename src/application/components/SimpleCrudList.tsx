import {FormDialogButton} from "../../utils/buttons/FormDialogButton";
import React, {useEffect, useRef, useState} from "react";
import Stack from "@mui/material/Stack";
import Box from "@mui/material/Box";
import {Add, Delete} from "@mui/icons-material";
import {styled, Theme} from "@mui/material";
import ConfirmationDialog from "../../utils/dialogs/ConfirmationDialog";
import {FormDialog} from "../../utils/dialogs/FormDialog";
import IconButton from "@mui/material/IconButton";
import {FormProps} from "../../utils/forms/Form";
import {ReorderEvent, SimpleCrudListRow} from "./SimpleCrudListRow";
import {ResponsiveStyleValue, SxProps} from "@mui/system";

export interface SimpleCrudListProps<T> {
    title: string,
    list: T[],
    idExtractor: (t: T) => string,
    highlightRowOnHover?: boolean,
    createSettings?: {
        showControl?: boolean;
        dialogTitle: string,
        trigger?: React.RefObject<() => void>,
        onCreate?(t: T): Promise<void>,
    },
    editSettings?: {
        rowClickIsTrigger?: boolean;
        dialogTitle: string,
        trigger?: React.RefObject<(t: T) => void>,
        onUpdate?(t: T): Promise<void>,
    },
    deleteSettings?: {
        showControl?: boolean;
        trigger?: React.RefObject<(t: T) => void>,
        onDelete?(t: T): Promise<void>,
    },

    onReorder?(event: ReorderEvent): Promise<void>,

    formSupplier?: (t?: T) => Omit<FormProps<any>, "onSave" | "onCancel">,
    elementsDirection?: ResponsiveStyleValue<'row' | 'row-reverse' | 'column' | 'column-reverse'>,
    rowContainerProvider?: (key: string, sx: SxProps<Theme>, additionalProperties: any) => React.JSX.Element,

    entityDisplay(t: T, index: number): React.JSX.Element,

    rowStyle?(t: T, index: number): React.CSSProperties,

    dialogOptions?: any,
    enableDndReorder: boolean,

    selectEntityListener?(t: T): void
}

export function SimpleCrudList<T>({
                                      idExtractor,
                                      highlightRowOnHover = true,
                                      title,
                                      createSettings: {
                                          showControl: showCreateControl = true,
                                          dialogTitle: createDialogTitle,
                                          trigger: createTrigger,
                                          onCreate,
                                      } = {
                                          showControl: false,
                                          dialogTitle: '',
                                      },
                                      editSettings: {
                                          rowClickIsTrigger = true,
                                          dialogTitle: editDialogTitle,
                                          trigger: editTrigger,
                                          onUpdate,
                                      } = {
                                          rowClickIsTrigger: false,
                                          dialogTitle: '',
                                      },
                                      deleteSettings: {
                                          showControl: showDeleteControl = true,
                                          trigger: deleteTrigger,
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
                                      selectEntityListener
                                  }: SimpleCrudListProps<T>) {

    const editButtonClick: React.MutableRefObject<(() => void)> = useRef<() => void>(() => {
    });

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
    })
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

    const editDialogTitleElement = <Stack direction={'row'} justifyContent={'space-between'} alignItems={'center'}>
        <Box>{editDialogTitle}</Box>
        {onDelete && showDeleteControl && <IconButton color="primary" size={'small'}
                                                      onClick={() => showDeleteConfirmation()}>
            <Delete/>
        </IconButton>
        }
    </Stack>;

    const TitleBox = styled(Box)(({theme}) => ({
        color: theme.palette.primary.main,
        fontSize: theme.typography.pxToRem(18)
    }));

    const elements = [];

    for (let i = 0; i < list.length; i++) {
        elements.push(<SimpleCrudListRow index={i}
                                         entity={list[i]}
                                         idExtractor={idExtractor}
                                         highlightRowOnHover={highlightRowOnHover}
                                         key={idExtractor(list[i])}
                                         rowContainerProvider={rowContainerProvider}
                                         entityDisplay={entityDisplay}
                                         rowStyle={rowStyle}
                                         selectEntityListener={(entity: T) => {
                                             if (rowClickIsTrigger) {
                                                 selectEntity(entity);
                                             }
                                         }}
                                         reorderProps={enableDndReorder
                                             ? {
                                                 aboveId: i === 0 ? null : idExtractor(list[i - 1]),
                                                 belowId: i === list.length - 1 ? null : idExtractor(list[i + 1]),
                                                 dndLabel: Math.random().toString(),
                                                 onReorder: onReorder
                                             }
                                             : undefined}
        />);
    }

    return <>
        <Stack direction={'column'}>
            <Stack direction={'row'} justifyContent={'space-between'} alignItems={'center'}>
                <TitleBox>{title}</TitleBox>
                {onCreate && formSupplier && showCreateControl && <FormDialogButton
                    clickTrigger={editButtonClick}
                    title={createDialogTitle}
                    onConfirm={(t) => onCreate(t)}
                    onCancel={() => {
                        return Promise.resolve();
                    }}
                    buttonContent={
                        <IconButton color="primary" size={'small'}>
                            <Add/>
                        </IconButton>}
                    formProps={formSupplier()}/>
                }
            </Stack>

            <Stack direction={elementsDirection ? elementsDirection : "column"}>
                {
                    elements
                }
            </Stack>
        </Stack>

        {
            selectedEntity && onUpdate && formSupplier && <FormDialog dialogTitle={editDialogTitleElement}
                                                                      open={showEditDialog}
                                                                      onConfirm={value => onUpdate(value)}
                                                                      onCancel={() => {
                                                                          setShowEditDialog(false);
                                                                          return Promise.resolve();
                                                                      }}
                                                                      formProps={formSupplier(selectedEntity)}
                                                                      dialogOptions={dialogOptions}/>
        }
        {
            selectedEntity && onDelete && <ConfirmationDialog companionObject={selectedEntity}
                                                              title={'Na pewno usunąć?'}
                                                              message={'Na pewno usunąć?'}
                                                              open={showDeleteConfirmationDialog}
                                                              onConfirm={(entity: T) => {
                                                                  setShowDeleteConfirmationDialog(false);
                                                                  return onDelete(entity);
                                                              }}
                                                              onCancel={() => {
                                                                  setShowDeleteConfirmationDialog(false);
                                                                  return Promise.resolve();
                                                              }}/>
        }
    </>;
}