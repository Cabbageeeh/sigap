import SQLite from '@services/SQLite';
import type { GradeAuditLogRow } from '../types/shared';
import { randomUUID } from 'crypto';

export const logGradeChange = (data: {
  grade_id: string | null;
  student_id: string;
  subject_id: string;
  class_id: string;
  type: string;
  action: 'create' | 'update' | 'delete';
  old_score: number | null;
  new_score: number | null;
  old_initial_score?: number | null;
  new_initial_score?: number | null;
  user_id: string;
}): void => {
  SQLite.exec`
    INSERT INTO grade_audit_logs (id, grade_id, student_id, subject_id, class_id, type, action, old_score, new_score, old_initial_score, new_initial_score, user_id, created_at)
    VALUES (${randomUUID()}, ${data.grade_id}, ${data.student_id}, ${data.subject_id}, ${data.class_id}, ${data.type}, ${data.action}, ${data.old_score}, ${data.new_score}, ${data.old_initial_score ?? null}, ${data.new_initial_score ?? null}, ${data.user_id}, ${Date.now()})
  `;
};

export const getGradeAuditLogsPaginated = (page: number, limit: number): { data: GradeAuditLogRow[]; total: number } => {
  const offset = (page - 1) * limit;
  const countRow = SQLite.get<{ count: number }>('SELECT COUNT(*) as count FROM grade_audit_logs');
  const data = SQLite.all<GradeAuditLogRow>(
    `SELECT l.id, l.action, l.old_score, l.new_score, l.old_initial_score, l.new_initial_score, l.type, l.created_at,
            st.name AS student_name, s.name AS subject_name, c.name AS class_name, u.name AS user_name
     FROM grade_audit_logs l
     JOIN students st ON st.id = l.student_id
     JOIN subjects s ON s.id = l.subject_id
     JOIN classes c ON c.id = l.class_id
     JOIN users u ON u.id = l.user_id
     ORDER BY l.created_at DESC
     LIMIT ? OFFSET ?`,
    [limit, offset]
  );
  return { data, total: countRow?.count ?? 0 };
};
