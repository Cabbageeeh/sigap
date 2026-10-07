import SQLite from '@services/SQLite';
import { randomUUID } from 'crypto';
import type { SchoolContact, SchoolConversation, SchoolMessage, SchoolMessageReport } from '@types';

export const findSchoolContacts = (parentId: string): SchoolContact[] => SQLite.all<SchoolContact>(`
  SELECT st.id student_id, st.name student_name, c.name class_name, u.id teacher_user_id,
    u.name teacher_name, group_concat(DISTINCT assignments.teaching) teaching
  FROM students st JOIN classes c ON c.id = st.class_id
  JOIN academic_years ay ON ay.id = c.academic_year_id AND ay.is_active = 1
  JOIN (
    SELECT t.user_id, a.class_id, a.academic_year_id, 'Wali kelas' teaching
      FROM teacher_class_assignments a JOIN teachers t ON t.id = a.teacher_id WHERE a.is_homeroom = 1
    UNION ALL
    SELECT t.user_id, cs.class_id, cs.academic_year_id, s.name teaching
      FROM class_subjects cs JOIN teachers t ON t.id = cs.teacher_id JOIN subjects s ON s.id = cs.subject_id
    UNION ALL
    SELECT sch.teacher_user_id, sch.class_id, sch.academic_year_id, s.name teaching
      FROM schedules sch JOIN subjects s ON s.id = sch.subject_id
  ) assignments ON assignments.class_id = c.id AND assignments.academic_year_id = c.academic_year_id
  JOIN users u ON u.id = assignments.user_id AND u.is_active = 1
  WHERE st.parent_user_id = ? AND EXISTS (
    SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = u.id AND r.slug = 'teacher'
  ) GROUP BY st.id, u.id ORDER BY st.name, teaching, u.name`, [parentId]);

const conversationSelect = `SELECT c.*, st.name student_name, cl.name class_name,
  p.name parent_name, t.name teacher_name,
  (SELECT count(*) FROM school_messages m WHERE m.conversation_id = c.id AND m.sender_user_id != ?
    AND m.created_at > CASE WHEN c.parent_user_id = ? THEN c.parent_read_at ELSE c.teacher_read_at END) unread
  FROM school_conversations c JOIN students st ON st.id = c.student_id JOIN classes cl ON cl.id = st.class_id
  JOIN users p ON p.id = c.parent_user_id JOIN users t ON t.id = c.teacher_user_id`;

export const findSchoolConversations = (userId: string, limit = 50, offset = 0): SchoolConversation[] =>
  SQLite.all<SchoolConversation>(`${conversationSelect} WHERE c.parent_user_id = ? OR c.teacher_user_id = ?
    ORDER BY c.updated_at DESC LIMIT ? OFFSET ?`, [userId, userId, userId, userId, limit, offset]);

export const findSchoolConversation = (id: string, userId: string): SchoolConversation | undefined =>
  SQLite.get<SchoolConversation>(`${conversationSelect} WHERE c.id = ? AND (c.parent_user_id = ? OR c.teacher_user_id = ?)`,
    [userId, userId, id, userId, userId]);

export const findSchoolMessages = (conversationId: string, offset = 0): SchoolMessage[] => SQLite.all<SchoolMessage>(`
  SELECT * FROM (SELECT m.*, m.rowid message_order, u.name sender_name FROM school_messages m JOIN users u ON u.id = m.sender_user_id
    WHERE m.conversation_id = ? ORDER BY m.created_at DESC, m.rowid DESC LIMIT 100 OFFSET ?)
  ORDER BY created_at ASC, message_order ASC`, [conversationId, offset]);

export const findSchoolCommunicationRestriction = (userId: string): { reason: string } | undefined =>
  SQLite.get<{ reason: string }>('SELECT reason FROM school_message_restrictions WHERE user_id = ?', [userId]);

export const countRecentSchoolMessages = (userId: string): number => SQLite.get<{ count: number }>(
  'SELECT count(*) count FROM school_messages WHERE sender_user_id = ? AND created_at > ?',
  [userId, Date.now() - 600000])?.count ?? 0;

