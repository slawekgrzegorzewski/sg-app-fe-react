import {useMutation, useQuery} from "@apollo/client";
import {
    CreateSupplier,
    CreateSupplierMutation,
    DeleteSupplier,
    DeleteSupplierMutation,
    GetAllSuppliers,
    GetAllSuppliersQuery,
    UpdateSupplier,
    UpdateSupplierMutation
} from "../types";
import * as Yup from "yup";
import {EditorField} from "../utils/forms/Form";
import * as React from "react";
import {SimpleCrudList} from "../application/components/SImpleCrudList";
import {ComparatorBuilder} from "../application/utils/comparator-builder";
import {GraphqlSupplier} from "../graphql.entities";

type SupplierDTO = {
    publicId: string,
    name: string
}

const SUPPLIER_FORM = (supplier?: SupplierDTO) => {
    return {
        validationSchema: Yup.object({
            publicId: supplier ? Yup.string().required() : Yup.string(),
            name: Yup.string().required('Wymagana')
        }),
        initialValues: {
            publicId: supplier?.publicId || '',
            name: supplier?.name || '',
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
        await updateSupplierMutation({variables: {publicId: supplier.publicId, name: supplier.name}})
            .finally(() => refetch());
        return refetch();
    };

    const deleteSupplier = async (supplier: SupplierDTO): Promise<any> => {
        await deleteSupplierMutation({variables: {supplierPublicId: supplier.publicId}});
        return refetch();
    };

    if (loading) {
        return <>Loading...</>
    } else if (error) {
        return <>Error...</>
    } else if (data) {
        return <SimpleCrudList
            title={'ZARZĄDZAJ DOSTAWCAMI'}
            createTitle={'Dodaj dostawcę'}
            editTitle={'Edytuj dostawcę'}
            list={[...data.allSuppliers]
                .sort(ComparatorBuilder.comparing<GraphqlSupplier>(supplier => supplier.name).build())
                .map(supplier => {
                    return {publicId: supplier.publicId, name: supplier.name} as SupplierDTO
                })}
            idExtractor={supplier => supplier.publicId}
            onCreate={value => createSupplier(value)}
            onUpdate={value => updateSupplier(value)}
            onDelete={value => deleteSupplier(value)}
            formSupplier={value => value ? SUPPLIER_FORM(value) : SUPPLIER_FORM()}
            entityDisplay={value => <>{value.name}</>}
        />
    } else {
        return <></>;
    }
}