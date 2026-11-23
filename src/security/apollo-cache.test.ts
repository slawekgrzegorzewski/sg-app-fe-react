import {createAuthenticatedCache} from './apollo-cache';
import {CounterpartyKind, GetCounterparties} from '../types';


test('retains interface fragment fields for clients and suppliers in the authenticated cache', () => {
    const cache = createAuthenticatedCache();
    const counterparties = [
        {
            __typename: 'Client',
            kind: CounterpartyKind.Client,
            publicId: 'client-1',
            name: 'Klient Mobi Pet Care',
            address: 'Adres klienta',
            taxId: '123',
            active: true
        },
        {
            __typename: 'Supplier',
            kind: CounterpartyKind.Supplier,
            publicId: 'supplier-1',
            name: 'Dostawca',
            address: 'Adres dostawcy',
            taxId: '456',
            active: false
        },
    ];
    cache.writeQuery({query: GetCounterparties, data: {counterparties}});
    expect(cache.readQuery({query: GetCounterparties})).toEqual({counterparties});
});
