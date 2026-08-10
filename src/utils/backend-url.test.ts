import {resolveBackendUrl} from './backend-url';

describe('resolveBackendUrl', () => {
    const localUrl = 'http://localhost:8080';
    const networkUrl = 'http://192.168.1.20:8080';

    it('keeps localhost when the application is opened locally', () => {
        expect(resolveBackendUrl(localUrl, networkUrl, 'localhost')).toBe(localUrl);
        expect(resolveBackendUrl(localUrl, networkUrl, '127.0.0.1')).toBe(localUrl);
    });

    it('uses the generated network URL when the application is opened from another device', () => {
        expect(resolveBackendUrl(localUrl, networkUrl, '192.168.1.20')).toBe(networkUrl);
    });

    it('keeps the configured URL when no network URL was generated', () => {
        const productionUrl = 'https://be.grzegorzewski.pl';
        expect(resolveBackendUrl(productionUrl, undefined, 'grzegorzewski.pl')).toBe(productionUrl);
    });
});
