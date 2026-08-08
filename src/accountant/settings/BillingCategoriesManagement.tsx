import {useMutation} from "@apollo/client/react";
import {
    BillingCategory,
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
import {StandOutText} from "../../application/components/StandOutText";
import {Stack, Typography} from "@mui/material";

const BILLING_CATEGORY_FORM = (billingCategory?: BillingCategory) => {
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
            } as BillingCategory,
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

export interface BillingCategoriesManagementProps {
    billingCategories: BillingCategory[],
    refetch: () => void
}

export function BillingCategoriesManagement({billingCategories, refetch}: BillingCategoriesManagementProps) {

    const [createBillingCategoryMutation] = useMutation<CreateBillingCategoryMutation>(CreateBillingCategory);
    const [updateBillingCategoryMutation] = useMutation<UpdateBillingCategoryMutation>(UpdateBillingCategory);
    const [deleteBillingCategoryMutation] = useMutation<DeleteBillingCategoryMutation>(DeleteBillingCategory);

    const createBillingCategory = async (billingCategory: BillingCategory): Promise<any> => {
        return await createBillingCategoryMutation({
            variables: {
                name: billingCategory.name,
                description: billingCategory.description
            }
        })
            .finally(() => refetch());
    };

    const updateBillingCategory = async (billingCategory: BillingCategory): Promise<any> => {
        return await updateBillingCategoryMutation({
            variables: {
                publicId: billingCategory.publicId,
                name: billingCategory.name,
                description: billingCategory.description
            }
        })
            .finally(() => refetch());
    };

    const deleteBillingCategory = async (billingCategory: BillingCategory): Promise<any> => {
        return await deleteBillingCategoryMutation({variables: {publicId: billingCategory.publicId}})
            .finally(() => refetch());
    };

    return <SimpleCrudList
        title={'KATEGORIE'}
        editSettings={{
            dialogTitle: 'Edytuj',
            onUpdate: updateBillingCategory,
        }}
        createSettings={{
            dialogTitle: 'Dodaj',
            onCreate: createBillingCategory,
        }}
        deleteSettings={{
            showControl: true,
            onDelete: deleteBillingCategory
        }}
        list={
            billingCategories
                .sort(ComparatorBuilder.comparing<BillingCategory>(billingCategory => billingCategory.name).build())
        }
        idExtractor={billingCategory => billingCategory.publicId}
        formSupplier={billingCategory => billingCategory ? BILLING_CATEGORY_FORM(billingCategory) : BILLING_CATEGORY_FORM()}
        entityDisplay={(billingCategory) => {
            return <Stack direction="column" key={billingCategory.publicId} sx={{minWidth: 0}}>
                <Typography><StandOutText standOutBy="bold">{billingCategory.name}</StandOutText></Typography>
                <Typography variant="body2" color="text.secondary">{billingCategory.description}</Typography>
            </Stack>;
        }}
        enableDndReorder={false}
    />
}
