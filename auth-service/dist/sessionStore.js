import { config, } from "./config.js";
import { decrypt, encrypt, randomToken, sha256, } from "./crypto.js";
import { pool, } from "./database.js";
export const saveOAuthAttempt = async (state, codeVerifier, returnTo) => {
    await pool.query(`
        INSERT INTO auth_oauth_attempts
        (
          state_hash,
          code_verifier,
          return_to,
          expires_at
        )
        VALUES
        (
          $1,
          $2,
          $3,
          CURRENT_TIMESTAMP +
            ($4 * INTERVAL '1 second')
        )
      `, [
        sha256(state),
        codeVerifier,
        returnTo,
        config.oauthAttemptTtlSeconds,
    ]);
};
export const consumeOAuthAttempt = async (state) => {
    const result = await pool.query(`
          DELETE FROM auth_oauth_attempts
          WHERE state_hash = $1
            AND expires_at >
              CURRENT_TIMESTAMP
          RETURNING
            code_verifier,
            return_to
        `, [
        sha256(state),
    ]);
    const row = result.rows[0];
    return row
        ? {
            codeVerifier: row.code_verifier,
            returnTo: row.return_to,
        }
        : null;
};
export const createSession = async (input) => {
    const sessionToken = randomToken();
    await pool.query(`
        INSERT INTO auth_sessions
        (
          session_hash,
          fusionauth_user_id,
          email,
          display_name,
          access_token_encrypted,
          refresh_token_encrypted,
          access_token_expires_at,
          expires_at
        )
        VALUES
        (
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7,
          CURRENT_TIMESTAMP +
            ($8 * INTERVAL '1 second')
        )
      `, [
        sha256(sessionToken),
        input.fusionAuthUserId,
        input.email,
        input.displayName,
        encrypt(input.accessToken, config.tokenEncryptionKey),
        input.refreshToken
            ? encrypt(input.refreshToken, config.tokenEncryptionKey)
            : null,
        input.accessTokenExpiresAt,
        config.sessionTtlSeconds,
    ]);
    return sessionToken;
};
export const findSession = async (sessionToken) => {
    const result = await pool.query(`
          UPDATE auth_sessions
          SET
            last_seen_at =
              CURRENT_TIMESTAMP
          WHERE session_hash = $1
            AND expires_at >
              CURRENT_TIMESTAMP
          RETURNING
            fusionauth_user_id,
            email,
            display_name,
            access_token_encrypted,
            refresh_token_encrypted,
            access_token_expires_at,
            expires_at
        `, [
        sha256(sessionToken),
    ]);
    const row = result.rows[0];
    if (!row) {
        return null;
    }
    return {
        sessionToken,
        fusionAuthUserId: row.fusionauth_user_id,
        email: row.email,
        displayName: row.display_name,
        accessToken: decrypt(row.access_token_encrypted, config.tokenEncryptionKey),
        refreshToken: row.refresh_token_encrypted
            ? decrypt(row.refresh_token_encrypted, config.tokenEncryptionKey)
            : null,
        accessTokenExpiresAt: row.access_token_expires_at,
        expiresAt: row.expires_at,
    };
};
export const updateSessionTokens = async (sessionToken, accessToken, refreshToken, accessTokenExpiresAt) => {
    await pool.query(`
        UPDATE auth_sessions
        SET
          access_token_encrypted = $2,
          refresh_token_encrypted = $3,
          access_token_expires_at = $4,
          last_seen_at =
            CURRENT_TIMESTAMP
        WHERE session_hash = $1
      `, [
        sha256(sessionToken),
        encrypt(accessToken, config.tokenEncryptionKey),
        refreshToken
            ? encrypt(refreshToken, config.tokenEncryptionKey)
            : null,
        accessTokenExpiresAt,
    ]);
};
export const deleteSession = async (sessionToken) => {
    await pool.query(`
        DELETE FROM auth_sessions
        WHERE session_hash = $1
      `, [
        sha256(sessionToken),
    ]);
};
