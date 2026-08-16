CREATE TABLE IF NOT EXISTS price_events
(
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    item_id INTEGER NOT NULL
        REFERENCES items(id)
        ON DELETE CASCADE,

    timestamp BIGINT NOT NULL,

    avg_high_price BIGINT,
    avg_low_price BIGINT,

    high_price_volume BIGINT NOT NULL DEFAULT 0,
    low_price_volume BIGINT NOT NULL DEFAULT 0,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS price_events_item_timestamp_idx
    ON price_events(item_id, timestamp DESC);