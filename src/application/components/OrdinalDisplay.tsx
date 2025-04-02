import * as React from "react";
import getUserLocale from "get-user-locale";

export type OrdinalDisplayProps = {
    value: number;
}

export function OrdinalDisplay({value}: OrdinalDisplayProps) {
    const userLocale = getUserLocale();
    if (userLocale !== 'pl-PL' && userLocale !== 'pl') {
        throw Error(userLocale + ' is not supported');
    }

    function convertPL(value: number) {
        function convertBase(value: number) {
            switch (value) {
                case 1:
                    return "pierwszy";
                case 2:
                    return "drugi";
                case 3:
                    return "trzeci";
                case 4:
                    return "czwarty";
                case 5:
                    return "piąty";
                case 6:
                    return "szósty";
                case 7:
                    return "siódmy";
                case 8:
                    return "ósmy";
                case 9:
                    return "dziewiąty";
                case 0:
                    return "dziesiąty";
                case 11:
                    return "jedenasty";
                case 12:
                    return "dwunasty";
                case 13:
                    return "trzynasty";
                case 14:
                    return "czternasty";
                case 15:
                    return "piętnasty";
                case 16:
                    return "szesnasty";
                case 17:
                    return "siedemnasty";
                case 18:
                    return "osiemnasty";
                case 19:
                    return "dziewiętnasty";
            }
        }

        function convertTenths(value: number) {
            switch (value) {
                case 20:
                    return "dwudziesty";
                case 30:
                    return "trzydziesty";
                case 40:
                    return "czterdziesty";
                case 50:
                    return "pięćdziesiąty";
                case 60:
                    return "sześćdziesiąty";
                case 70:
                    return "siedemdziesiąty";
                case 80:
                    return "ósiemdziesiąty";
                case 90:
                    return "dziewięćdziesiąty";
            }
        }

        const value1 = Math.floor(value / 10) * 10;
        return (value < 20) ? convertBase(value) : convertTenths(value1) + " " + convertBase(value % 10);
    }

    return (<>{convertPL(value)}</>
    );
}