import * as React from "react";

export type PercentDisplayProps = {
    rate: number;
}

export function PercentDisplay({rate}: PercentDisplayProps) {

    return (<>{rate * 100} %</>
    );
}