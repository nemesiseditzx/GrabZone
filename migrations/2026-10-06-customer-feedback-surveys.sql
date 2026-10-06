-- GrabZone Feedback + Survey System
CREATE TABLE IF NOT EXISTS surveys (
 id TEXT PRIMARY KEY,
 title TEXT NOT NULL,
 description TEXT NOT NULL DEFAULT '',
 published INTEGER NOT NULL DEFAULT 0,
 active INTEGER NOT NULL DEFAULT 1,
 allow_anonymous INTEGER NOT NULL DEFAULT 0,
 allow_multiple INTEGER NOT NULL DEFAULT 0,
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS surveys_public_idx ON surveys(published,active,updated_at DESC);
CREATE TABLE IF NOT EXISTS survey_questions (
 id TEXT PRIMARY KEY,
 survey_id TEXT NOT NULL,
 prompt TEXT NOT NULL,
 type TEXT NOT NULL,
 required INTEGER NOT NULL DEFAULT 0,
 sort_order INTEGER NOT NULL DEFAULT 0,
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS survey_questions_idx ON survey_questions(survey_id,sort_order,id);
CREATE TABLE IF NOT EXISTS survey_options (
 id TEXT PRIMARY KEY,
 question_id TEXT NOT NULL,
 label TEXT NOT NULL,
 value TEXT NOT NULL,
 sort_order INTEGER NOT NULL DEFAULT 0,
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS survey_options_idx ON survey_options(question_id,sort_order,id);
CREATE TABLE IF NOT EXISTS survey_responses (
 id TEXT PRIMARY KEY,
 survey_id TEXT NOT NULL,
 customer_name TEXT NOT NULL DEFAULT '',
 phone TEXT NOT NULL DEFAULT '',
 email TEXT NOT NULL DEFAULT '',
 account_id TEXT,
 account_match_status TEXT NOT NULL DEFAULT 'unmatched',
 source TEXT NOT NULL DEFAULT 'direct',
 product_id TEXT,
 order_id TEXT,
 vendor_id TEXT,
 started_at TEXT,
 submitted_at TEXT NOT NULL,
 created_at TEXT NOT NULL,
 reward_points INTEGER NOT NULL DEFAULT 0,
 reward_awarded_at TEXT,
 reward_admin_id TEXT,
 reward_reference TEXT
);
CREATE INDEX IF NOT EXISTS survey_responses_idx ON survey_responses(survey_id,submitted_at DESC);
CREATE INDEX IF NOT EXISTS survey_identity_idx ON survey_responses(phone,email,submitted_at DESC);
CREATE TABLE IF NOT EXISTS survey_answers (
 id TEXT PRIMARY KEY,
 response_id TEXT NOT NULL,
 question_id TEXT NOT NULL,
 answer_text TEXT NOT NULL DEFAULT '',
 option_ids TEXT NOT NULL DEFAULT '[]',
 answer_numeric REAL,
 created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS survey_answers_idx ON survey_answers(response_id,question_id);
CREATE TABLE IF NOT EXISTS customer_feedback (
 id TEXT PRIMARY KEY,
 customer_name TEXT NOT NULL DEFAULT '',
 phone TEXT NOT NULL DEFAULT '',
 email TEXT NOT NULL DEFAULT '',
 account_id TEXT,
 source TEXT NOT NULL DEFAULT 'feedback-page',
 product_id TEXT,
 order_id TEXT,
 vendor_id TEXT,
 message TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'new',
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS customer_feedback_idx ON customer_feedback(created_at DESC);