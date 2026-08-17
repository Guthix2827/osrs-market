CREATE TABLE IF NOT EXISTS price_backfill_state
(
    item_id INTEGER NOT NULL
        REFERENCES items(id)
        ON DELETE CASCADE,

    lookback VARCHAR(8) NOT NULL,

    last_completed_at TIMESTAMPTZ NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (item_id, lookback)
);