export const up = `
CREATE TABLE school_conversations (
  id TEXT PRIMARY KEY, student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  parent_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  teacher_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  topic TEXT NOT NULL, title TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','closed')),
  parent_read_at INTEGER NOT NULL DEFAULT 0, teacher_read_at INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
);
CREATE INDEX idx_school_conversations_parent ON school_conversations(parent_user_id, updated_at);
CREATE INDEX idx_school_conversations_teacher ON school_conversations(teacher_user_id, updated_at);
CREATE TABLE school_messages (
  id TEXT PRIMARY KEY, conversation_id TEXT NOT NULL REFERENCES school_conversations(id) ON DELETE CASCADE,
  sender_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK(length(body) BETWEEN 1 AND 1000), created_at INTEGER NOT NULL
);
CREATE INDEX idx_school_messages_conversation ON school_messages(conversation_id, created_at);
CREATE INDEX idx_school_messages_sender ON school_messages(sender_user_id, created_at);
CREATE TABLE school_message_reports (
  id TEXT PRIMARY KEY, message_id TEXT NOT NULL REFERENCES school_messages(id) ON DELETE CASCADE,
  reporter_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','reviewed')),
  reviewed_by TEXT REFERENCES users(id) ON DELETE SET NULL, created_at INTEGER NOT NULL,
  UNIQUE(message_id, reporter_user_id)
);
CREATE TABLE school_message_restrictions (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL, restricted_by TEXT REFERENCES users(id) ON DELETE SET NULL, created_at INTEGER NOT NULL
);
`;
export const down = `DROP TABLE school_message_restrictions; DROP TABLE school_message_reports; DROP TABLE school_messages; DROP TABLE school_conversations;`;
