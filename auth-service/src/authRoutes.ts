import type {
    FastifyInstance,
    FastifyReply,
    FastifyRequest,
} from "fastify";

import {
    getAuthenticatedSession,
} from "./sessionService.js";

import {
    config,
} from "./config.js";

import {
    createAuthorizationRequest,
    exchangeAuthorizationCode,
    fetchUser,
    revokeRefreshToken,
} from "./fusionAuthClient.js";

import {
    consumeOAuthAttempt,
    createSession,
    deleteSession,
    findSession,
    saveOAuthAttempt,
} from "./sessionStore.js";

const cookieOptions = {
    httpOnly: true,

    path: "/",

    sameSite:
        "lax" as const,

    secure:
    config.sessionCookieSecure,

    maxAge:
    config.sessionTtlSeconds,
};

const normalizeReturnTo = (value: unknown): string => {
    if (typeof value !== "string") {
        return "/";
    }

    try {
        const resolvedUrl = new URL(
            value,
            config.frontendUrl,
        );

        if (resolvedUrl.origin !== config.frontendUrl.origin) {
            return "/";
        }

        return `${resolvedUrl.pathname}${resolvedUrl.search}${resolvedUrl.hash}`;
    } catch {
        return "/";
    }
};

const requireSameOrigin = (
    request: FastifyRequest,
    reply: FastifyReply,
): boolean => {
    const origin =
        request.headers.origin;

    if (
        origin !==
        config.frontendUrl.origin
    ) {
        void reply
            .code(403)
            .send({
                error:
                    "Invalid request origin",
            });

        return false;
    }

    return true;
};

export const registerAuthRoutes =
    async (
        app: FastifyInstance,
    ): Promise<void> => {
        app.get<{
            Querystring: {
                returnTo?: string;
            };
        }>(
            "/auth/login",

            async (
                request,
                reply,
            ) => {
                const {
                    authorizationUrl,
                    state,
                    codeVerifier,
                } =
                    await createAuthorizationRequest();

                await saveOAuthAttempt(
                    state,
                    codeVerifier,
                    normalizeReturnTo(
                        request.query.returnTo,
                    ),
                );

                return reply.redirect(
                    authorizationUrl.href,
                );
            },
        );

        app.get<{
            Querystring: {
                code?: string;
                state?: string;
                error?: string;
            };
        }>(
            "/auth/callback",
            async (
                request,
                reply,
            ) => {
                const {
                    code,
                    state,
                    error,
                } = request.query;

                if (
                    error ||
                    !code ||
                    !state
                ) {
                    return reply.redirect(
                        `${config.frontendUrl.origin}/?auth=failed`,
                    );
                }

                const attempt =
                    await consumeOAuthAttempt(
                        state,
                    );

                if (!attempt) {
                    return reply
                        .code(400)
                        .send({
                            error:
                                "Invalid or expired OAuth state",
                        });
                }

                const tokens =
                    await exchangeAuthorizationCode(
                        code,
                        attempt.codeVerifier,
                    );

                const user =
                    await fetchUser(
                        tokens.accessToken,
                    );

                const sessionToken =
                    await createSession({
                        fusionAuthUserId:
                        user.id,

                        email:
                        user.email,

                        displayName:
                        user.displayName,

                        accessToken:
                        tokens.accessToken,

                        refreshToken:
                        tokens.refreshToken,

                        accessTokenExpiresAt:
                        tokens.expiresAt,
                    });

                reply.setCookie(
                    config.sessionCookieName,
                    sessionToken,
                    cookieOptions,
                );

                return reply.redirect(
                    new URL(
                        attempt.returnTo,
                        config.frontendUrl,
                    ).href,
                );
            },
        );

        app.get(
            "/auth/session",

            async (
                request,
                reply,
            ) => {
                const sessionToken =
                    request.cookies[
                        config.sessionCookieName
                        ];

                if (!sessionToken) {
                    return reply.send({
                        authenticated: false,
                    });
                }

                const session = await getAuthenticatedSession(sessionToken);

                if (!session) {
                    reply.clearCookie(config.sessionCookieName, {path: "/",});
                    return reply.send({authenticated: false});
                }

                return reply.send({
                    authenticated: true,
                    user: {
                        id:
                        session.fusionAuthUserId,
                        email:
                        session.email,
                        displayName:
                        session.displayName,
                    },
                });
            },
        );

        app.post("/auth/logout",
            async (
                request,
                reply,
            ) => {
                if (!requireSameOrigin(request, reply)) {
                    return;
                }

                const sessionToken = request.cookies[config.sessionCookieName];

                if (sessionToken) {
                    const session = await findSession(sessionToken);
                    if (session?.refreshToken) {
                        try {
                            await revokeRefreshToken(session.refreshToken);
                        } catch (error) {
                            request.log.warn({error}, "Failed to revoke FusionAuth refresh token");
                        }
                    }

                    await deleteSession(sessionToken);
                }

                reply.clearCookie(config.sessionCookieName, {path: "/"});

                return reply
                    .code(204)
                    .send();
            },
        );
    };