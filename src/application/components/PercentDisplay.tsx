import * as React from 'react';
import Decimal from 'decimal.js';

export type PercentDisplayProps = {
    rate: number;
};

export function PercentDisplay({rate}: PercentDisplayProps) {
    return <>{new Decimal(rate).mul(100).toString()} %</>;
}
