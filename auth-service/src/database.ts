import pg from "pg";

import {
    config,
} from "./config.js";

const {
    Pool,
} = pg;

export const pool =
    new Pool({
        connectionString:
        config.databaseUrl,

        max: 5,
    });

export const migrateAuthDatabase =
    async (): Promise<void> => {
        await pool.query(`
      CREATE TABLE IF NOT EXISTS auth_oauth_attempts
      (
        state_hash BYTEA PRIMARY KEY,
        code_verifier TEXT NOT NULL,
        return_to TEXT NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL
          DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS auth_sessions
      (
        session_hash BYTEA PRIMARY KEY,
        fusionauth_user_id TEXT NOT NULL,
        email TEXT,
        display_name TEXT,
        access_token_encrypted TEXT NOT NULL,
        refresh_token_encrypted TEXT,
        access_token_expires_at TIMESTAMPTZ NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL
          DEFAULT CURRENT_TIMESTAMP,
        last_seen_at TIMESTAMPTZ NOT NULL
          DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS
        auth_sessions_user_id_idx
      ON auth_sessions(
        fusionauth_user_id
      );

      CREATE INDEX IF NOT EXISTS
        auth_sessions_expires_at_idx
      ON auth_sessions(
        expires_at
      );
    `);
    };

export const removeExpiredAuthData =
    async (): Promise<void> => {
        await pool.query(`
      DELETE FROM auth_oauth_attempts
      WHERE expires_at <= CURRENT_TIMESTAMP
    `);

        await pool.query(`
      DELETE FROM auth_sessions
      WHERE expires_at <= CURRENT_TIMESTAMP
    `);
    };