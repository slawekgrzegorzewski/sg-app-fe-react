import {FormDialogButton} from "../../utils/buttons/FormDialogButton";
import * as React from "react";
import {useEffect, useState} from "react";
import Stack from "@mui/material/Stack";
import Box from "@mui/material/Box";
import {Add, Delete} from "@mui/icons-material";
import {styled} from "@mui/material";
import ConfirmationDialog from "../../utils/dialogs/ConfirmationDialog";
import {FormDialog} from "../../utils/dialogs/FormDialog";
import IconButton from "@mui/material/IconButton";
import {FormProps} from "../../utils/forms/Form";
import {ReorderEvent, SimpleCrudListRow} from "./SImpleCrudListRow";
import {monitorForElements} from '@atlaskit/pragmatic-drag-and-drop/element/adapter';

export interface SimpleCrudListProps<T> {
    title: string,

    createTitle: string,

    editTitle: string,

    list: T[],

    idExtractor: (t: T) => string,

    onCreate(t: T): Promise<void>,

    onUpdate(t: T): Promise<void>,

    onDelete(t: T): Promise<void>,

    onReorder?(event: ReorderEvent): Promise<void>,

    formSupplier: (t?: T) => Omit<FormProps<any>, "onSave" | "onCancel">,

    entityDisplay(t: T): React.JSX.Element,

    dialogOptions?: any;

    enableDndReorder: boolean;
}

export function SimpleCrudList<T>({
                                      idExtractor,
                                      title,
                                      createTitle,
                                      editTitle,
                                      list,
                                      onCreate,
                                      onDelete,
                                      onUpdate,
                                      formSupplier,
                                      entityDisplay,
                                      dialogOptions,
                                      onReorder,
                                      enableDndReorder
                                  }: SimpleCrudListProps<T>) {
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [showDeleteConfirmationDialog, setShowDeleteConfirmationDialog] = useState(false);
    const [selectedEntity, setSelectedEntity] = useState<T | null>(null);

    function selectEntity(t: T) {
        setSelectedEntity(t);
        setShowEditDialog(true);
    }

    const editDialogTitleElement = <Stack direction={'row'} justifyContent={'space-between'} alignItems={'center'}>
        <Box>{editTitle}</Box>
        <IconButton color="primary" size={'small'}
                    onClick={() => {
                        setShowEditDialog(false);
                        setShowDeleteConfirmationDialog(true);
                    }}>
            <Delete/>
        </IconButton>
    </Stack>;

    const TitleBox = styled(Box)(({theme}) => ({
        color: theme.palette.primary.main,
        fontSize: theme.typography.pxToRem(18)
    }));

    useEffect(() => {
        return monitorForElements({
            onDrop({source, location}) {
                if (!location.current.dropTargets || location.current.dropTargets.length === 0 || !source.data) return;
                const id = source.data.id;
                const {aboveId, belowId} = location.current.dropTargets[0].data;
                console.log(
                    'Put ' + JSON.stringify(list.find(a => idExtractor(a) === id))
                    + ' between ' + JSON.stringify(list.find(a => idExtractor(a) === aboveId))
                    + ' and ' + JSON.stringify(list.find(a => idExtractor(a) === belowId))
                );
            }
        });
    }, [idExtractor, list]);

    const dndLabel = window.crypto.randomUUID();
    const elements = [];

    for (let i = 0; i < list.length - 1; i++) {
        elements.push(<SimpleCrudListRow entity={list[i]}
                                         idExtractor={idExtractor}
                                         key={idExtractor(list[i])}
                                         entityDisplay={entityDisplay}
                                         selectEntityListener={(entity: T) => selectEntity(entity)}
                                         reorderProps={enableDndReorder
                                             ? {
                                                 aboveId: i === 0 ? null : idExtractor(list[i - 1]),
                                                 belowId: i === list.length - 1 ? null : idExtractor(list[i + 1]),
                                                 dndLabel: dndLabel,
                                                 onReorder: onReorder
                                             }
                                             : undefined}
        />);
    }

    return <>
        <Stack direction={'column'}>
            {<Stack direction={'row'} justifyContent={'space-between'} alignItems={'center'}>
                <TitleBox>{title}</TitleBox>
                <FormDialogButton
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
            </Stack>}

            <Stack direction={"column"}>
                {
                    elements
                }
            </Stack>
        </Stack>

        {
            selectedEntity && <>
                <FormDialog dialogTitle={editDialogTitleElement}
                            open={showEditDialog}
                            onSave={value => onUpdate(value)}
                            onCancel={() => {
                                setShowEditDialog(false);
                                return Promise.resolve();
                            }}
                            formProps={formSupplier(selectedEntity)}
                            dialogOptions={dialogOptions}/>
                <ConfirmationDialog companionObject={selectedEntity}
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
            </>
        }
    </>;
}