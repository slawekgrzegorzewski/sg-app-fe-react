import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {AccountBalanceActions} from './AccountBalanceActions';

describe('AccountBalanceActions', () => {
    it('starts a transfer without activating the account row', async () => {
        const user = userEvent.setup();
        const onTransfer = jest.fn();
        const onAccountClick = jest.fn();

        render(
            <div onClick={onAccountClick}>
                <AccountBalanceActions accountName="Konto główne" onTransfer={onTransfer} />
            </div>
        );

        await user.click(screen.getByRole('button', {name: 'Przelej z konta Konto główne'}));

        expect(onTransfer).toHaveBeenCalledTimes(1);
        expect(onAccountClick).not.toHaveBeenCalled();
    });
});
