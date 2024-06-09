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

type GraphqlSupplier = {
    __typename?: "Supplier";
    publicId: any;
    name: string;
    domain: { __typename?: "DomainSimple"; id: number; name: string }
};

const SUPPLIER_FORM = (supplier?: GraphqlSupplier) => {
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

export function SuppliersManagement() {

    const {loading, error, data, refetch} = useQuery<GetAllSuppliersQuery>(GetAllSuppliers);
    const [createSupplierMutation] = useMutation<CreateSupplierMutation>(CreateSupplier);
    const [updateSupplierMutation] = useMutation<UpdateSupplierMutation>(UpdateSupplier);
    const [deleteSupplierMutation] = useMutation<DeleteSupplierMutation>(DeleteSupplier);

    const createSupplier = async ({name}: { name: String }): Promise<any> => {
        await createSupplierMutation({variables: {name: name}});
        return refetch();
    };

    const updateSupplier = async (publicId: string, name: string): Promise<any> => {
        await updateSupplierMutation({variables: {publicId: publicId, name: name}})
            .finally(() => refetch());
        return refetch();
    };

    const deleteSupplier = async (publicId: string): Promise<any> => {
        await deleteSupplierMutation({variables: {supplierPublicId: publicId}});
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
            list={[...data.allSuppliers].sort(ComparatorBuilder.comparing<GraphqlSupplier>(supplier => supplier.name).build())}
            onCreate={value => createSupplier(value)}
            onUpdate={value => updateSupplier(value.publicId, value.name)}
            onDelete={value => deleteSupplier(value.publicId)}
            formSupplier={value => value ? SUPPLIER_FORM(value) : SUPPLIER_FORM()}
            entityDisplay={value => <>{value.name}</>}
        />
    } else {
        return <></>;
    }
}