import React from 'react';
import {CounterpartyKind} from '../../types';
import {CounterpartyManagement} from './CounterpartyManagement';

export function ClientsManagement() {
    return <CounterpartyManagement kind={CounterpartyKind.Client}/>;
}
