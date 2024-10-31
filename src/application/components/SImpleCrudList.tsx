import {FormDialogButton} from "../../utils/buttons/FormDialogButton";
import * as React from "react";
import {useState} from "react";
import Stack from "@mui/material/Stack";
import Box from "@mui/material/Box";
import {Add, Delete} from "@mui/icons-material";
import {styled} from "@mui/material";
import ConfirmationDialog from "../../utils/dialogs/ConfirmationDialog";
import {FormDialog} from "../../utils/dialogs/FormDialog";
import IconButton from "@mui/material/IconButton";
import {FormProps} from "../../utils/forms/Form";

export interface SimpleCrudListProps<T> {
    title: string,

    createTitle: string,

    editTitle: string,

    list: T[],

    idExtractor: (t: T) => string,

    onCreate(t: T): Promise<void>,

    onUpdate(t: T): Promise<void>,

    onDelete(t: T): Promise<void>,

    formSupplier: (t?: T) => Omit<FormProps<any>, "onSave" | "onCancel">,

    entityDisplay(t: T): React.JSX.Element,
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
                                      entityDisplay
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
                    onClick={e => {
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

    const EntityRowBox = styled(Box)(({theme}) => ({
        '&:hover': {
            color: '#ffffff',
            backgroundColor: theme.palette.primary.main,
        }
    }));

    return <>
        <Stack direction={'column'}>
            <Stack direction={'row'} justifyContent={'space-between'} alignItems={'center'}>
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
            </Stack>

            <Stack direction={"column"}>
                {(
                    list.map(entity =>
                        <EntityRowBox key={idExtractor(entity)} onClick={(e) => selectEntity(entity)}
                                      alignSelf={'stretch'}>
                            {entityDisplay(entity)}
                        </EntityRowBox>)
                )}
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
                            formProps={formSupplier(selectedEntity)}/>
                <ConfirmationDialog companionObject={selectedEntity}
                                    title={'Na pewno usunąć?'}
                                    message={'Na pewno usunąć?'}
                                    open={showDeleteConfirmationDialog}
                                    onConfirm={(entity: T) => {
                                        setShowDeleteConfirmationDialog(false);
                                        return onDelete(entity);
                                    }}
                                    onCancel={(entity: T) => {
                                        setShowDeleteConfirmationDialog(false);
                                        return Promise.resolve();
                                    }}/>
            </>
        }
    </>;
}