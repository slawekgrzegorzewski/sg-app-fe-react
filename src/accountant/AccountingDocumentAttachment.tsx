import {useRef, useState} from 'react';
import {useApolloClient, useMutation} from '@apollo/client/react';
import {Alert, Button, Chip, Stack, Typography} from '@mui/material';
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import {DeleteButton} from '../utils/buttons/DeleteButton';
import {
    DeleteAccountingDocumentAttachment,
    DeleteAccountingDocumentAttachmentMutation,
    DownloadAccountingDocumentAttachment,
    DownloadAccountingDocumentAttachmentQuery,
    UploadAccountingDocumentAttachment,
    UploadAccountingDocumentAttachmentMutation,
} from '../types';

type AccountingDocumentAttachmentProps = {
    publicId: string;
    fileName?: string | null;
} & ({
    readOnly: true;
    onChange?: never;
} | {
    readOnly?: false;
    onChange: (fileName: string | null) => Promise<void>;
});

const maxPdfSize = 10 * 1024 * 1024;

export function AccountingDocumentAttachment(
        {publicId, fileName, onChange, readOnly}: AccountingDocumentAttachmentProps) {
    const input = useRef<HTMLInputElement>(null);
    const operationInProgress = useRef(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [upload] = useMutation<UploadAccountingDocumentAttachmentMutation>(UploadAccountingDocumentAttachment);
    const [remove] = useMutation<DeleteAccountingDocumentAttachmentMutation>(DeleteAccountingDocumentAttachment);
    const client = useApolloClient();

    async function run(
            action: () => Promise<void>,
            errorMessage: string) {
        if (operationInProgress.current) {
            return;
        }
        operationInProgress.current = true;
        setBusy(true);
        setError('');
        try {
            await action();
        } catch {
            setError(errorMessage);
        } finally {
            operationInProgress.current = false;
            setBusy(false);
        }
    }

    async function uploadAttachment(file: File) {
        if (!file.name.toLowerCase().endsWith('.pdf') || file.size === 0 || file.size > maxPdfSize) {
            setError('Wybierz plik PDF o rozmiarze do 10 MB.');
            return;
        }
        await run(
                async () => {
                    const result = await upload(
                            {variables: {publicId, file}});
                    if (!result.data?.uploadAccountingDocumentAttachment) {
                        throw new Error('Missing attachment name');
                    }
                    await onChange?.(result.data.uploadAccountingDocumentAttachment);
                },
                'Nie udało się przesłać pliku. Sprawdź, czy to prawidłowy PDF, i spróbuj ponownie.');
    }

    async function downloadAttachment() {
        await run(
                async () => {
                    const result = await client.query<DownloadAccountingDocumentAttachmentQuery>(
                            {query: DownloadAccountingDocumentAttachment, variables: {publicId}, fetchPolicy: 'no-cache'});
                    const attachment = result.data?.accountingDocumentAttachment;
                    if (!attachment) {
                        throw new Error('Missing attachment');
                    }
                    const bytes = Uint8Array.from(
                            atob(attachment.contentBase64),
                            character => character.charCodeAt(0));
                    const url = URL.createObjectURL(
                            new Blob([bytes], {type: 'application/pdf'}));
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = attachment.fileName;
                    document.body.appendChild(link);
                    link.click();
                    link.remove();
                    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
                },
                'Nie udało się pobrać pliku PDF.');
    }

    async function removeAttachment() {
        await run(
                async () => {
                    const result = await remove(
                            {variables: {publicId}});
                    if (!result.data?.deleteAccountingDocumentAttachment) {
                        throw new Error('Attachment was not removed');
                    }
                    await onChange?.(null);
                },
                'Nie udało się usunąć pliku PDF.');
    }

    if (readOnly) {
        return (
            <Stack spacing={0.5} alignItems="flex-start" aria-busy={busy} sx={{minWidth: 0}}>
                <Chip
                    size="small"
                    sx={{color: 'text.primary'}}
                    variant="outlined"
                    color={fileName ? 'success' : 'warning'}
                    icon={fileName ? <AttachFileIcon/> : <LinkOffIcon/>}
                    label={fileName ? 'PDF załączony' : 'Brak załącznika'}
                />
                {fileName && (
                    <Button
                        size="small"
                        color="inherit"
                        startIcon={<PictureAsPdfOutlinedIcon/>}
                        disabled={busy}
                        onClick={() => void downloadAttachment()}
                        aria-label={`Pobierz PDF: ${fileName}`}
                        sx={{maxWidth: '100%', textTransform: 'none', textAlign: 'left', overflowWrap: 'anywhere'}}
                    >
                        {fileName}
                    </Button>
                )}
                {error && <Alert severity="error">{error}</Alert>}
            </Stack>
        );
    }

    return (
        <Stack spacing={1} aria-busy={busy}>
            <Typography variant="subtitle2">Załącznik PDF</Typography>
            <Typography variant="body2" color="text.secondary" sx={{overflowWrap: 'anywhere'}}>
                {fileName || 'Brak załącznika PDF.'}
            </Typography>
            {error && <Alert severity="error">{error}</Alert>}
            <Stack direction="row" flexWrap="wrap" gap={1}>
                <input
                    ref={input}
                    type="file"
                    accept=".pdf,application/pdf"
                    aria-label="Wybierz plik PDF"
                    disabled={busy}
                    hidden
                    onChange={event => {
                        const file = event.currentTarget.files?.[0];
                        event.currentTarget.value = '';
                        if (file) {
                            void uploadAttachment(file);
                        }
                    }}
                />
                <Button disabled={busy} onClick={() => input.current?.click()}>
                    {fileName ? 'Podmień PDF' : 'Dodaj PDF'}
                </Button>
                {fileName && (
                    <>
                        <Button disabled={busy} onClick={() => void downloadAttachment()}>Pobierz PDF</Button>
                        <DeleteButton
                            object={fileName}
                            title="Usunąć załącznik PDF?"
                            confirmationMessage={<>Plik „{fileName}” zostanie usunięty z dokumentu.</>}
                            buttonContent={<Button color="error" disabled={busy}>Usuń PDF</Button>}
                            onDelete={removeAttachment}
                            onCancel={async () => {}}
                        />
                    </>
                )}
            </Stack>
        </Stack>
    );
}
