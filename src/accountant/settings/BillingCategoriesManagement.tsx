import {useMutation} from "@apollo/client/react";
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
import {Card, Theme, useTheme} from "@mui/material";
import {GQLBillingCategory} from "../model/types";
import {SxProps} from "@mui/system";

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

export interface BillingCategoriesManagementProps {
    billingCategories: GQLBillingCategory[],
    refetch: () => void
}

export function BillingCategoriesManagement({billingCategories, refetch}: BillingCategoriesManagementProps) {

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

    const deleteBillingCategory = async (billingCategory: GQLBillingCategory): Promise<any> => {
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
                .sort(ComparatorBuilder.comparing<GQLBillingCategory>(billingCategory => billingCategory.name).build())
        }
        idExtractor={billingCategory => billingCategory.publicId}
        formSupplier={billingCategory => billingCategory ? BILLING_CATEGORY_FORM(billingCategory) : BILLING_CATEGORY_FORM()}
        rowContainerProvider={(key: string, sx: SxProps<Theme>, additionalProperties: any) => {
            return <Card key={key} sx={{marginBottom: '10px', ...sx}} {...additionalProperties}></Card>;
        }}
        entityDisplay={(billingCategory) => {
            return <Box dir={'column'} key={billingCategory.publicId} sx={{paddingLeft: '15px'}}>
                <div>{billingCategory.name}</div>
                <div style={{
                    color: theme.palette.text.disabled,
                    paddingLeft: '15px'
                }}>{billingCategory.description}</div>
            </Box>;
        }}
        enableDndReorder={false}
    />
}