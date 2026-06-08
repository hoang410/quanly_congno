const APP_TIME_ZONE = "Asia/Ho_Chi_Minh";

const appDateFormatter = new Intl.DateTimeFormat(
    "en-US",
    {
        timeZone: APP_TIME_ZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    }
);

const toText = (value: unknown) => {
    if (value === null || value === undefined) {
        return "";
    }

    return String(value);
};

const formatDateKeyInAppTimeZone = (date: Date) => {
    const parts = appDateFormatter.formatToParts(date);
    const getPart = (type: string) => {
        return parts.find((part) => part.type === type)?.value ?? "";
    };

    return `${getPart("year")}-${getPart("month")}-${getPart("day")}`;
};

export const getTodayInputValue = () => {
    return formatDateKeyInAppTimeZone(new Date());
};

export const normalizeDateKey = (value: unknown) => {
    const text = toText(value).trim();

    if (text === "") {
        return "";
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
        return text;
    }

    const isoDateTimeMatch = text.match(/^\d{4}-\d{2}-\d{2}T/);

    if (isoDateTimeMatch !== null) {
        const parsedDate = new Date(text);

        return Number.isNaN(parsedDate.getTime())
            ? ""
            : formatDateKeyInAppTimeZone(parsedDate);
    }

    const isoDateLikeMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})/);

    if (isoDateLikeMatch !== null) {
        return `${isoDateLikeMatch[1]}-${isoDateLikeMatch[2]}-${isoDateLikeMatch[3]}`;
    }

    const slashMatch = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);

    if (slashMatch !== null) {
        const day = slashMatch[1].padStart(2, "0");
        const month = slashMatch[2].padStart(2, "0");
        const year = slashMatch[3];

        return `${year}-${month}-${day}`;
    }

    const parsedDate = new Date(text);

    return Number.isNaN(parsedDate.getTime())
        ? ""
        : formatDateKeyInAppTimeZone(parsedDate);
};

export const formatDateKeyForDisplay = (dateKey: string) => {
    if (dateKey === "") {
        return "";
    }

    const [year, month, day] = dateKey.split("-");

    if (year === undefined || month === undefined || day === undefined) {
        return dateKey;
    }

    return `${day}/${month}/${year}`;
};

export const formatDateForDisplay = (value: unknown) => {
    const text = toText(value).trim();

    if (text === "") {
        return "";
    }

    const dateKey = normalizeDateKey(text);

    return dateKey === ""
        ? text
        : formatDateKeyForDisplay(dateKey);
};
