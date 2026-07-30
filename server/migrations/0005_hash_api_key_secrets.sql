-- api_keys.secret was stored in plaintext. Secrets are already high-entropy
-- (crypto.randomBytes(32).toString('hex')), so a fast SHA-256 hash is enough to
-- protect them at rest without needing a slow KDF like bcrypt.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE api_keys ADD COLUMN secret_hash TEXT;

-- encode(digest(x,'sha256'),'hex') matches Node's
-- crypto.createHash('sha256').update(x).digest('hex'), so existing keys keep working.
UPDATE api_keys SET secret_hash = encode(digest(secret, 'sha256'), 'hex');

ALTER TABLE api_keys ALTER COLUMN secret_hash SET NOT NULL;
ALTER TABLE api_keys DROP COLUMN secret;
