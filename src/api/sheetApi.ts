import axios from "axios";

const API_URL: string =
    "https://script.google.com/macros/s/AKfycbwaLfAQXjyxaztR6a9ev2-d-uU89MsPzcgyFNWOdQLcG_dBppGMNk0jd6_fg52VZvI_og/exec";

type RecordsResponse<T> = {
    records?: T[];
    error?: string;
}

type MutationResponse<T> = {
    message?: string;
    data?: T;
    error?: string;
}

type BulkMutationResponse<T> = {
    message?: string;
    data?: T[];
    records?: T[];
    error?: string;
}

type ActionResponse<T> = T & {
    message?: string;
    error?: string;
}

const postTextJson = async <T>(body: unknown): Promise<T> => {
    const response = await axios.post<T>(
        API_URL,
        JSON.stringify(body),
        {
            headers: {
                "Content-Type": "text/plain;charset=utf-8"
            }
        }
    );

    return response.data;
};

export const getRecords = async <T>(
    sheetName: string,
    state: number = 0
): Promise<T[]> => {
    const response = await axios.get<RecordsResponse<T>>(
        API_URL,
        {
            params: {
                action: "get",
                sheetName,
                state
            }
        }
    );

    if (response.data.error !== undefined) {
        throw new Error(response.data.error);
    }

    return response.data.records ?? [];
};

export const createRecord = async <T>(
    sheetName: string,
    data: Partial<T>
): Promise<T> => {
    const result = await postTextJson<MutationResponse<T>>({
        action: "create",
        sheetName,
        data
    });

    if (result.error !== undefined) {
        throw new Error(result.error);
    }

    if (result.data === undefined) {
        throw new Error(result.message ?? "Backend không trả dữ liệu mới");
    }

    return result.data;
};

export const createRecords = async <T>(
    sheetName: string,
    data: Partial<T>[]
): Promise<T[]> => {
    const result = await postTextJson<BulkMutationResponse<T>>({
        action: "create",
        sheetName,
        data
    });

    if (result.error !== undefined) {
        throw new Error(result.error);
    }

    return result.records ?? result.data ?? [];
};

export const updateRecord = async <T>(
    sheetName: string,
    data: Partial<T>
): Promise<MutationResponse<T>> => {
    const result = await postTextJson<MutationResponse<T>>({
        action: "update",
        sheetName,
        data
    });

    if (result.error !== undefined) {
        throw new Error(result.error);
    }

    return result;
};

export const deleteRecord = async <T>(
    sheetName: string,
    id: string
): Promise<MutationResponse<T>> => {
    const result = await postTextJson<MutationResponse<T>>({
        action: "delete",
        sheetName,
        data: {
            id
        }
    });

    if (result.error !== undefined) {
        throw new Error(result.error);
    }

    return result;
};

export const runSheetAction = async <T>(
    action: string,
    data: unknown = {}
): Promise<ActionResponse<T>> => {
    const result = await postTextJson<ActionResponse<T>>({
        action,
        data
    });

    if (result.error !== undefined) {
        throw new Error(result.error);
    }

    return result;
};
