import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as Yup from 'yup';
import Form, {EditorField, SelectEditorField} from './Form';

jest.mock('@apollo/client/react', () => ({
    useLazyQuery: jest.fn(),
}));

describe('Form', () => {
    it('keeps an initially undefined select controlled', async () => {
        const user = userEvent.setup();
        const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);

        render(
            <Form
                initialValues={{accountPublicId: undefined as string | undefined}}
                validationSchema={Yup.object({accountPublicId: Yup.string().required()})}
                fields={[
                    {
                        key: 'accountPublicId',
                        label: 'Konto',
                        type: 'SELECT',
                        editable: true,
                        selectOptions: [{key: 'account-id', displayElement: <>Konto główne</>}],
                    } as SelectEditorField,
                ]}
                onSave={jest.fn()}
                onCancel={jest.fn()}
            />
        );

        const combobox = screen.getByRole('combobox', {name: 'Konto'});
        const label = screen.getByText('Konto', {selector: 'label'});
        expect(label).not.toHaveAttribute('for');
        expect(combobox.getAttribute('aria-labelledby')?.split(' ')).toContain(label.id);

        await user.click(combobox);
        await user.click(screen.getByRole('option', {name: 'Konto główne'}));

        const errorMessages = consoleError.mock.calls.flat().join(' ');
        expect(errorMessages).not.toContain('uncontrolled');
        expect(errorMessages).not.toContain('controlled');

        consoleError.mockRestore();
    });

    it('renders the compact dialog presentation with clear actions', () => {
        render(
            <Form
                presentation="dialog"
                initialValues={{description: ''}}
                validationSchema={Yup.object({description: Yup.string().required()})}
                fields={[
                    {
                        key: 'description',
                        label: 'Opis',
                        type: 'TEXTAREA',
                        editable: true,
                    } as EditorField,
                ]}
                onSave={jest.fn()}
                onCancel={jest.fn()}
            />
        );

        expect(screen.getByRole('textbox', {name: 'Opis'})).toHaveClass('MuiFilledInput-input');
        expect(screen.getByRole('button', {name: 'Anuluj'})).toBeVisible();
        expect(screen.getByRole('button', {name: 'Zapisz'})).toHaveClass('MuiButton-contained');
    });
});
