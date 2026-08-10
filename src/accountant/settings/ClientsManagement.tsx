import {ErrorDisplay, LoadingIndicator} from '../../application/components/QueryState';
import {useMutation, useQuery} from '@apollo/client/react';
import {
    CreateClient,
    CreateClientMutation,
    DeleteClient,
    DeleteClientMutation,
    GetAllClients,
    GetAllClientsQuery,
    UpdateClient,
    UpdateClientMutation,
} from '../../types';
import * as React from 'react';
import * as Yup from 'yup';
import {EditorField} from '../../utils/forms/Form';
import {SimpleCrudList} from '../../application/components/SimpleCrudList';
import {ComparatorBuilder} from '../../utils/comparator-builder';
import {GraphqlClient} from '../../graphql.entities';
import {Typography} from '@mui/material';

type ClientDTO = {
    publicId: string;
    name: string;
};

const CLIENT_FORM = (client?: ClientDTO) => {
    return {
        presentation: 'dialog' as const,
        submitLabel: client ? 'Zapisz zmiany' : 'Dodaj klienta',
        submitColor: 'secondary' as const,
        validationSchema: Yup.object({
            publicId: client ? Yup.string().required() : Yup.string(),
            name: Yup.string().required('Wymagana'),
        }),
        initialValues: {
            publicId: client?.publicId || '',
            name: client?.name || '',
        },
        fields: [
            {
                label: 'PublicId',
                type: 'HIDDEN',
                key: 'publicId',
                editable: true,
            } as EditorField,
            {
                label: 'Nazwa',
                type: 'TEXT',
                key: 'name',
                editable: true,
            } as EditorField,
        ],
    };
};

export function ClientsManagement() {
    const {loading, error, data, refetch} = useQuery<GetAllClientsQuery>(GetAllClients);
    const [createClientMutation] = useMutation<CreateClientMutation>(CreateClient);
    const [updateClientMutation] = useMutation<UpdateClientMutation>(UpdateClient);
    const [deleteClientMutation] = useMutation<DeleteClientMutation>(DeleteClient);

    const createClient = async ({name}: ClientDTO): Promise<any> => {
        await createClientMutation({variables: {name: name}});
        return refetch();
    };

    const updateClient = async (client: ClientDTO): Promise<any> => {
        await updateClientMutation({variables: {publicId: client.publicId, name: client.name}}).finally(() =>
            refetch()
        );
        return refetch();
    };

    const deleteClient = async (client: ClientDTO): Promise<any> => {
        await deleteClientMutation({variables: {clientPublicId: client.publicId}});
        return refetch();
    };

    if (loading) {
        return <LoadingIndicator label="Ładowanie klientów..." />;
    } else if (error) {
        return <ErrorDisplay error={error} onRetry={() => void refetch()} />;
    } else if (data) {
        return (
            <SimpleCrudList
                title="Klienci"
                presentation="settings"
                emptyStateLabel="Brak klientów."
                editSettings={{
                    dialogTitle: 'Edytuj klienta',
                    onUpdate: updateClient,
                }}
                createSettings={{
                    dialogTitle: 'Dodaj klienta',
                    buttonLabel: 'Dodaj klienta',
                    onCreate: createClient,
                }}
                deleteSettings={{
                    showControl: true,
                    confirmationTitle: 'Usunąć klienta?',
                    confirmationMessage: client => (
                        <>
                            Czy na pewno chcesz usunąć klienta <strong>{client.name}</strong>? Tej operacji nie można
                            cofnąć.
                        </>
                    ),
                    onDelete: deleteClient,
                }}
                list={[...data.allClients]
                    .sort(ComparatorBuilder.comparing<GraphqlClient>(client => client.name).build())
                    .map(client => {
                        return {publicId: client.publicId, name: client.name} as ClientDTO;
                    })}
                idExtractor={client => client.publicId}
                formSupplier={value => (value ? CLIENT_FORM(value) : CLIENT_FORM())}
                entityDisplay={value => <Typography fontWeight={600}>{value.name}</Typography>}
                enableDndReorder={false}
            />
        );
    } else {
        return <></>;
    }
}
