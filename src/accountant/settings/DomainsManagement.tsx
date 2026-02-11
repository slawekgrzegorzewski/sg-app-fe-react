import {useMutation} from "@apollo/client/react";
import {
    CreateDomain,
    CreateDomainMutation,
    DomainAccessLevel,
    InviteUserToDomain,
    InviteUserToDomainMutation,
    SetDomainAccessLevel,
    SetUserDomainAccessLevel,
    SetUserDomainAccessLevelMutation,
    UpdateDomain,
    UpdateDomainMutation
} from "../../types";
import * as React from "react";
import {useContext, useState} from "react";
import * as Yup from "yup";
import {EditorField} from "../../utils/forms/Form";
import {GQLDomain, GQLDomainUser} from "../../application/model/types";
import {SimpleCrudList} from "../../application/components/SimpleCrudList";
import {ComparatorBuilder} from "../../utils/comparator-builder";
import {SxProps} from "@mui/system";
import {Card, Theme} from "@mui/material";
import Grid from "@mui/material/Grid";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import {useCurrentUser} from "../../utils/users/use-current-user";
import ConfirmationDialog from "../../utils/dialogs/ConfirmationDialog";
import {FormDialog} from "../../utils/dialogs/FormDialog";
import {DomainsContext} from "../../utils/DrawerAppBar";
import KeyboardDoubleArrowDownIcon from '@mui/icons-material/KeyboardDoubleArrowDown';
import KeyboardDoubleArrowUpIcon from '@mui/icons-material/KeyboardDoubleArrowUp';
import PersonRemoveIcon from '@mui/icons-material/PersonRemove';
import PersonAddIcon from '@mui/icons-material/PersonAdd';

const DOMAIN_FORM = (domain?: GQLDomain) => {
    return {
        validationSchema: Yup.object({
            publicId: Yup.string().required(),
            name: Yup.string().required()
        }),
        initialValues: {
            publicId: domain?.publicId || 'new id',
            name: domain?.name || ''
        } as GQLDomain,
        fields:
            [
                {
                    label: 'publicId',
                    type: "HIDDEN",
                    key: 'publicId',
                    editable: false
                } as EditorField,
                {
                    label: 'Nazwa',
                    type: "TEXT",
                    key: 'name',
                    editable: true
                } as EditorField
            ]
    };
};

const INVITE_USER_FORM = (inviteUserToDomainData: InviteUserToDomainData) => {
    return {
        validationSchema: Yup.object({
            domainPublicId: Yup.string().required(),
            domainName: Yup.string().required(),
            login: Yup.string().required()
        }),
        initialValues: {
            domainPublicId: inviteUserToDomainData.domainPublicId,
            domainName: inviteUserToDomainData.domainName,
            login: ''
        } as InviteUserToDomainData,
        fields:
            [
                {
                    label: 'domainPublicId',
                    type: "HIDDEN",
                    key: 'publicId',
                    editable: false
                } as EditorField,
                {
                    label: 'domainName',
                    type: "HIDDEN",
                    key: 'domainName',
                    editable: false
                } as EditorField,
                {
                    label: 'Login użytkownika do zaproszenia',
                    type: "TEXT",
                    key: 'login',
                    editable: true
                } as EditorField
            ]
    };
};

type DomainAccessLevelData = {
    domainPublicId: string,
    domainName: string,
    login: string,
    accessLevel: SetDomainAccessLevel
}

type InviteUserToDomainData = {
    domainPublicId: string,
    domainName: string,
    login: string
}

export interface UserRowProps {
    user: GQLDomainUser;
    domain: GQLDomain;
    showDomainAccessLevelButtons: boolean;
    setDomainAccessLevelDialogOptions: (data: DomainAccessLevelData) => void
}

