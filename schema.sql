CREATE TABLE IF NOT EXISTS guides (
  id TEXT PRIMARY KEY,
  edit_token_hash TEXT NOT NULL,
  content_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
