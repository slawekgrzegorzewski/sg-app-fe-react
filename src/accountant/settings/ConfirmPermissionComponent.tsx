import {useEffect, useRef} from 'react';
import {useMutation} from '@apollo/client/react';
import {ConfirmPermission, ConfirmPermissionMutation} from '../../types';
import {useApplicationNavigation} from '../../utils/use-application-navigation';
import {logError} from '../../utils/logger';

export function ConfirmPermissionComponent({reference}: {reference: string}) {
    const [confirmPermissionMutation] = useMutation<ConfirmPermissionMutation>(ConfirmPermission);
    const {setPageParams} = useApplicationNavigation();

    const confirmedReference = useRef<string | null>(null);

    useEffect(() => {
        if (confirmedReference.current === reference) {
            return;
        }
        confirmedReference.current = reference;

        confirmPermissionMutation({variables: {reference: reference}})
            .catch(error => logError(`Could not confirm bank permission ${reference}`, error))
            .finally(() => {
                setPageParams([]);
            });
    }, [reference, confirmPermissionMutation, setPageParams]);

    return <></>;
}
