-- Portfolio Control, initial schema.

CREATE TABLE accounts (
  id            TEXT PRIMARY KEY,
  label         TEXT NOT NULL,
  key_hash      TEXT NOT NULL,
  weekly_hours  INTEGER NOT NULL DEFAULT 20,
  created_at    INTEGER NOT NULL
);
CREATE UNIQUE INDEX accounts_key_hash_idx ON accounts (key_hash);

CREATE TABLE projects (
  id              TEXT PRIMARY KEY,
  account_id      TEXT NOT NULL REFERENCES accounts(id),
  name            TEXT NOT NULL,
  url             TEXT,
  note            TEXT,
  pull            INTEGER NOT NULL DEFAULT 3,
  upside          INTEGER NOT NULL DEFAULT 3,
  drag            INTEGER NOT NULL DEFAULT 3,
  spark           INTEGER NOT NULL DEFAULT 3,
  bay             TEXT NOT NULL DEFAULT 'fix',
  pinned          INTEGER NOT NULL DEFAULT 0,
  last_touched_at INTEGER,
  created_at      INTEGER NOT NULL,
  updated_at      INTEGER NOT NULL
);
CREATE INDEX projects_account_idx ON projects (account_id);

CREATE TABLE signals (
  id         TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id),
  kind       TEXT NOT NULL,
  value      INTEGER,
  note       TEXT,
  at         INTEGER NOT NULL
);
CREATE INDEX signals_project_idx ON signals (project_id, at);
