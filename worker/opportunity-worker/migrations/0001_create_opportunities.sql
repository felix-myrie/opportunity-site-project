-- Migration number: 0001 	 2026-09-18T18:55:14.848Z
CREATE TABLE opportunities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_opportunities_status
ON opportunities(status);

CREATE INDEX idx_opportunities_created_at
ON opportunities(created_at);