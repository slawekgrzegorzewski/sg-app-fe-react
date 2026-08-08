import {useMutation} from "@apollo/client/react";
import {
    CreateDomain,
    CreateDomainMutation,
    Domain,
    DomainAccessLevel,
    DomainUser,
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
import {SimpleCrudList} from "../../application/components/SimpleCrudList";
import {ComparatorBuilder} from "../../utils/comparator-builder";
import {IconButton, Stack, Typography} from "@mui/material";
import Box from "@mui/material/Box";
import {useCurrentUser} from "../../utils/users/use-current-user";
import ConfirmationDialog from "../../utils/dialogs/ConfirmationDialog";
import {FormDialog} from "../../utils/dialogs/FormDialog";
import {DomainsContext} from "../../utils/DrawerAppBar";
import KeyboardDoubleArrowDownIcon from '@mui/icons-material/KeyboardDoubleArrowDown';
import KeyboardDoubleArrowUpIcon from '@mui/icons-material/KeyboardDoubleArrowUp';
import PersonRemoveIcon from '@mui/icons-material/PersonRemove';
import PersonAddIcon from '@mui/icons-material/PersonAdd';

const DOMAIN_FORM = (domain?: Domain) => {
    return {
        validationSchema: Yup.object({
            publicId: Yup.string().required(),
            name: Yup.string().required()
        }),
        initialValues: {
            publicId: domain?.publicId || 'new id',
            name: domain?.name || ''
        } as Domain,
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
    user: DomainUser;
    domain: Domain;
    showDomainAccessLevelButtons: boolean;
    setDomainAccessLevelDialogOptions: (data: DomainAccessLevelData) => void
}

function UserRow({user, domain, showDomainAccessLevelButtons, setDomainAccessLevelDialogOptions}: UserRowProps) {
    return <Stack direction="row" alignItems="center"
                  flexWrap="nowrap" gap={0.5} sx={{width: 'fit-content', maxWidth: '100%', minWidth: 0}}>
        <Typography component="span" sx={{fontWeight: 'inherit', minWidth: 0, overflowWrap: 'anywhere'}}>
            {user.login}
        </Typography>
        {showDomainAccessLevelButtons && (
            <Stack direction="row" flexWrap="nowrap" sx={{flexShrink: 0}}>
                <IconButton size="small"
                            aria-label={user.domainAccessLevel === DomainAccessLevel.Admin ? 'Ustaw jako członka' : 'Ustaw jako administratora'}
                            onClick={(event) => {
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
                </IconButton>
                <IconButton size="small" aria-label="Usuń użytkownika" onClick={(event) => {
                    setDomainAccessLevelDialogOptions({
                        domainPublicId: domain.publicId,
                        domainName: domain.name,
                        login: user.login,
                        accessLevel: SetDomainAccessLevel.Remove
                    })
                    event.stopPropagation();
                }} color="inherit">
                    <PersonRemoveIcon/>
                </IconButton>
            </Stack>)}
    </Stack>;
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

    const createDomain = async (domain: Domain): Promise<any> => {
        await createDomainMutation({variables: {name: domain.name}});
        return refreshDomains();
    };

    const updateDomain = async (domain: Domain): Promise<any> => {
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
            list={[...domains as Domain[]].filter(domain => domain.name !== '').sort(ComparatorBuilder.comparing<Domain>(domain => domain.name).build())}
            idExtractor={domain => domain.publicId}
            formSupplier={value => value ? DOMAIN_FORM(value) : DOMAIN_FORM()}
            entityDisplay={
                domain => {
                    const admins = domain.users.filter(user => user.domainAccessLevel === 'ADMIN');
                    const isCurrentUserAdmin = admins.some(admin => admin.login === currentUser!.user.login);
                    const members = domain.users.filter(user => user.domainAccessLevel === 'MEMBER');
                    return <Stack direction="column" spacing={0.5} sx={{width: '100%', minWidth: 0}}>
                        <Stack direction="row" alignItems="center" justifyContent="space-between"
                               flexWrap="nowrap" gap={1}>
                            <Typography sx={{fontWeight: 600, minWidth: 0}}>
                                {domain.name}
                            </Typography>
                            <IconButton size="small" aria-label="Zaproś użytkownika" onClick={(event) => {
                                setInviteUserToDomainDataDialogOptions({
                                    domainPublicId: domain.publicId,
                                    domainName: domain.name,
                                    login: ''
                                });
                                event.stopPropagation();
                            }} color="inherit">
                                <PersonAddIcon/>
                            </IconButton>
                        </Stack>
                        <Stack direction="column" sx={{pl: {xs: 1.5, sm: 3}}}>
                            <Typography color="text.secondary">Administratorzy</Typography>
                            {
                                admins.map(user => <Box key={user.login} sx={{
                                    pl: 1.5,
                                    fontWeight: user.login === currentUser!.user.login ? 'bold' : 'normal'
                                }}>
                                    <UserRow user={user} domain={domain}
                                             showDomainAccessLevelButtons={isCurrentUserAdmin}
                                             setDomainAccessLevelDialogOptions={setDomainAccessLevelDialogOptions}/>
                                </Box>)
                            }
                            {members.length > 0 && <Typography color="text.secondary" sx={{mt: 0.5}}>Członkowie</Typography>}
                            {
                                members.map(user => <Box key={user.login} sx={{
                                    pl: 1.5,
                                    fontWeight: user.login === currentUser!.user.login ? 'bold' : 'normal'
                                }}>
                                    <UserRow user={user} domain={domain}
                                             showDomainAccessLevelButtons={isCurrentUserAdmin}
                                             setDomainAccessLevelDialogOptions={setDomainAccessLevelDialogOptions}/>
                                </Box>)
                            }
                        </Stack>
                    </Stack>
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
