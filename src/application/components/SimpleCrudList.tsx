import {FormDialogButton} from "../../utils/buttons/FormDialogButton";
import * as React from "react";
import {useState} from "react";
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
    highlightRowOnHover?: boolean;

    createTitle?: string,

    onCreate?(t: T): Promise<void>,

    editTitle?: string,

    onUpdate?(t: T): Promise<void>,

    onDelete?(t: T): Promise<void>,

    onReorder?(event: ReorderEvent): Promise<void>,

    formSupplier?: (t?: T) => Omit<FormProps<any>, "onSave" | "onCancel">,

    elementsDirection?: ResponsiveStyleValue<'row' | 'row-reverse' | 'column' | 'column-reverse'>,

    rowContainerProvider?: (sx: SxProps<Theme>, additionalProperties: any) => React.JSX.Element

    entityDisplay(t: T, index: number): React.JSX.Element,

    rowStyle?(t: T, index: number): React.CSSProperties,

    dialogOptions?: any;
    enableDndReorder: boolean;

    selectEntityListener?(t: T): void,
}

export function SimpleCrudList<T>({
                                      idExtractor,
                                      highlightRowOnHover = true,
                                      title,
                                      createTitle,
                                      editTitle,
                                      list,
                                      onCreate,
                                      onDelete,
                                      onUpdate,
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
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [showDeleteConfirmationDialog, setShowDeleteConfirmationDialog] = useState(false);
    const [selectedEntity, setSelectedEntity] = useState<T | null>(null);

    function selectEntity(t: T) {
        setSelectedEntity(t);
        setShowEditDialog(true);
        selectEntityListener?.(t);
    }

    const editDialogTitleElement = <Stack direction={'row'} justifyContent={'space-between'} alignItems={'center'}>
        <Box>{editTitle}</Box>
        {onDelete && <IconButton color="primary" size={'small'}
                                 onClick={() => {
                                     setShowEditDialog(false);
                                     setShowDeleteConfirmationDialog(true);
                                 }}>
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
                                         selectEntityListener={(entity: T) => selectEntity(entity)}
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
                {createTitle && onCreate && formSupplier && <FormDialogButton
                    title={createTitle}
                    onSave={(t) => onCreate(t)}
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
            selectedEntity && onUpdate && editTitle && formSupplier && <FormDialog dialogTitle={editDialogTitleElement}
                                                                                   open={showEditDialog}
                                                                                   onSave={value => onUpdate(value)}
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