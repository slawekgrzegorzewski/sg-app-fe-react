import {useContext} from "react";
import {useMutation} from "@apollo/client";
import {ConfirmPermission, ConfirmPermissionMutation} from "../../types";
import {useApplicationNavigation} from "../../utils/use-application-navigation";
import {ShowBackdropContext} from "../../utils/DrawerAppBar";

export function ConfirmPermissionComponent({reference}: { reference: string }) {
    const [confirmPermissionMutation, confirmPermissionMutationResult] = useMutation<ConfirmPermissionMutation>(ConfirmPermission);
    const {setShowBackdrop} = useContext(ShowBackdropContext);
    const {setPageParams} = useApplicationNavigation();
    if (confirmPermissionMutationResult.called || confirmPermissionMutationResult.loading) {
        return <></>;
    }

    setTimeout(() => {
        setShowBackdrop(true);
        confirmPermissionMutation({variables: {reference: reference}})
            .catch((error) => {
            })
            .finally(() => {
                setShowBackdrop(false);
                setPageParams([]);
            });
    }, 10);
    return <></>;
}