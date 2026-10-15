ALTER TABLE articles ADD COLUMN editorial_json TEXT CHECK(editorial_json IS NULL OR json_valid(editorial_json));
CREATE TABLE editorial_editions (
 id TEXT PRIMARY KEY, issue_date TEXT NOT NULL, cutoff_at TEXT NOT NULL,
 producer TEXT NOT NULL, trigger TEXT NOT NULL, created_at TEXT NOT NULL,
 article_count INTEGER NOT NULL, missing_themes TEXT NOT NULL, payload_hash TEXT NOT NULL
);
CREATE INDEX editorial_editions_date ON editorial_editions(issue_date DESC,created_at DESC);
