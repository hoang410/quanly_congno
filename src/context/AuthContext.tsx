import {
    useCallback,
    useMemo,
    useState,
    type ReactNode
} from "react";

import {
    AuthContext,
    type AuthContextType
} from "./authContextValue";
import type { User } from "../types/auth";

type AuthProviderProps = {
    children: ReactNode;
}

const STORAGE_KEY = "productManagerUser";

const readStoredUser = (): User | null => {
    const rawUser = localStorage.getItem(STORAGE_KEY);

    if (rawUser === null) {
        return null;
    }

    try {
        return JSON.parse(rawUser) as User;
    } catch {
        localStorage.removeItem(STORAGE_KEY);
        return null;
    }
};

export function AuthProvider(props: AuthProviderProps) {
    const [user, setUserState] = useState<User | null>(readStoredUser);

    const setUser = useCallback((nextUser: User | null) => {
        setUserState(nextUser);

        if (nextUser === null) {
            localStorage.removeItem(STORAGE_KEY);
            return;
        }

        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(nextUser)
        );
    }, []);

    const contextValue = useMemo<AuthContextType>(() => {
        return {
            user,
            setUser
        };
    }, [user, setUser]);

    return (
        <AuthContext.Provider value={contextValue}>
            {props.children}
        </AuthContext.Provider>
    );
}
