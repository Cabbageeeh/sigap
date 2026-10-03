import type { NaraRequest, NaraResponse } from '@core';
import { jsonSuccess, jsonError } from '@core';
import { findParentByUserId } from '@queries/parents';
import { findSubjectById } from '@queries/subjects';
import { findStudentsByParent, findStudentById } from '@queries/students';
import { findGradesByStudentForParent, getStudentGradeSummaries, getGradesPublicationForStudent, findGradeProgressionByStudent, findGradesByClassSubject } from '@queries/grades';
import { findEraporColumnMappings, findEraporGradeTemplatesByClass } from '@queries/eraporGrades';
import { findAttendanceByStudent } from '@queries/studentAttendance';
import { hasRole } from '@queries/users';
import { parseEraporWorkbook } from '@services/EraporWorkbook';
import Logger from '@services/Logger';

interface ParentEraporScoreGroup {
  subject_id: string;
  subject_name: string;
  semester: number;
  columns: Array<{ external_id: string; label: string; score: number | null }>;
}

const findParentEraporScores = (studentId: string, classId: string): ParentEraporScoreGroup[] => {
  const templates = findEraporGradeTemplatesByClass(classId);
  return templates.flatMap(template => {
    try {
      const workbook = parseEraporWorkbook(template.template_html, template.semester);
      const sourceTypes = new Map(findEraporColumnMappings(template.id)
        .filter(mapping => !!mapping.source_component_type)
        .map(mapping => [mapping.external_id, mapping.source_component_type!]));
      const grades = findGradesByClassSubject(classId, template.subject_id)
        .filter(grade => grade.student_id === studentId);
      const subjectName = findSubjectById(template.subject_id)?.name ?? 'Mata pelajaran';
      return [{
        subject_id: template.subject_id,
        subject_name: subjectName,
        semester: template.semester,
        columns: workbook.columns.map(column => ({
          external_id: column.externalId,
          label: column.label,
          score: grades.find(grade => grade.type === (sourceTypes.get(column.externalId) ?? column.gradeType))?.score ?? null,
        })),
      }];
    } catch (error: unknown) {
      Logger.warn('Stored e-Rapor template could not be parsed for parent grades', error as Error);
      return [];
    }
  });
};

export const parentDashboardPage = (req: NaraRequest, res: NaraResponse) => {
  if (!req.user) return res.redirect('/login');
  if (!hasRole(req.user.id, 'parent')) return res.redirect('/dashboard');
  return res.inertia('parent/dashboard');
};

export const parentDashboardData = (req: NaraRequest, res: NaraResponse) => {
  if (!req.user) return jsonError(res, 'Unauthorized', 401);
  if (!hasRole(req.user.id, 'parent')) return jsonError(res, 'Forbidden', 403);

  const parent = findParentByUserId(req.user.id);
  if (!parent) return jsonError(res, 'Parent profile not found', 404);

  const children = findStudentsByParent(parent.user_id);
  const summaries = children.map(child => {
    const published = getGradesPublicationForStudent(child.id);
    return {
      ...child,
      gradesPublished: published,
      grades: published ? findGradesByStudentForParent(child.id).slice(0, 5) : [],
      attendance: findAttendanceByStudent(child.id).slice(0, 5),
    };
  });

  return jsonSuccess(res, 'OK', { parent, children: summaries });
};

export const childAttendancePage = (req: NaraRequest, res: NaraResponse) => {
  if (!req.user) return res.redirect('/login');
  if (!hasRole(req.user.id, 'parent')) return res.redirect('/dashboard');

  const parent = findParentByUserId(req.user.id);
  if (!parent) return res.redirect('/parent/dashboard');

  const studentId = req.params.studentId;
  if (!studentId) return res.redirect('/parent/dashboard');

  const children = findStudentsByParent(parent.user_id);
  if (!children.some(child => child.id === studentId)) return res.redirect('/parent/dashboard');

  const student = findStudentById(studentId);
  if (!student) return res.redirect('/parent/dashboard');

  return res.inertia('parent/attendance', {
    studentName: student.name,
    records: findAttendanceByStudent(studentId),
  });
};

export const parentGradesPage = (req: NaraRequest, res: NaraResponse) => {
  if (!req.user) return res.redirect('/login');
  if (!hasRole(req.user.id, 'parent')) return res.redirect('/dashboard');

  const parent = findParentByUserId(req.user.id);
  if (!parent) return res.redirect('/parent/dashboard');

  const studentId = req.params.studentId;
  if (!studentId) return res.redirect('/parent/dashboard');

  const children = findStudentsByParent(parent.user_id);
  if (!children.some(child => child.id === studentId)) return res.redirect('/parent/dashboard');

  const student = findStudentById(studentId);
  const { published, summaries } = getStudentGradeSummaries(studentId);
  const progression = published ? findGradeProgressionByStudent(studentId) : [];
  const eraporScores = published && student ? findParentEraporScores(studentId, student.class_id) : [];

  return res.inertia('parent/grades', {
    studentId,
    studentName: student?.name ?? '',
    gradesPublished: published,
    summaries: published ? summaries : [],
    eraporScores,
    progression,
  });
};