function UserRow({user, domain, showDomainAccessLevelButtons, setDomainAccessLevelDialogOptions}: UserRowProps) {
    return <Grid container justifyContent={'space-between'}>
        <Grid> {user.login}</Grid>
        {showDomainAccessLevelButtons && (
            <Grid>
                <Button variant="text" onClick={(event) => {
                    setDomainAccessLevelDialogOptions({
                        domainPublicId: domain.publicId,
                        domainName: domain.name,
                        login: user.login,
                        accessLevel: user.domainAccessLevel === DomainAccessLevel.Admin ? SetDomainAccessLevel.Member : SetDomainAccessLevel.Admin
                    })
                    event.stopPropagation();
                }} color="inherit">
                    {user.domainAccessLevel === DomainAccessLevel.Admin
                        ? <KeyboardDoubleArrowDownIcon/>
                        : <KeyboardDoubleArrowUpIcon/>}
                </Button>
                <Button variant="text" onClick={(event) => {
                    setDomainAccessLevelDialogOptions({
                        domainPublicId: domain.publicId,
                        domainName: domain.name,
                        login: user.login,
                        accessLevel: SetDomainAccessLevel.Remove
                    })
                    event.stopPropagation();
                }} color="inherit">
                    <PersonRemoveIcon/>
                </Button>
            </Grid>)}
    </Grid>;
}

