const LOOPBACK_HOSTNAMES = new Set(['localhost', '127.0.0.1', '[::1]']);

export function resolveBackendUrl(
    localBackendUrl: string | undefined,
    networkBackendUrl: string | undefined,
    frontendHostname: string
): string {
    if (!localBackendUrl) {
        throw new Error('REACT_APP_BACKEND_URL is not configured.');
    }

    if (LOOPBACK_HOSTNAMES.has(frontendHostname) || !networkBackendUrl) {
        return localBackendUrl;
    }
    return networkBackendUrl;
}

export function getBackendUrl(): string {
    return resolveBackendUrl(
        process.env.REACT_APP_BACKEND_URL,
        process.env.REACT_APP_NETWORK_BACKEND_URL,
        window.location.hostname
    );
}
