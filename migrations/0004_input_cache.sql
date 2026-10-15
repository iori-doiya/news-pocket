-- Only CC0 arXiv abstracts are cached; never store PDFs or complete papers.
CREATE TABLE article_inputs (
 article_id TEXT PRIMARY KEY REFERENCES articles(id) ON DELETE CASCADE,
 text TEXT NOT NULL, content_hash TEXT NOT NULL, expires_at TEXT NOT NULL
);
CREATE INDEX inputs_expiry ON article_inputs(expires_at);
