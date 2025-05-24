import {useMutation} from "@apollo/client";
import {
    CreateBillingCategory,
    CreateBillingCategoryMutation,
    DeleteBillingCategory,
    DeleteBillingCategoryMutation,
    UpdateBillingCategory,
    UpdateBillingCategoryMutation
} from "../../types";
import * as React from "react";
import * as Yup from "yup";
import {EditorField} from "../../utils/forms/Form";
import {SimpleCrudList} from "../../application/components/SimpleCrudList";
import {ComparatorBuilder} from "../../utils/comparator-builder";
import Box from "@mui/material/Box";
import {useTheme} from "@mui/material";
import {GQLBillingCategory} from "../model/types";

const BILLING_CATEGORY_FORM = (billingCategory?: GQLBillingCategory) => {
        return {
            validationSchema: Yup.object({
                publicId: billingCategory ? Yup.string().required() : Yup.string(),
                name: Yup.string().required('Wymagana'),
                description: Yup.string().required('Wymagana')
            }),
            initialValues: {
                publicId: billingCategory?.publicId || '',
                name: billingCategory?.name || '',
                description: billingCategory?.description || ''
            } as GQLBillingCategory,
            fields:
                [
                    {
                        label: 'PublicId',
                        type: 'HIDDEN',
                        key: 'publicId',
                        editable: false
                    } as EditorField,
                    {
                        label: 'Nazwa',
                        type: 'TEXT',
                        key: 'name',
                        editable: true
                    } as EditorField,
                    {
                        label: 'Opis',
                        type: 'TEXTAREA',
                        key: 'description',
                        editable: true
                    } as EditorField
                ]
        };
    }
;

export interface ExpensesManagementProps {
    billingCategories: GQLBillingCategory[],
    refetch: () => void
}

export function ExpensesManagement({billingCategories, refetch}: ExpensesManagementProps) {

    const [createBillingCategoryMutation] = useMutation<CreateBillingCategoryMutation>(CreateBillingCategory);
    const [updateBillingCategoryMutation] = useMutation<UpdateBillingCategoryMutation>(UpdateBillingCategory);
    const [deleteBillingCategoryMutation] = useMutation<DeleteBillingCategoryMutation>(DeleteBillingCategory);

    const theme = useTheme();

    const createBillingCategory = async (billingCategory: GQLBillingCategory): Promise<any> => {
        return await createBillingCategoryMutation({
            variables: {
                name: billingCategory.name,
                description: billingCategory.description
            }
        })
            .finally(() => refetch());
    };

    const updateBillingCategory = async (billingCategory: GQLBillingCategory): Promise<any> => {
        return await updateBillingCategoryMutation({
            variables: {
                publicId: billingCategory.publicId,
                name: billingCategory.name,
                description: billingCategory.description
            }
        })
            .finally(() => refetch());
    };

    const deleteBillingCategory = async (publicId: string): Promise<any> => {
        return await deleteBillingCategoryMutation({variables: {publicId: publicId}})
            .finally(() => refetch());
    };

    return <SimpleCrudList
        title={'ZARZĄDZAJ KATEGORIAMI'}
        editTitle={'Edytuj kategorię'}
        createTitle={'Dodaj kategorię'}
        list={
            billingCategories
                .sort(ComparatorBuilder.comparing<GQLBillingCategory>(billingCategory => billingCategory.name).build())
        }
        idExtractor={billingCategory => billingCategory.publicId}
        onCreate={billingCategory => createBillingCategory(billingCategory)}
        onUpdate={billingCategory => updateBillingCategory(billingCategory)}
        onDelete={billingCategory => deleteBillingCategory(billingCategory.publicId)}
        formSupplier={billingCategory => billingCategory ? BILLING_CATEGORY_FORM(billingCategory) : BILLING_CATEGORY_FORM()}
        entityDisplay={(billingCategory, index) => {
            return <Box dir={'column'}>
                <div>{billingCategory.name + ' - ' + billingCategory.description}</div>
            </Box>;
        }}
        rowStyle={(entity, index) => (index % 2 === 1 ? {backgroundColor: theme.palette.grey['300']} : {})}
        enableDndReorder={false}
    />
}