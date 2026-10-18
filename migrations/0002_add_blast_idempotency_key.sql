ALTER TABLE blasts ADD COLUMN idempotency_key TEXT;

CREATE UNIQUE INDEX blasts_idempotency_key ON blasts (idempotency_key);
