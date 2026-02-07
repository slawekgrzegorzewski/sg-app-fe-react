import * as React from "react";
import {useMutation, useQuery} from "@apollo/client";
import {
    GetBankPermissions,
    GetBankPermissionsQuery,
    Institution,
    StartPermissionRequest,
    StartPermissionRequestMutation
} from "../../types";
import {SimpleCrudList} from "../../application/components/SimpleCrudList";
import {ComparatorBuilder} from "../../utils/comparator-builder";
import {SxProps} from "@mui/system";
import {Button, Card, Theme} from "@mui/material";
import {GQLBankPermission, GQLInstitution, mapBankPermission, mapInstitution} from "../model/types";
import {InstitutionCardContent} from "./InstitutionCardContent";
import {InstitutionPickerButton} from "./InstitutionPickerButton";

export function BanksPermissionsManagement() {

    const [startPermissionRequestMutation] = useMutation<StartPermissionRequestMutation>(StartPermissionRequest);
    const {
        data: bankAccountPermissionsData,
        refetch: bankAccountPermissionsRefetch
    } = useQuery<GetBankPermissionsQuery>(GetBankPermissions);

    const startConfirmationProcess = async (institution: Institution) => {
        await startPermissionRequestMutation({
            variables: {
                institutionId: institution.id,
                maxHistoricalDays: institution.transactionTotalDays,
                redirect: document.location.href,
                userLanguage: 'pl'
            }
        });
        return bankAccountPermissionsRefetch();
    };

    if (!bankAccountPermissionsData)
        return <></>;
    else
        return <>
            <SimpleCrudList
                title={'Dostęp udzielony'}
                createTitle={'Dodaj'}
                list={[...bankAccountPermissionsData.bankPermissions.granted]
                    .map(mapBankPermission)
                    .sort(ComparatorBuilder.comparing<GQLBankPermission>(bankPermissions => bankPermissions.institutionId).build())}
                idExtractor={bankPermission => bankPermission.publicId}
                rowContainerProvider={(sx: SxProps<Theme>, additionalProperties: any) => {
                    return <Card sx={{marginBottom: '10px', ...sx}} {...additionalProperties}>
                    </Card>;
                }}
                entityDisplay={
                    bankPermission => {
                        return <>{bankPermission.institutionId} - udzielono {bankPermission.givenAt.toLocaleString()}</>
                    }
                }
                enableDndReorder={
                    false
                }
            />
            <SimpleCrudList
                title={'Potrzebne udzielenie pozwolenia'}
                list={[...bankAccountPermissionsData.bankPermissions.toProcess]
                    .map(mapBankPermission)
                    .sort(ComparatorBuilder.comparing<GQLBankPermission>(bankPermissions => bankPermissions.institutionId).build())}
                idExtractor={bankPermission => bankPermission.publicId}
                rowContainerProvider={(sx: SxProps<Theme>, additionalProperties: any) => {
                    return <Card sx={{marginBottom: '10px', ...sx}} {...additionalProperties}>
                    </Card>;
                }}
                entityDisplay={
                    bankPermission => {
                        return <Button
                            onClick={() => window.location.replace(bankPermission.confirmationLink)}>Potwierdź {bankPermission.institutionId}</Button>
                    }
                }
                enableDndReorder={
                    false
                }
            />
            <SimpleCrudList
                title={'Potrzebne odnowienie dostępu'}
                list={[...bankAccountPermissionsData.bankPermissions.toRecreate]
                    .map(mapInstitution)
                    .sort(ComparatorBuilder.comparing<GQLInstitution>(institution => institution.id).build())}
                idExtractor={institution => institution.logo}
                elementsDirection='row'
                rowContainerProvider={(sx: SxProps<Theme>, additionalProperties: any) => {
                    return <Card sx={{marginBottom: '10px', maxWidth: '150px', ...sx}} {...additionalProperties}>
                    </Card>;
                }}
                entityDisplay={
                    institution => {
                        return <InstitutionCardContent onClick={() => startConfirmationProcess(institution)}
                                                       institution={institution}/>
                    }
                }
                enableDndReorder={
                    false
                }
            />
            <InstitutionPickerButton
                onPick={(pickedInstitution) =>
                    startConfirmationProcess(pickedInstitution)}/>
        </>
}