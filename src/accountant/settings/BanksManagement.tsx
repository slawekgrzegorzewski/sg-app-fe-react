import * as React from "react";
import {Navigate, useParams, useSearchParams} from "react-router-dom";
import {BanksPermissionsManagement} from "./BanksPermissionsManagement";
import {useApplicationNavigation} from "../../utils/use-application-navigation";
import {ConfirmPermissionComponent} from "./ConfirmPermissionComponent";

export function BanksManagement() {

    const {getPagePathWithParams} = useApplicationNavigation();
    const {param1} = useParams();
    const [searchParams] = useSearchParams();
    const reference = searchParams.get('ref');
    if (reference) {
        return <Navigate to={getPagePathWithParams([reference])}></Navigate>;
    } else if (param1) {
        return <ConfirmPermissionComponent reference={param1}></ConfirmPermissionComponent>;
    } else {
        return <BanksPermissionsManagement></BanksPermissionsManagement>
    }
}