const insertSchoolMessage = (conversation: { id: string; parent_user_id: string; teacher_user_id: string }, senderId: string, body: string): void => {
  if (countRecentSchoolMessages(senderId) >= 5) throw new Error('MESSAGE_RATE_LIMIT');
  const now = Date.now();
  SQLite.run('INSERT INTO school_messages (id, conversation_id, sender_user_id, body, created_at) VALUES (?, ?, ?, ?, ?)',
    [randomUUID(), conversation.id, senderId, body, now]);
  SQLite.run('UPDATE school_conversations SET updated_at = ? WHERE id = ?', [now, conversation.id]);
  const recipient = senderId === conversation.parent_user_id ? conversation.teacher_user_id : conversation.parent_user_id;
  SQLite.run('INSERT INTO notifications (id, user_id, type, title, body, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    [randomUUID(), recipient, 'school_message', 'Pesan baru di SIGAP', 'Ada pesan baru. Buka menu Pesan untuk membalas.', now]);
};

export const createSchoolConversation = (data: { student_id: string; parent_user_id: string; teacher_user_id: string; topic: string; title: string; body: string }): string => SQLite.transaction(() => {
  const id = randomUUID();
  const now = Date.now();
  SQLite.run(`INSERT INTO school_conversations
    (id, student_id, parent_user_id, teacher_user_id, topic, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, data.student_id, data.parent_user_id, data.teacher_user_id, data.topic, data.title, now, now]);
  insertSchoolMessage({ id, ...data }, data.parent_user_id, data.body);
  return id;
});

export const createSchoolMessage = (conversation: SchoolConversation, senderId: string, body: string): void => {
  SQLite.transaction(() => insertSchoolMessage(conversation, senderId, body));
};

export const markSchoolConversationRead = (conversation: SchoolConversation, userId: string): void => {
  const column = conversation.parent_user_id === userId ? 'parent_read_at' : 'teacher_read_at';
  SQLite.run(`UPDATE school_conversations SET ${column} = ? WHERE id = ?`, [Date.now(), conversation.id]);
};

export const updateSchoolConversationStatus = (id: string, status: 'open' | 'closed'): void => {
  SQLite.run('UPDATE school_conversations SET status = ?, updated_at = ? WHERE id = ?', [status, Date.now(), id]);
};

export const createSchoolMessageReport = (messageId: string, conversationId: string, reporterId: string, reason: string): boolean => SQLite.transaction(() => {
  const message = SQLite.get<{ id: string }>('SELECT id FROM school_messages WHERE id = ? AND conversation_id = ? AND sender_user_id != ?', [messageId, conversationId, reporterId]);
  if (!message) return false;
  const result = SQLite.run(`INSERT OR IGNORE INTO school_message_reports (id, message_id, reporter_user_id, reason, created_at) VALUES (?, ?, ?, ?, ?)`,
    [randomUUID(), messageId, reporterId, reason, Date.now()]);
  if (result.changes) {
    const admins = SQLite.all<{ id: string }>(`SELECT u.id FROM users u WHERE u.is_active = 1 AND EXISTS
      (SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = u.id AND r.slug = 'admin')`);
    for (const admin of admins) SQLite.run(`INSERT INTO notifications (id, user_id, type, title, body, created_at)
      VALUES (?, ?, 'school_message_report', 'Laporan komunikasi baru', 'Periksa laporan pada Pengaturan Komunikasi.', ?)`,
      [randomUUID(), admin.id, Date.now()]);
  }
  return true;
});

export const findSchoolMessageReports = (): SchoolMessageReport[] => SQLite.all<SchoolMessageReport>(`
  SELECT r.id, r.reason, r.status, r.created_at, m.body, m.sender_user_id,
    sender.name sender_name, reporter.name reporter_name, st.name student_name
  FROM school_message_reports r JOIN school_messages m ON m.id = r.message_id
  JOIN school_conversations c ON c.id = m.conversation_id JOIN students st ON st.id = c.student_id
  JOIN users sender ON sender.id = m.sender_user_id JOIN users reporter ON reporter.id = r.reporter_user_id
  ORDER BY r.created_at DESC LIMIT 100`);

export const reviewSchoolMessageReport = (id: string, adminId: string): void => {
  SQLite.run("UPDATE school_message_reports SET status = 'reviewed', reviewed_by = ? WHERE id = ?", [adminId, id]);
};

export const findSchoolCommunicationRestrictions = (): { user_id: string; name: string; reason: string }[] => SQLite.all(`
  SELECT r.user_id, u.name, r.reason FROM school_message_restrictions r JOIN users u ON u.id = r.user_id ORDER BY r.created_at DESC`);

export const saveSchoolCommunicationRestriction = (userId: string, adminId: string, restricted: boolean, reason: string): void => {
  if (!restricted) { SQLite.run('DELETE FROM school_message_restrictions WHERE user_id = ?', [userId]); return; }
  SQLite.run(`INSERT INTO school_message_restrictions (user_id, reason, restricted_by, created_at) VALUES (?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET reason = excluded.reason, restricted_by = excluded.restricted_by, created_at = excluded.created_at`,
    [userId, reason, adminId, Date.now()]);
};
