CREATE TABLE daily_news_jobs (
 day TEXT NOT NULL, theme TEXT NOT NULL, ai_day TEXT NOT NULL,
 state TEXT NOT NULL CHECK(state IN ('pending','succeeded','empty','failed')),
 reserved_neurons INTEGER NOT NULL DEFAULT 0, reserved_items INTEGER NOT NULL DEFAULT 0,
 article_count INTEGER NOT NULL DEFAULT 0, search_credits INTEGER NOT NULL DEFAULT 0,
 created_at TEXT NOT NULL, completed_at TEXT, run_id TEXT, trigger TEXT NOT NULL,
 error_code TEXT, results_json TEXT CHECK(results_json IS NULL OR json_valid(results_json)),
 PRIMARY KEY(day,theme)
);
CREATE INDEX daily_jobs_ai_day ON daily_news_jobs(ai_day);
CREATE TRIGGER daily_ai_quota BEFORE UPDATE OF reserved_neurons ON daily_news_jobs
WHEN NEW.reserved_neurons > OLD.reserved_neurons BEGIN
 SELECT (CASE WHEN OLD.reserved_neurons > 0 THEN RAISE(ABORT,'ALREADY_RESERVED') END);
 SELECT (CASE WHEN (SELECT count(*) FROM summary_jobs WHERE ai_day=NEW.ai_day)+(SELECT count(*) FROM daily_news_jobs WHERE ai_day=NEW.ai_day AND reserved_neurons>0)>=50 THEN RAISE(ABORT,'ATTEMPT_LIMIT') END);
 SELECT (CASE WHEN coalesce((SELECT sum(reserved_neurons) FROM summary_jobs WHERE ai_day=NEW.ai_day),0)+coalesce((SELECT sum(reserved_neurons) FROM daily_news_jobs WHERE ai_day=NEW.ai_day),0)+NEW.reserved_neurons-OLD.reserved_neurons>7500 THEN RAISE(ABORT,'AI_BUDGET') END);
 SELECT (CASE WHEN (SELECT count(*) FROM summary_jobs WHERE day=NEW.day AND state IN ('pending','succeeded'))+coalesce((SELECT sum(CASE WHEN state='pending' THEN reserved_items ELSE article_count END) FROM daily_news_jobs WHERE day=NEW.day AND state IN ('pending','succeeded')),0)+NEW.reserved_items-OLD.reserved_items>50 THEN RAISE(ABORT,'SITE_LIMIT') END);
END;
DROP TRIGGER summary_quota;
CREATE TRIGGER summary_quota BEFORE INSERT ON summary_jobs BEGIN
 SELECT (CASE WHEN (SELECT count(*) FROM summary_jobs WHERE user_id=NEW.user_id AND day=NEW.day AND state IN ('pending','succeeded'))>=30 THEN RAISE(ABORT,'USER_LIMIT') END);
 SELECT (CASE WHEN (SELECT count(*) FROM summary_jobs WHERE day=NEW.day AND state IN ('pending','succeeded'))+coalesce((SELECT sum(CASE WHEN state='pending' THEN reserved_items ELSE article_count END) FROM daily_news_jobs WHERE day=NEW.day AND state IN ('pending','succeeded')),0)>=50 THEN RAISE(ABORT,'SITE_LIMIT') END);
 SELECT (CASE WHEN (SELECT count(*) FROM summary_jobs WHERE day=NEW.day)+(SELECT count(*) FROM daily_news_jobs WHERE day=NEW.day AND reserved_neurons>0)>=50 THEN RAISE(ABORT,'ATTEMPT_LIMIT') END);
 SELECT (CASE WHEN coalesce((SELECT sum(reserved_neurons) FROM summary_jobs WHERE ai_day=NEW.ai_day),0)+coalesce((SELECT sum(reserved_neurons) FROM daily_news_jobs WHERE ai_day=NEW.ai_day),0)+NEW.reserved_neurons>7500 THEN RAISE(ABORT,'AI_BUDGET') END);
END;
