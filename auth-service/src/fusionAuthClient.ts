import {
    createHash,
} from "node:crypto";

import {
    config,
} from "./config.js";

import {
    randomToken,
} from "./crypto.js";

export interface FusionAuthTokens {
    accessToken: string;
    refreshToken: string | null;
    expiresAt: Date;
}

export interface FusionAuthUser {
    id: string;
    email: string | null;
    displayName: string | null;
}

const endpoint = (
    path: string,
): URL =>
    new URL(
        path,
        config.fusionAuthInternalUrl,
    );

const clientAuthenticationParameters =
    (): Record<string, string> =>
        config.fusionAuthClientSecret
            ? {
                client_secret:
                config.fusionAuthClientSecret,
            }
            : {};

const readJson = async <T>(
    response: Response,
): Promise<T> => {
    if (!response.ok) {
        const body =
            await response.text();

        throw new Error(
            `FusionAuth request failed with ${response.status}: ${body}`,
        );
    }

    return response.json() as Promise<T>;
};

export const createAuthorizationRequest =
    async (): Promise<{
        authorizationUrl: URL;
        state: string;
        codeVerifier: string;
    }> => {
        const state =
            randomToken();

        const codeVerifier =
            randomToken(64);

        const codeChallenge =
            createHash("sha256")
                .update(
                    codeVerifier,
                    "ascii",
                )
                .digest("base64url");

        const authorizationUrl =
            new URL(
                "/oauth2/authorize",
                config.fusionAuthPublicUrl,
            );

        authorizationUrl.search =
            new URLSearchParams({
                client_id:
                config.fusionAuthApplicationId,

                redirect_uri:
                config.oauthRedirectUri,

                response_type:
                    "code",

                scope:
                    "openid profile email offline_access",

                state,

                code_challenge:
                codeChallenge,

                code_challenge_method:
                    "S256",
            }).toString();

        return {
            authorizationUrl,
            state,
            codeVerifier,
        };
    };

export const exchangeAuthorizationCode =
    async (
        code: string,
        codeVerifier: string,
    ): Promise<FusionAuthTokens> => {
        const response =
            await fetch(
                endpoint("/oauth2/token"),
                {
                    method: "POST",

                    headers: {
                        "content-type":
                            "application/x-www-form-urlencoded",
                    },

                    body:
                        new URLSearchParams({
                            grant_type:
                                "authorization_code",

                            client_id:
                            config.fusionAuthApplicationId,

                            code,

                            code_verifier:
                            codeVerifier,

                            redirect_uri:
                            config.oauthRedirectUri,

                            ...clientAuthenticationParameters(),
                        }),
                },
            );

        const body =
            await readJson<{
                access_token: string;
                refresh_token?: string;
                expires_in: number;
            }>(response);

        return {
            accessToken:
            body.access_token,

            refreshToken:
                body.refresh_token ?? null,

            expiresAt:
                new Date(
                    Date.now() +
                    body.expires_in * 1000,
                ),
        };
    };

export const refreshAccessToken =
    async (
        refreshToken: string,
    ): Promise<FusionAuthTokens> => {
        const response =
            await fetch(
                endpoint("/oauth2/token"),
                {
                    method: "POST",

                    headers: {
                        "content-type":
                            "application/x-www-form-urlencoded",
                    },

                    body:
                        new URLSearchParams({
                            grant_type:
                                "refresh_token",

                            client_id:
                            config.fusionAuthApplicationId,

                            refresh_token:
                            refreshToken,

                            ...clientAuthenticationParameters(),
                        }),
                },
            );

        const body =
            await readJson<{
                access_token: string;
                refresh_token?: string;
                expires_in: number;
            }>(response);

        return {
            accessToken:
            body.access_token,

            refreshToken:
                body.refresh_token ??
                refreshToken,

            expiresAt:
                new Date(
                    Date.now() +
                    body.expires_in * 1000,
                ),
        };
    };

export const fetchUser =
    async (
        accessToken: string,
    ): Promise<FusionAuthUser> => {
        const response =
            await fetch(
                endpoint("/oauth2/userinfo"),
                {
                    headers: {
                        authorization:
                            `Bearer ${accessToken}`,
                    },
                },
            );

        const body =
            await readJson<{
                sub: string;
                email?: string;
                name?: string;
                preferred_username?: string;
            }>(response);

        if (!body.sub) {
            throw new Error(
                "FusionAuth UserInfo response is missing sub",
            );
        }

        return {
            id:
            body.sub,

            email:
                body.email ?? null,

            displayName:
                body.name ??
                body.preferred_username ??
                null,
        };
    };

export const revokeRefreshToken =
    async (
        refreshToken: string,
    ): Promise<void> => {
        const response =
            await fetch(
                endpoint("/oauth2/revoke"),
                {
                    method: "POST",

                    headers: {
                        "content-type":
                            "application/x-www-form-urlencoded",
                    },

                    body:
                        new URLSearchParams({
                            client_id:
                            config.fusionAuthApplicationId,

                            token:
                            refreshToken,

                            token_type_hint:
                                "refresh_token",

                            ...clientAuthenticationParameters(),
                        }),
                },
            );

        if (!response.ok) {
            throw new Error(
                `FusionAuth token revocation failed with ${response.status}`,
            );
        }
    };