export const compareDates = (d1: Date, d2: Date) => {
    return d1.getDate() - d2.getDate();
};

export const maxDate = (dates: Date[]) => {
    if (dates.length === 0) return new Date();
    if (dates.length === 1) return dates[0];
    return dates.reduce((d1, d2) => d1 > d2 ? d1 : d2);
}