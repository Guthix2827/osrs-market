CREATE TABLE IF NOT EXISTS items
(
    id                  INTEGER PRIMARY KEY,
    current_revision_id BIGINT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS item_revisions
(
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    item_id INTEGER NOT NULL
        REFERENCES items(id)
        ON DELETE CASCADE,

    name          TEXT NOT NULL,
    examine       TEXT NOT NULL,
    members       BOOLEAN NOT NULL,

    low_alch      BIGINT,
    high_alch     BIGINT,
    value         BIGINT,
    buy_limit     BIGINT,

    icon_filename TEXT NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE items
    ADD CONSTRAINT items_current_revision_fk
    FOREIGN KEY (current_revision_id)
    REFERENCES item_revisions(id);