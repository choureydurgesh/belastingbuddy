-- Database tables (Cloudflare D1, EU). Already created in the dashboard.
-- To recreate: paste into D1 > belastingbuddy-db > Console.
CREATE TABLE IF NOT EXISTS feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  kind TEXT NOT NULL,          -- problem | idea | other
  message TEXT NOT NULL,
  page TEXT,
  email TEXT,                  -- optional, only to reply
  lang TEXT
);
CREATE TABLE IF NOT EXISTS reminders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  tax_year INTEGER NOT NULL,
  lang TEXT NOT NULL DEFAULT 'en',
  token TEXT NOT NULL UNIQUE,  -- secret for confirm and unsubscribe links
  confirmed INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  confirmed_at TEXT,
  last_sent TEXT
);
