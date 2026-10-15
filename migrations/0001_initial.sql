PRAGMA foreign_keys = ON;
CREATE TABLE users (id TEXT PRIMARY KEY, google_sub TEXT UNIQUE NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, created_at TEXT NOT NULL, expires_at TEXT NOT NULL);
CREATE INDEX sessions_expiry ON sessions(expires_at);
CREATE TABLE articles (
 id TEXT PRIMARY KEY, source_id TEXT NOT NULL, url TEXT UNIQUE NOT NULL, title TEXT NOT NULL,
 themes TEXT NOT NULL, published_at TEXT, collected_at TEXT NOT NULL, sort_at TEXT NOT NULL, content_hash TEXT NOT NULL
);
CREATE INDEX articles_order ON articles(sort_at DESC, id);
CREATE TABLE bookmarks (user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, article_id TEXT NOT NULL REFERENCES articles(id) ON DELETE CASCADE, saved_at TEXT NOT NULL, PRIMARY KEY(user_id, article_id));
CREATE INDEX bookmarks_order ON bookmarks(user_id, saved_at DESC);
CREATE INDEX bookmarks_article ON bookmarks(article_id);
CREATE TABLE summaries (article_id TEXT PRIMARY KEY REFERENCES articles(id) ON DELETE CASCADE, text TEXT NOT NULL, scope TEXT NOT NULL, content_hash TEXT NOT NULL, model TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE summary_jobs (
 id TEXT PRIMARY KEY, article_id TEXT REFERENCES articles(id) ON DELETE CASCADE,
 user_id TEXT REFERENCES users(id) ON DELETE SET NULL, day TEXT NOT NULL, ai_day TEXT NOT NULL,
 state TEXT NOT NULL CHECK(state IN ('pending','succeeded','failed')), reserved_neurons INTEGER NOT NULL,
 created_at TEXT NOT NULL, expires_at TEXT NOT NULL
);
CREATE UNIQUE INDEX jobs_lock ON summary_jobs(article_id) WHERE state = 'pending';
CREATE INDEX jobs_day ON summary_jobs(day, state);
CREATE INDEX jobs_user ON summary_jobs(user_id, day, state);
CREATE INDEX jobs_ai_day ON summary_jobs(ai_day);
CREATE TRIGGER summary_quota BEFORE INSERT ON summary_jobs BEGIN
 SELECT (CASE WHEN (SELECT count(*) FROM summary_jobs WHERE user_id = NEW.user_id AND day = NEW.day AND state IN ('pending','succeeded')) >= 5 THEN RAISE(ABORT,'USER_LIMIT') END);
 SELECT (CASE WHEN (SELECT count(*) FROM summary_jobs WHERE day = NEW.day AND state IN ('pending','succeeded')) >= 20 THEN RAISE(ABORT,'SITE_LIMIT') END);
 SELECT (CASE WHEN (SELECT count(*) FROM summary_jobs WHERE day = NEW.day) >= 30 THEN RAISE(ABORT,'ATTEMPT_LIMIT') END);
 SELECT (CASE WHEN coalesce((SELECT sum(reserved_neurons) FROM summary_jobs WHERE ai_day = NEW.ai_day),0) + NEW.reserved_neurons > 7500 THEN RAISE(ABORT,'AI_BUDGET') END);
END;
-- Keep attempt/quota records even if capacity cleanup removes an article.
CREATE TRIGGER article_job_detach BEFORE DELETE ON articles BEGIN
 UPDATE summary_jobs SET article_id = NULL WHERE article_id = OLD.id;
END;
CREATE TABLE app_state (key TEXT PRIMARY KEY, value TEXT NOT NULL);
