-- Keep existing usage records. Change limits for subsequent reservations only.
DROP TRIGGER summary_quota;
CREATE TRIGGER summary_quota BEFORE INSERT ON summary_jobs BEGIN
 SELECT (CASE WHEN (SELECT count(*) FROM summary_jobs WHERE user_id = NEW.user_id AND day = NEW.day AND state IN ('pending','succeeded')) >= 30 THEN RAISE(ABORT,'USER_LIMIT') END);
 SELECT (CASE WHEN (SELECT count(*) FROM summary_jobs WHERE day = NEW.day AND state IN ('pending','succeeded')) >= 50 THEN RAISE(ABORT,'SITE_LIMIT') END);
 SELECT (CASE WHEN (SELECT count(*) FROM summary_jobs WHERE day = NEW.day) >= 50 THEN RAISE(ABORT,'ATTEMPT_LIMIT') END);
 SELECT (CASE WHEN coalesce((SELECT sum(reserved_neurons) FROM summary_jobs WHERE ai_day = NEW.ai_day),0) + NEW.reserved_neurons > 7500 THEN RAISE(ABORT,'AI_BUDGET') END);
END;
