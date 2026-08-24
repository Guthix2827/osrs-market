import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from "react";

import {AUTH_BASE_URL,} from "../../config/api.ts";

interface AuthUser {
    id: string;
    email: string | null;
    displayName: string | null;
}

interface AuthContextValue {
    loading: boolean;
    user: AuthUser | null;

    login: () => void;
    logout: () => Promise<void>;
    refreshSession: () => Promise<void>;
}

interface SessionResponse {
    authenticated: boolean;
    user?: AuthUser;
}

const AuthContext =
    createContext<AuthContextValue | null>(
        null,
    );

export function AuthProvider({children,}: { children: ReactNode; }) {
    const [
        loading,
        setLoading,
    ] = useState(true);

    const [
        user,
        setUser,
    ] = useState<AuthUser | null>(
        null,
    );

    const refreshSession =
        useCallback(
            async () => {
                try {
                    const response =
                        await fetch(
                            `${AUTH_BASE_URL}/auth/session`,
                            {
                                credentials:
                                    "same-origin",

                                headers: {
                                    Accept:
                                        "application/json",
                                },
                            },
                        );

                    if (!response.ok) {
                        throw new Error(
                            `Session request failed with ${response.status}`,
                        );
                    }

                    const session = await response.json() as SessionResponse;

                    setUser(
                        session.authenticated
                            ? session.user ?? null
                            : null,
                    );
                } catch {
                    setUser(null);
                } finally {
                    setLoading(false);
                }
            },
            [],
        );

    useEffect(
        () => {
            void refreshSession();
        },
        [
            refreshSession,
        ],
    );

    const login =
        useCallback(
            () => {
                const returnTo =
                    `${window.location.pathname}${window.location.search}`;

                const loginUrl =
                    new URL(
                        "/auth/login",
                        AUTH_BASE_URL,
                    );

                loginUrl.searchParams.set(
                    "returnTo",
                    returnTo,
                );

                window.location.assign(
                    loginUrl,
                );
            },
            [],
        );

    const logout =
        useCallback(
            async () => {
                const response =
                    await fetch(
                        `${AUTH_BASE_URL}/auth/logout`,
                        {
                            method: "POST",

                            credentials:
                                "same-origin",
                        },
                    );

                if (!response.ok) {
                    throw new Error(
                        `Logout request failed with ${response.status}`,
                    );
                }

                setUser(null);
            },
            [],
        );

    const value =
        useMemo<AuthContextValue>(
            () => ({
                loading,
                user,
                login,
                logout,
                refreshSession,
            }),
            [
                loading,
                user,
                login,
                logout,
                refreshSession,
            ],
        );

    return (
        <AuthContext.Provider
            value={value}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth(): AuthContextValue {
    const context =
        useContext(AuthContext);

    if (!context) {
        throw new Error(
            "useAuth must be used inside AuthProvider",
        );
    }

    return context;
}