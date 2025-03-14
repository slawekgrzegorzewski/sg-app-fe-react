import {useMutation, useQuery} from "@apollo/client";
import {
    CreateClient,
    CreateClientMutation,
    DeleteClient,
    DeleteClientMutation,
    GetAllClients,
    GetAllClientsQuery,
    UpdateClient,
    UpdateClientMutation
} from "../types";
import * as React from "react";
import * as Yup from "yup";
import {EditorField} from "../utils/forms/Form";
import {SimpleCrudList} from "../application/components/SImpleCrudList";
import {ComparatorBuilder} from "../utils/comparator-builder";
import {GraphqlClient} from "../graphql.entities";

type ClientDTO = {
    publicId: string,
    name: string
}

const CLIENT_FORM = (client?: ClientDTO) => {
    return {
        validationSchema: Yup.object({
            publicId: client ? Yup.string().required() : Yup.string(),
            name: Yup.string().required('Wymagana')
        }),
        initialValues: {
            publicId: client?.publicId || '',
            name: client?.name || '',
        },
        fields:
            [
                {
                    label: 'PublicId',
                    type: 'HIDDEN',
                    key: 'publicId',
                    editable: true
                } as EditorField,
                {
                    label: 'Nazwa',
                    type: 'TEXT',
                    key: 'name',
                    editable: true
                } as EditorField,
            ]
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
        await updateClientMutation({variables: {publicId: client.publicId, name: client.name}})
            .finally(() => refetch());
        return refetch();
    };

    const deleteClient = async (client: ClientDTO): Promise<any> => {
        await deleteClientMutation({variables: {clientPublicId: client.publicId}});
        return refetch();
    };

    if (loading) {
        return <>Loading...</>
    } else if (error) {
        return <>Error...</>
    } else if (data) {
        return <SimpleCrudList
            title={'ZARZĄDZAJ KLIENTAMI'}
            editTitle={'Edytuj klienta'}
            createTitle={'Dodaj klienta'}
            list={[...data.allClients]
                .sort(ComparatorBuilder.comparing<GraphqlClient>(client => client.name).build())
                .map(client => {
                    return {publicId: client.publicId, name: client.name} as ClientDTO
                })}
            idExtractor={client => client.publicId}
            onCreate={value => createClient(value)}
            onUpdate={value => updateClient(value)}
            onDelete={value => deleteClient(value)}
            formSupplier={value => value ? CLIENT_FORM(value) : CLIENT_FORM()}
            entityDisplay={value => <>{value.name}</>}
            enableDndReorder={false}
        />
    } else {
        return <></>;
    }
}