import React from 'react';
import {CounterpartyKind} from '../../types';
import {CounterpartyManagement} from './CounterpartyManagement';

export function SuppliersManagement() {
    return <CounterpartyManagement kind={CounterpartyKind.Supplier}/>;
}
