import * as React from "react";
import {useQuery} from "@apollo/client";
import {GetBankPermissions, GetBankPermissionsQuery} from "../../types";
import {SimpleCrudList} from "../../application/components/SimpleCrudList";
import {ComparatorBuilder} from "../../utils/comparator-builder";
import {SxProps} from "@mui/system";
import {Card, Theme} from "@mui/material";
import {GQLBankPermission, mapBankPermission} from "../model/types";

export function BanksManagement() {

    const {
        loading: bankAccountPermissionsLoading,
        error: bankAccountPermissionsError,
        data: bankAccountPermissionsData,
        refetch: bankAccountPermissionsRefetch
    } = useQuery<GetBankPermissionsQuery>(GetBankPermissions);
    if (!bankAccountPermissionsData)
        return <>
        </>
    else
        return <>
            <SimpleCrudList
                title={'Dostęp udzielony'}
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
                        return <>{bankPermission.institutionId}</>
                    }
                }
                enableDndReorder={
                    false
                }
            />
        </>
}