CREATE TABLE blasts (
    id TEXT PRIMARY KEY NOT NULL COLLATE NOCASE,
    text TEXT NOT NULL CHECK (length(text) > 0),
    published_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
) STRICT;
