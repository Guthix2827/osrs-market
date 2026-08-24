import { refreshAccessToken, } from "./fusionAuthClient.js";
import { deleteSession, findSession, updateSessionTokens, } from "./sessionStore.js";
import { sha256, } from "./crypto.js";
const REFRESH_WINDOW_MS = 60 * 1000;
const activeRefreshes = new Map();
const refreshSession = async (session) => {
    if (!session.refreshToken) {
        await deleteSession(session.sessionToken);
        return null;
    }
    const tokens = await refreshAccessToken(session.refreshToken);
    await updateSessionTokens(session.sessionToken, tokens.accessToken, tokens.refreshToken, tokens.expiresAt);
    return {
        ...session,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        accessTokenExpiresAt: tokens.expiresAt,
    };
};
export const getAuthenticatedSession = async (sessionToken) => {
    const session = await findSession(sessionToken);
    if (!session) {
        return null;
    }
    const refreshAfter = Date.now() +
        REFRESH_WINDOW_MS;
    if (session.accessTokenExpiresAt
        .getTime() >
        refreshAfter) {
        return session;
    }
    const refreshKey = sha256(sessionToken)
        .toString("hex");
    const existingRefresh = activeRefreshes.get(refreshKey);
    if (existingRefresh) {
        return existingRefresh;
    }
    const refreshPromise = refreshSession(session);
    activeRefreshes.set(refreshKey, refreshPromise);
    try {
        return await refreshPromise;
    }
    finally {
        activeRefreshes.delete(refreshKey);
    }
};
