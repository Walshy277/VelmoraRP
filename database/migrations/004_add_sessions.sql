CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_sessions_account_id ON sessions(account_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
