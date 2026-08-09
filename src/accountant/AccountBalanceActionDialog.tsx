import {useMutation} from '@apollo/client/react';
import Decimal from 'decimal.js';
import {Account, CreateTransfer, CreateTransferMutation} from '../types';
import InformationDialog from '../utils/dialogs/InformationDialog';
import {CreateTransferForm, TransferDTO} from './CreateTransferForm';

export interface AccountBalanceAction {
    account: Account;
}

export interface AccountBalanceActionDialogProps {
    action: AccountBalanceAction;
    accounts: Account[];
    onClose: () => void;
    onCompleted: () => Promise<unknown>;
}

export function AccountBalanceActionDialog({action, accounts, onClose, onCompleted}: AccountBalanceActionDialogProps) {
    const [createTransferMutation] = useMutation<CreateTransferMutation>(CreateTransfer);

    const closeDialog = () => {
        onClose();
        return Promise.resolve();
    };

    const finishAction = async () => {
        await onCompleted();
        onClose();
    };

    const saveTransfer = async (transfer: TransferDTO) => {
        await createTransferMutation({
            variables: {
                fromAccountPublicId: transfer.fromAccountPublicId!,
                toAccountPublicId: transfer.toAccountPublicId!,
                fromAmount: transfer.fromAmount,
                toAmount: transfer.toAmount,
                description: transfer.description,
                date: transfer.day!.format('YYYY-MM-DD'),
                bankTransactionPublicIds: [],
            },
        });
        await finishAction();
    };

    return (
        <InformationDialog title={`Przelej z konta ${action.account.name}`} open={true} onClose={closeDialog}>
            <CreateTransferForm
                accounts={accounts}
                transferToCreate={{
                    fromAccountPublicId: action.account.publicId,
                    fromAmount: new Decimal(0),
                    toAmount: new Decimal(0),
                    day: null,
                    description: '',
                    possibleDays: [],
                }}
                onClose={transfer => {
                    if (transfer) {
                        void saveTransfer(transfer);
                    } else {
                        onClose();
                    }
                }}
            />
        </InformationDialog>
    );
}
