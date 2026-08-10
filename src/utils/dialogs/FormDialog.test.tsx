import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as Yup from 'yup';
import {FormDialog} from './FormDialog';

jest.mock('@apollo/client/react', () => ({
    useLazyQuery: jest.fn(),
}));

describe('FormDialog', () => {
    it('cancels the form when Escape is pressed', async () => {
        const user = userEvent.setup();
        const onCancel = jest.fn().mockResolvedValue(undefined);

        render(
            <FormDialog
                dialogTitle={<>Formularz testowy</>}
                open
                onConfirm={jest.fn().mockResolvedValue(undefined)}
                onCancel={onCancel}
                formProps={{
                    fields: [],
                    initialValues: {},
                    validationSchema: Yup.object({}),
                }}
            />
        );

        expect(screen.getByRole('dialog', {name: 'Formularz testowy'})).toBeVisible();
        await user.keyboard('{Escape}');

        expect(onCancel).toHaveBeenCalledTimes(1);
    });
});
