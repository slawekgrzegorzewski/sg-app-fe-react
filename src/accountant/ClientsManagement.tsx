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
import {ComparatorBuilder} from "../application/utils/comparator-builder";

type GraphqlClient = {
    __typename?: "Client";
    publicId: any;
    name: string;
    domain: { __typename?: "DomainSimple"; id: number; name: string }
};

const CLIENT_FORM = (client?: GraphqlClient) => {
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
                    key: 'publicId'
                } as EditorField,
                {
                    label: 'Nazwa',
                    type: 'TEXT',
                    key: 'name'
                } as EditorField,
            ]
    };
};

export function ClientsManagement() {

    const {loading, error, data, refetch} = useQuery<GetAllClientsQuery>(GetAllClients);
    const [createClientMutation] = useMutation<CreateClientMutation>(CreateClient);
    const [updateClientMutation] = useMutation<UpdateClientMutation>(UpdateClient);
    const [deleteClientMutation] = useMutation<DeleteClientMutation>(DeleteClient);

    const createClient = async ({name}: { name: String }): Promise<any> => {
        await createClientMutation({variables: {name: name}});
        return refetch();
    };

    const updateClient = async (publicId: string, name: string): Promise<any> => {
        await updateClientMutation({variables: {publicId: publicId, name: name}})
            .finally(() => refetch());
        return refetch();
    };

    const deleteClient = async (publicId: string): Promise<any> => {
        await deleteClientMutation({variables: {clientPublicId: publicId}});
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
            list={[...data.allClients].sort(ComparatorBuilder.comparing<GraphqlClient>(client => client.name).build())}
            onCreate={value => createClient(value)}
            onUpdate={value => updateClient(value.publicId, value.name)}
            onDelete={value => deleteClient(value.publicId)}
            formSupplier={value => value ? CLIENT_FORM(value) : CLIENT_FORM()}
            entityDisplay={value => <>{value.name}</>}
        />
    } else {
        return <></>;
    }
}