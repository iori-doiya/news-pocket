ALTER TABLE articles ADD COLUMN attribution TEXT NOT NULL DEFAULT '';
ALTER TABLE articles ADD COLUMN feed_url TEXT;
CREATE TABLE summary_metrics (
 job_id TEXT PRIMARY KEY REFERENCES summary_jobs(id) ON DELETE CASCADE,
 duration_ms INTEGER NOT NULL, input_characters INTEGER NOT NULL,
 prompt_tokens INTEGER, completion_tokens INTEGER, estimated_neurons REAL
);
CREATE TABLE contacts (
 id TEXT PRIMARY KEY, user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
 subject TEXT NOT NULL, message TEXT NOT NULL, reply_email TEXT NOT NULL DEFAULT '',
 created_at TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'new' CHECK(status IN ('new','read'))
);
CREATE INDEX contacts_date ON contacts(created_at DESC);
CREATE TABLE contact_quota (day TEXT NOT NULL, rate_key TEXT NOT NULL, count INTEGER NOT NULL, PRIMARY KEY(day,rate_key));
CREATE TRIGGER contact_limit BEFORE UPDATE ON contact_quota BEGIN
 SELECT (CASE WHEN NEW.rate_key='site' AND NEW.count>50 THEN RAISE(ABORT,'CONTACT_SITE_LIMIT') END);
 SELECT (CASE WHEN NEW.rate_key!='site' AND NEW.count>3 THEN RAISE(ABORT,'CONTACT_IP_LIMIT') END);
END;