function DomainsManagement() {

    const [domainAccessLevelDialogOptions, setDomainAccessLevelDialogOptions] = useState<DomainAccessLevelData | null>(null)
    const [inviteUserToDomainDataDialogOptions, setInviteUserToDomainDataDialogOptions] = useState<InviteUserToDomainData | null>(null)
    const {user: currentUser} = useCurrentUser();
    const [createDomainMutation] = useMutation<CreateDomainMutation>(CreateDomain);
    const [updateDomainMutation] = useMutation<UpdateDomainMutation>(UpdateDomain);
    const [inviteUserToDomainMutation] = useMutation<InviteUserToDomainMutation>(InviteUserToDomain);
    const [setUserDomainAccessLevelMutation] = useMutation<SetUserDomainAccessLevelMutation>(SetUserDomainAccessLevel);

    const {domains, refreshDomains} = useContext(DomainsContext);

    const createDomain = async (domain: GQLDomain): Promise<any> => {
        await createDomainMutation({variables: {name: domain.name}});
        return refreshDomains();
    };

    const updateDomain = async (domain: GQLDomain): Promise<any> => {
        return await updateDomainMutation({
            variables: {
                domainPublicId: domain.publicId,
                name: domain.name
            }
        })
            .finally(() => refreshDomains());
    };

    const setUserDomainAccessLevel = async (domainAccessLevelData: DomainAccessLevelData): Promise<any> => {
        return await setUserDomainAccessLevelMutation({
            variables: {
                domainPublicId: domainAccessLevelData.domainPublicId,
                userLogin: domainAccessLevelData.login,
                domainAccessLevel: domainAccessLevelData.accessLevel
            }
        })
            .then(() => setDomainAccessLevelDialogOptions(null))
            .finally(() => refreshDomains());
    };

    const inviteUserToDomain = async (inviteUserToDomainData: InviteUserToDomainData): Promise<any> => {
        return await inviteUserToDomainMutation({
            variables: {
                domainPublicId: inviteUserToDomainData.domainPublicId,
                invitedUserLogin: inviteUserToDomainData.login
            }
        })
            .then(() => setInviteUserToDomainDataDialogOptions(null))
            .finally(() => refreshDomains());
    };

    function setAccessLevelMessage(domainAccessLevelDialogOptions: DomainAccessLevelData) {
        return domainAccessLevelDialogOptions.accessLevel === SetDomainAccessLevel.Remove
            ? `Czy na pewno chcesz usunąć ${domainAccessLevelDialogOptions!.login} `
            + `z domeny ${domainAccessLevelDialogOptions!.domainName}`
            : `Czy na pewno chcesz ustawić ${domainAccessLevelDialogOptions!.login} `
            + `jako ${domainAccessLevelDialogOptions!.accessLevel === SetDomainAccessLevel.Admin ? 'administratora' : 'członka'} `
            + `domeny ${domainAccessLevelDialogOptions!.domainName}`;
    }

    return <>
        <SimpleCrudList
            title={'ZARZĄDZAJ DOMENAMI'}
            createSettings={{
                dialogTitle: 'Dodaj domenę',
                onCreate: createDomain,
            }}
            editSettings={{
                dialogTitle: 'Edytuj domenę',
                onUpdate: updateDomain,
            }}
            list={[...domains].filter(domain => domain.name !== '').sort(ComparatorBuilder.comparing<GQLDomain>(domain => domain.name).build())}
            idExtractor={domain => domain.publicId}
            formSupplier={value => value ? DOMAIN_FORM(value) : DOMAIN_FORM()}
            rowContainerProvider={(key: string, sx: SxProps<Theme>, additionalProperties: any) => {
                return <Card key={key} sx={{marginBottom: '10px', ...sx}} {...additionalProperties}></Card>;
            }}
            entityDisplay={
                domain => {
                    const admins = domain.users.filter(user => user.domainAccessLevel === 'ADMIN');
                    const isCurrentUserAdmin = admins.some(admin => admin.login === currentUser!.user.login);
                    const members = domain.users.filter(user => user.domainAccessLevel === 'MEMBER');
                    const size = {xs: 12, sm: 12, md: 12, lg: 7, xl: 7};
                    const size2 = {xs: 12, sm: 12, md: 12, lg: 12 - size.lg, xl: 12 - size.xl};
                    return <Grid container justifyContent={'space-between'}>
                        <Grid container justifyContent={'space-between'} alignItems={() => 'flex-start'} size={size}>
                            {domain.name}
                            <Button variant="text" onClick={(event) => {
                                setInviteUserToDomainDataDialogOptions({
                                    domainPublicId: domain.publicId,
                                    domainName: domain.name,
                                    login: ''
                                });
                                event.stopPropagation();
                            }} color="inherit">
                                <PersonAddIcon/>
                            </Button>
                        </Grid>
                        <Grid size={size2}>
                            <Box>
                                Administratorzy
                            </Box>
                            {
                                admins.map(user => <Box key={user.login} sx={{
                                    paddingLeft: '15px',
                                    fontWeight: user.login === currentUser!.user.login ? 'bold' : 'normal'
                                }}>
                                    <UserRow user={user} domain={domain}
                                             showDomainAccessLevelButtons={isCurrentUserAdmin}
                                             setDomainAccessLevelDialogOptions={setDomainAccessLevelDialogOptions}/>
                                </Box>)
                            }
                            {
                                members.length > 0 && <Box>
                                    Członkowie
                                </Box>
                            }
                            {
                                members.map(user => <Box key={user.login} sx={{
                                    paddingLeft: '15px',
                                    fontWeight: user.login === currentUser!.user.login ? 'bold' : 'normal'
                                }}>
                                    <UserRow user={user} domain={domain}
                                             showDomainAccessLevelButtons={isCurrentUserAdmin}
                                             setDomainAccessLevelDialogOptions={setDomainAccessLevelDialogOptions}/>
                                </Box>)
                            }
                        </Grid>
                    </Grid>
                }
            }
            enableDndReorder={
                false
            }
        />
        {
            domainAccessLevelDialogOptions &&
            <ConfirmationDialog companionObject={domainAccessLevelDialogOptions}
                                title={'Potwierdź zmianę'}
                                message={setAccessLevelMessage(domainAccessLevelDialogOptions)}
                                open={true}
                                onConfirm={setUserDomainAccessLevel}
                                onCancel={() => {
                                    setDomainAccessLevelDialogOptions(null);
                                    return Promise.resolve();
                                }}/>

        }
        {
            inviteUserToDomainDataDialogOptions &&
            <FormDialog dialogTitle={<Box>Zapraszanie użytkownika do domeny</Box>}
                        open={true}
                        onConfirm={inviteUserToDomain}
                        onCancel={() => Promise.resolve()}
                        formProps={{...INVITE_USER_FORM(inviteUserToDomainDataDialogOptions)}}
            />
        }
    </>
}

export default DomainsManagement