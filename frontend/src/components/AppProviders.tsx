import type {
    ReactNode,
} from "react";

import {
    BrowserRouter,
} from "react-router-dom";

import {
    AuthProvider,
} from "./auth/AuthContext.tsx";

import {
    WatchlistProvider,
} from "./watchlist/WatchlistContext.tsx";

interface AppProvidersProps {
    children: ReactNode;
}

export function AppProviders(
    {
        children,
    }: AppProvidersProps,
) {
    return (
        <BrowserRouter>
            <AuthProvider>
                <WatchlistProvider>
                    {children}
                </WatchlistProvider>
            </AuthProvider>
        </BrowserRouter>
    );
}