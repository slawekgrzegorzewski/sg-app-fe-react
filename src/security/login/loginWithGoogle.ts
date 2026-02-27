export {};

declare global {
    interface Window {
        handleCredentialResponse: (response: { credential: string; }) => void
    }
}