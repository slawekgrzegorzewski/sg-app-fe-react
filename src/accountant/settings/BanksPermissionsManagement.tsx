import * as React from "react";
import {useMutation, useQuery} from "@apollo/client/react";
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
import {Button, Card, CardContent, CardMedia, Stack, Theme} from "@mui/material";
import {GQLBankPermission, GQLInstitution, mapBankPermission, mapInstitution} from "../model/types";
import {InstitutionPickerButton} from "./InstitutionPickerButton";
import Typography from "@mui/material/Typography";
import {FetchBankAccountDataButton} from "./FetchBankAccountDataButton";

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
            <Stack direction="row" spacing={2} justifyContent="space-between">
                <Typography variant={'h6'}>
                    Dostępy do kont bankowych
                </Typography>

                <InstitutionPickerButton
                    onPick={(pickedInstitution) =>
                        startConfirmationProcess(pickedInstitution)}/>
            </Stack>
            <SimpleCrudList
                title={'Dostęp udzielony'}
                createSettings={{
                    dialogTitle: 'Dodaj'
                }}
                highlightRowOnHover={false}
                list={[...bankAccountPermissionsData.bankPermissions.granted]
                    .map(mapBankPermission)
                    .sort(ComparatorBuilder.comparing<GQLBankPermission>(bankPermissions => bankPermissions.institutionId).build())}
                idExtractor={bankPermission => bankPermission.publicId}
                rowContainerProvider={(key: string, sx: SxProps<Theme>, additionalProperties: any) => {
                    return <Card key={key} sx={{marginBottom: '10px', width: '600px', ...sx}} {...additionalProperties}>
                    </Card>;
                }}
                entityDisplay={
                    bankPermission => {
                        return <Stack direction={'row'}>
                            <CardMedia component="img"
                                       image={bankPermission.institution.logo}
                                       sx={{maxWidth: "150px", maxHeight: "150px"}}>
                            </CardMedia>
                            <CardContent>
                                <Stack direction={'column'}>
                                    <Typography variant="h6">
                                        {bankPermission.institution.name}
                                    </Typography>
                                    <Typography variant="body1">
                                        udzielono: {bankPermission.givenAt.toLocaleString()}, do następujących kont:
                                    </Typography>
                                    {bankPermission.bankAccounts.map(bankAccount =>
                                        <Stack direction={'row'}
                                               alignItems={'center'}
                                               spacing={0}
                                               justifyContent={'space-between'}>
                                            <Typography variant={'body1'}>
                                                {bankAccount.iban}
                                            </Typography>
                                            <FetchBankAccountDataButton bankAccount={bankAccount}/>
                                        </Stack>)}
                                </Stack>
                            </CardContent>
                        </Stack>
                    }
                }
                enableDndReorder={
                    false
                }
            />
            <SimpleCrudList
                title={'Autoryzuj dostęp'}
                list={[...bankAccountPermissionsData.bankPermissions.toProcess]
                    .map(mapBankPermission)
                    .sort(ComparatorBuilder.comparing<GQLBankPermission>(bankPermissions => bankPermissions.institutionId).build())}
                idExtractor={bankPermission => bankPermission.publicId}
                highlightRowOnHover={false}
                rowContainerProvider={(key: string, sx: SxProps<Theme>, additionalProperties: any) => {
                    return <Card key={key} sx={{marginBottom: '10px', ...sx}} {...additionalProperties}>
                    </Card>;
                }}
                entityDisplay={
                    bankPermission => {
                        return <Stack direction={'row'}>
                            <CardMedia component="img"
                                       image={bankPermission.institution.logo}
                                       sx={{maxWidth: "150px", maxHeight: "150px"}}>
                            </CardMedia>
                            <CardContent>
                                <Stack direction={'column'}>
                                    <Typography variant="h6">
                                        {bankPermission.institution.name}
                                    </Typography>

                                    <Button
                                        onClick={() => window.location.replace(bankPermission.confirmationLink)}>Autoryzuj</Button>
                                </Stack>
                            </CardContent>
                        </Stack>
                    }
                }
                enableDndReorder={
                    false
                }
            />
            <SimpleCrudList
                title={'Wygasłe pozwolenia'}
                list={[...bankAccountPermissionsData.bankPermissions.toRecreate]
                    .map(mapInstitution)
                    .sort(ComparatorBuilder.comparing<GQLInstitution>(institution => institution.id).build())}
                idExtractor={institution => institution.logo}
                elementsDirection='row'
                rowContainerProvider={(key: string, sx: SxProps<Theme>, additionalProperties: any) => {
                    return <Card key={key}  sx={{
                        marginBottom: '10px', ...sx
                    }} {...additionalProperties}>
                    </Card>;
                }}
                entityDisplay={
                    institution => {
                        return <Stack direction={'row'}>
                            <CardMedia component="img"
                                       image={institution.logo}
                                       sx={{maxWidth: "150px", maxHeight: "150px"}}>
                            </CardMedia>
                            <CardContent>
                                <Stack direction={'column'}>
                                    <Typography variant="h6">
                                        {institution.name}
                                    </Typography>
                                    <Typography variant="body1">
                                        BIC: {institution.bic}
                                    </Typography>
                                    <Button
                                        onClick={() => startConfirmationProcess(institution)}>Odnów</Button>
                                </Stack>
                            </CardContent>
                        </Stack>
                    }
                }
                enableDndReorder={
                    false
                }
            />
        </>
}