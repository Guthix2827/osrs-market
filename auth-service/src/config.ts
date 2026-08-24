const requireValue = (name: string): string => {
    const value = process.env[name];

    if (!value) {
        throw new Error(`${name} is not set`);
    }

    return value;
};

const parsePositiveInteger = (
    name: string,
    fallback: number,
): number => {
    const raw = process.env[name];

    if (!raw) {
        return fallback;
    }

    const value = Number(raw);

    if (!Number.isSafeInteger(value) || value <= 0) {
        throw new Error(`${name} must be a positive integer`);
    }

    return value;
};

const tokenEncryptionKey =
    requireValue("TOKEN_ENCRYPTION_KEY");

if (!/^[0-9a-f]{64}$/i.test(tokenEncryptionKey)) {
    throw new Error(
        "TOKEN_ENCRYPTION_KEY must be 32 bytes encoded as 64 hexadecimal characters",
    );
}

export const config = {
    port: parsePositiveInteger("PORT", 3000),

    databaseUrl:
        requireValue("DATABASE_URL"),

    fusionAuthInternalUrl:
        new URL(requireValue("FUSIONAUTH_INTERNAL_URL")),

    fusionAuthPublicUrl:
        new URL(requireValue("FUSIONAUTH_PUBLIC_URL")),

    fusionAuthApplicationId:
        requireValue("FUSIONAUTH_APPLICATION_ID"),

    fusionAuthClientSecret:
        process.env.FUSIONAUTH_CLIENT_SECRET || null,

    oauthRedirectUri:
        requireValue("OAUTH_REDIRECT_URI"),

    frontendUrl:
        new URL(requireValue("FRONTEND_URL")),

    tokenEncryptionKey:
        Buffer.from(tokenEncryptionKey, "hex"),

    sessionCookieName:
        process.env.SESSION_COOKIE_NAME ??
        "osrs_market_session",

    sessionCookieSecure:
        process.env.SESSION_COOKIE_SECURE === "true",

    sessionTtlSeconds:
        parsePositiveInteger(
            "SESSION_TTL_SECONDS",
            30 * 24 * 60 * 60,
        ),

    oauthAttemptTtlSeconds:
        parsePositiveInteger(
            "OAUTH_ATTEMPT_TTL_SECONDS",
            10 * 60,
        ),
} as const;