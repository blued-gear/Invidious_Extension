const dateFormatter = new Intl.DateTimeFormat('sv-SE', {// for reason of the locale see https://stackoverflow.com/questions/25050034/get-iso-8601-using-intl-datetimeformat
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
});

export function formatDate(time: number): string {
    return dateFormatter.format(time);
}
