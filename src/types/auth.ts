export type User = {
    id: string;
    username: string;
    role: string;
}

export type LoginResponse = {
    success: boolean;
    message?: string;
    user?: User;
}
