const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Thin logging seam so diagnostics are not scattered `console.*` calls.
 *
 * Errors are always reported, because swallowing them silently is worse than a
 * noisy console. Warnings and debug output are development-only and are dropped
 * from production bundles.
 */
export const logError = (message: string, ...details: unknown[]): void => {
    // eslint-disable-next-line no-console
    console.error(message, ...details);
};

export const logWarning = (message: string, ...details: unknown[]): void => {
    if (isDevelopment) {
        // eslint-disable-next-line no-console
        console.warn(message, ...details);
    }
};

export const logDebug = (message: string, ...details: unknown[]): void => {
    if (isDevelopment) {
        // eslint-disable-next-line no-console
        console.debug(message, ...details);
    }
};
