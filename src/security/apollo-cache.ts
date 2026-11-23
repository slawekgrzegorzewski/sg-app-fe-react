import {defaultDataIdFromObject, InMemoryCache} from '@apollo/client/cache';
import {Institution} from '../types';

export function createAuthenticatedCache() {
    return new InMemoryCache({
        possibleTypes: {Counterparty: ['Client', 'Supplier']},
        dataIdFromObject: object => {
            switch (object.__typename) {
                case 'Task': {
                    const timeRecords = (object.timeRecords ?? []) as { __ref?: string }[];
                    if (timeRecords.length > 0) {
                        const datesPart = timeRecords
                            .map(timeRecord => timeRecord.__ref)
                            .sort()
                            .join(':');
                        return `Task:${object.id}:${timeRecords.length}:${datesPart}`;
                    }
                    return `Task:${object.id}:0`;
                }
                case 'Institution': {
                    const institution = object as Institution;
                    return `Institution:${institution.id}:${institution.bic}`;
                }
                default:
                    return defaultDataIdFromObject(object);
            }
        },
    });
}
