import {ErrorDisplay, LoadingIndicator} from '../../application/components/QueryState';
import {useMutation, useQuery} from '@apollo/client/react';
import {
    CreateSupplier,
    CreateSupplierMutation,
    DeleteSupplier,
    DeleteSupplierMutation,
    GetAllSuppliers,
    GetAllSuppliersQuery,
    UpdateSupplier,
    UpdateSupplierMutation,
} from '../../types';
import * as Yup from 'yup';
import {EditorField} from '../../utils/forms/Form';
import * as React from 'react';
import {SimpleCrudList} from '../../application/components/SimpleCrudList';
import {ComparatorBuilder} from '../../utils/comparator-builder';
import {GraphqlSupplier} from '../../graphql.entities';
import {Typography} from '@mui/material';

type SupplierDTO = {
    publicId: string;
    name: string;
};

const SUPPLIER_FORM = (supplier?: SupplierDTO) => {
    return {
        presentation: 'dialog' as const,
        submitLabel: supplier ? 'Zapisz zmiany' : 'Dodaj dostawcę',
        submitColor: 'secondary' as const,
        validationSchema: Yup.object({
            publicId: supplier ? Yup.string().required() : Yup.string(),
            name: Yup.string().required('Wymagana'),
        }),
        initialValues: {
            publicId: supplier?.publicId || '',
            name: supplier?.name || '',
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

export function SuppliersManagement() {
    const {loading, error, data, refetch} = useQuery<GetAllSuppliersQuery>(GetAllSuppliers);
    const [createSupplierMutation] = useMutation<CreateSupplierMutation>(CreateSupplier);
    const [updateSupplierMutation] = useMutation<UpdateSupplierMutation>(UpdateSupplier);
    const [deleteSupplierMutation] = useMutation<DeleteSupplierMutation>(DeleteSupplier);

    const createSupplier = async (supplier: SupplierDTO): Promise<any> => {
        await createSupplierMutation({variables: {name: supplier.name}});
        return refetch();
    };

    const updateSupplier = async (supplier: SupplierDTO): Promise<any> => {
        await updateSupplierMutation({variables: {publicId: supplier.publicId, name: supplier.name}}).finally(() =>
            refetch()
        );
        return refetch();
    };

    const deleteSupplier = async (supplier: SupplierDTO): Promise<any> => {
        await deleteSupplierMutation({variables: {supplierPublicId: supplier.publicId}});
        return refetch();
    };

    if (loading) {
        return <LoadingIndicator label="Ładowanie dostawców..." />;
    } else if (error) {
        return <ErrorDisplay error={error} onRetry={() => void refetch()} />;
    } else if (data) {
        return (
            <SimpleCrudList
                title="Dostawcy"
                presentation="settings"
                emptyStateLabel="Brak dostawców."
                createSettings={{
                    dialogTitle: 'Dodaj dostawcę',
                    buttonLabel: 'Dodaj dostawcę',
                    onCreate: createSupplier,
                }}
                editSettings={{
                    dialogTitle: 'Edytuj dostawcę',
                    onUpdate: updateSupplier,
                }}
                deleteSettings={{
                    showControl: true,
                    confirmationTitle: 'Usunąć dostawcę?',
                    confirmationMessage: supplier => (
                        <>
                            Czy na pewno chcesz usunąć dostawcę <strong>{supplier.name}</strong>? Tej operacji nie można
                            cofnąć.
                        </>
                    ),
                    onDelete: deleteSupplier,
                }}
                list={[...data.allSuppliers]
                    .sort(ComparatorBuilder.comparing<GraphqlSupplier>(supplier => supplier.name).build())
                    .map(supplier => {
                        return {publicId: supplier.publicId, name: supplier.name} as SupplierDTO;
                    })}
                idExtractor={supplier => supplier.publicId}
                formSupplier={value => (value ? SUPPLIER_FORM(value) : SUPPLIER_FORM())}
                entityDisplay={value => <Typography fontWeight={600}>{value.name}</Typography>}
                enableDndReorder={false}
            />
        );
    } else {
        return <></>;
    }
}
