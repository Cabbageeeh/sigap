import type { NaraMiddleware, NaraRequest, NaraResponse } from '@core';
import { jsonError, jsonSuccess, jsonValidationError } from '@core';
import Logger from '@services/Logger';
import multer from 'multer';
import { findEraporColumnMappings, findEraporDefaultColumnMappingsByYear, findEraporGradeTemplate, findEraporStudentMappings, saveEraporImportSetup } from '@queries/eraporGrades';
import { findClassById } from '@queries/classes';
import { findSubjectById } from '@queries/subjects';
import { findAllNisOwners, findStudentsByClass } from '@queries/students';
import { findActiveSchoolLocation } from '@queries/schoolLocations';
import { isAdmin, hasPermission, hasRole } from '@queries/users';
import { isTeacherUser, isTeacherAssignedToClassSubject } from '@queries/teacherClassAssignments';
import { findTeacherSchedulesByDay } from '@queries/schedules';
import { findTodayConfirmationByTeacher } from '@queries/teacherConfirmations';
import { isTeacherPresenceEnabled } from '@queries/appSettings';
import { isTeachingDay } from '@queries/schoolCalendar';
import { EraporNewStudentsSchema, EraporTemplateSchema, zodToErrors } from '@validators';
import { normalizeEraporText, parseEraporWorkbook, parseEraporWorkbookFile } from '@services/EraporWorkbook';
import { logGradeChange } from '@queries/gradeAuditLogs';
import type { EraporGradeChange } from '@queries/eraporGrades';

interface UploadedFile {
  buffer: Buffer;
  originalname: string;
}

interface WorkbookStudentRow {
  rowNumber: number;
  externalMemberId: string;
  name: string;
}

const workbookUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
});

export const eraporImportMiddleware = workbookUpload.single('file') as unknown as NaraMiddleware;

const isTeacherActor = (userId: string): boolean => !hasRole(userId, 'parent') && !isAdmin(userId) && isTeacherUser(userId);

const attendanceConfirmedToday = (userId: string): boolean => {
  if (!isTeacherPresenceEnabled() || !isTeachingDay(Date.now())) return true;
  return findTeacherSchedulesByDay(userId, new Date().getDay()).length === 0 || !!findTodayConfirmationByTeacher(userId);
};

const canEditScope = (userId: string, classId: string, subjectId: string): boolean =>
  isAdmin(userId) || (isTeacherActor(userId)
    && (hasPermission(userId, 'grades.create') || hasPermission(userId, 'grades.edit'))
    && isTeacherAssignedToClassSubject(userId, classId, subjectId));

const matchesSelectedClass = (fileGrade: string, fileRombel: string, grade: string, className: string): boolean => {
  const clean = (value: string): string => value.toLocaleLowerCase('id-ID').replace(/[^a-z0-9]/g, '');
  const classLabel = clean(className.replace(/kelas/gi, ''));
  return normalizeEraporText(fileGrade) === normalizeEraporText(grade) && classLabel.endsWith(clean(fileRombel));
};

const matchWorkbookStudents = (
  classId: string,
  rows: WorkbookStudentRow[],
): { error: string } | { mappings: Array<{ student_id: string; external_member_id: string }>; missingStudents: WorkbookStudentRow[] } => {
  const roster = findStudentsByClass(classId);
  const studentsById = new Map(roster.map(student => [student.id, student]));
  const studentsByName = new Map<string, typeof roster>();
  for (const student of roster) {
    const key = normalizeEraporText(student.name);
    studentsByName.set(key, [...(studentsByName.get(key) ?? []), student]);
  }
  const existingByExternalId = new Map(findEraporStudentMappings(classId).map(mapping => [mapping.external_member_id, mapping.student_id]));
  const seenStudents = new Set<string>();
  const mappings: Array<{ student_id: string; external_member_id: string }> = [];
  const missingStudents: WorkbookStudentRow[] = [];

  for (const row of rows) {
    const knownStudent = studentsById.get(existingByExternalId.get(row.externalMemberId) ?? '');
    const nameMatches = studentsByName.get(normalizeEraporText(row.name)) ?? [];
    const student = knownStudent ?? (nameMatches.length === 1 ? nameMatches[0] : undefined);
    if (!student && nameMatches.length > 1) {
      return { error: `Nama "${row.name}" muncul lebih dari sekali di kelas SIGAP. Periksa roster siswa terlebih dahulu.` };
    }
    if (!student) {
      missingStudents.push(row);
      continue;
    }
    if (seenStudents.has(student.id)) return { error: `Siswa "${student.name}" terhubung ke lebih dari satu baris pada file.` };
    seenStudents.add(student.id);
    mappings.push({ student_id: student.id, external_member_id: row.externalMemberId });
  }

  const unlistedStudents = roster.filter(student => !seenStudents.has(student.id));
  if (unlistedStudents.length > 0) {
    const names = unlistedStudents.slice(0, 5).map(student => student.name).join(', ');
    const extra = unlistedStudents.length > 5 ? ` dan ${unlistedStudents.length - 5} siswa lainnya` : '';
    return { error: `Roster SIGAP memuat siswa yang tidak ada di file: ${names}${extra}. Samakan daftar siswa sebelum mengimpor.` };
  }

  return { mappings, missingStudents };
};

const auditGradeChanges = (changes: EraporGradeChange[], userId: string): void => {
  for (const change of changes) {
    logGradeChange({
      grade_id: change.grade_id,
      student_id: change.student_id,
      subject_id: change.subject_id,
      class_id: change.class_id,
      type: change.type,
      action: change.action,
      old_score: change.old_score,
      new_score: change.new_score,
      user_id: userId,
    });
  }
};

export const importEraporGrades = (req: NaraRequest, res: NaraResponse) => {
  if (!req.user) return jsonError(res, 'Sesi login diperlukan', 401);
  const form = EraporTemplateSchema.safeParse(req.body);
  if (!form.success) return jsonValidationError(res, 'Pilihan kelas, mata pelajaran, atau semester tidak valid', zodToErrors(form.error));
  const { class_id: classId, subject_id: subjectId, semester } = form.data;
  if (!canEditScope(req.user.id, classId, subjectId)) return jsonError(res, 'Anda tidak memiliki akses untuk mengimpor nilai mapel dan kelas ini', 403);
  if (isTeacherActor(req.user.id) && !attendanceConfirmedToday(req.user.id)) return jsonError(res, 'Konfirmasi kehadiran hari ini diperlukan sebelum mengakses nilai', 403, 'CONFIRMATION_REQUIRED');

  const targetClass = findClassById(classId);
  if (!targetClass) return jsonError(res, 'Kelas tidak ditemukan', 404);
  if (!findSubjectById(subjectId)) return jsonError(res, 'Mata pelajaran tidak ditemukan', 404);
  const file = (req as NaraRequest & { file?: UploadedFile }).file;
  if (!file) return jsonError(res, 'Pilih file nilai e-Rapor (.xls atau .xlsx)', 400, 'FILE_REQUIRED');
  if (!/\.(?:xls|xlsx)$/i.test(file.originalname)) return jsonError(res, 'Format yang didukung adalah file .xls atau .xlsx dari e-Rapor SMP 2025.2', 422, 'INVALID_FILE_TYPE');

  let workbook: ReturnType<typeof parseEraporWorkbook>;
  try {
    workbook = parseEraporWorkbookFile(file.buffer, semester);
    if (!matchesSelectedClass(workbook.grade, workbook.rombel, targetClass.grade, targetClass.name)) {
      return jsonError(res, 'Isi file tidak cocok dengan kelas yang dipilih di SIGAP', 422, 'CLASS_MISMATCH');
    }
    const school = findActiveSchoolLocation();
    if (school?.npsn && school.npsn !== workbook.npsn) return jsonError(res, 'NPSN pada file berbeda dengan profil sekolah SIGAP', 422, 'NPSN_MISMATCH');
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'File e-Rapor tidak dapat dibaca';
    return jsonError(res, message, 422, 'INVALID_ERAPOR_FILE');
  }

  const studentMatches = matchWorkbookStudents(classId, workbook.rows);
  if ('error' in studentMatches) return jsonError(res, studentMatches.error, 422, 'ERAPOR_ROSTER_CONFLICT');

  let newStudents: Array<{ external_member_id: string; nis: string }> = [];
  const rawNewStudents = req.body.new_students;
  if (rawNewStudents !== undefined) {
    let parsedValue: unknown = rawNewStudents;
    if (typeof rawNewStudents === 'string') {
      try {
        parsedValue = JSON.parse(rawNewStudents) as unknown;
      } catch {
        return jsonError(res, 'Data NIS siswa baru tidak terbaca. Periksa lalu kirim ulang.', 422, 'INVALID_STUDENT_DATA');
      }
    }
    const parsedStudents = EraporNewStudentsSchema.safeParse(parsedValue);
    if (!parsedStudents.success) return jsonValidationError(res, 'NIS siswa baru belum valid', zodToErrors(parsedStudents.error));
    newStudents = parsedStudents.data;
  }

  const isConfirmedImport = req.body.confirm_import === '1';
  if (studentMatches.missingStudents.length > 0 && !isConfirmedImport) {
    return jsonSuccess(res, 'Isi NIS siswa baru untuk melanjutkan impor.', {
      preview_required: true,
      preview: {
        matched_students: studentMatches.mappings.length,
        missing_students: studentMatches.missingStudents.map(student => ({
          row_number: student.rowNumber,
          external_member_id: student.externalMemberId,
          name: student.name,
        })),
      },
    });
  }

  if (newStudents.length !== studentMatches.missingStudents.length) {
    return jsonError(res, 'Isi NIS untuk setiap siswa baru yang tampil sebelum melanjutkan.', 422, 'ERAPOR_STUDENT_DATA_MISMATCH');
  }

  const missingByExternalId = new Map(studentMatches.missingStudents.map(student => [student.externalMemberId, student]));
  const seenExternalIds = new Set<string>();
  for (const student of newStudents) {
    if (!missingByExternalId.has(student.external_member_id) || seenExternalIds.has(student.external_member_id)) {
      return jsonError(res, 'Daftar siswa baru berubah. Periksa kembali file dan pratinjau impor.', 422, 'ERAPOR_STUDENT_DATA_MISMATCH');
    }
    seenExternalIds.add(student.external_member_id);
  }
  if (seenExternalIds.size !== studentMatches.missingStudents.length) {
    return jsonError(res, 'NIS belum diisi untuk seluruh siswa baru.', 422, 'ERAPOR_STUDENT_DATA_MISMATCH');
  }

  const nisKeys = new Set<string>();
  const ownersByNis = new Map(findAllNisOwners().map(owner => [owner.nis.toLocaleLowerCase('id-ID'), owner]));
  for (const student of newStudents) {
    const key = student.nis.toLocaleLowerCase('id-ID');
    if (nisKeys.has(key)) return jsonError(res, `NIS ${student.nis} diisi lebih dari satu kali.`, 409, 'DUPLICATE_STUDENT_NIS');
    nisKeys.add(key);
    const owner = ownersByNis.get(key);
    if (owner) return jsonError(res, `NIS ${student.nis} sudah digunakan oleh ${owner.name} di kelas ${owner.class_name ?? 'lain'}.`, 409, 'DUPLICATE_STUDENT_NIS');
  }

  try {
    const existingTemplate = findEraporGradeTemplate(classId, subjectId, semester);
    const existingColumnMappings = existingTemplate ? findEraporColumnMappings(existingTemplate.id) : [];
    const configuredByExternalId = new Map(existingColumnMappings.map(item => [item.external_id, item.source_component_type]));
    const defaultByColumnKey = new Map<string, string | null>();
    const defaultMappings = findEraporDefaultColumnMappingsByYear(targetClass.academic_year_id)
      .filter(item => item.semester === semester && (item.subject_id === null || item.subject_id === subjectId));
    for (const item of defaultMappings.filter(mapping => mapping.subject_id === null)) defaultByColumnKey.set(item.column_key, item.source_component_type);
    for (const item of defaultMappings.filter(mapping => mapping.subject_id === subjectId)) defaultByColumnKey.set(item.column_key, item.source_component_type);
    const effectiveMappings = workbook.columns.map(column => {
      const columnKey = normalizeEraporText(column.label);
      const hasTemplateMapping = configuredByExternalId.has(column.externalId);
      const hasDefaultMapping = defaultByColumnKey.has(columnKey);
      return {
        external_id: column.externalId,
        source_component_type: hasTemplateMapping
          ? configuredByExternalId.get(column.externalId) ?? null
          : hasDefaultMapping ? defaultByColumnKey.get(columnKey) ?? null : null,
      };
    });
    const effectiveByExternalId = new Map(effectiveMappings.map(item => [item.external_id, item]));
    const grades = workbook.rows.flatMap(row => workbook.columns.flatMap((column, index) => {
      const score = row.scores[index];
      const type = effectiveByExternalId.get(column.externalId)?.source_component_type || column.gradeType;
      return score === null ? [] : [{ external_member_id: row.externalMemberId, subject_id: subjectId, class_id: classId, type, score }];
    }));
    const result = saveEraporImportSetup({
      template: {
        academic_year_id: targetClass.academic_year_id,
        class_id: classId,
        subject_id: subjectId,
        semester: semester as 1 | 2,
        mapel_id: workbook.mapelId,
        template_html: workbook.html,
        source_file_name: file.originalname.replace(/[^\w .()-]/g, '_').slice(0, 120),
        created_by: req.user.id,
      },
      mappings: studentMatches.mappings,
      newStudents: newStudents.map(student => ({
        ...student,
        name: missingByExternalId.get(student.external_member_id)!.name,
      })),
      grades,
    });
    auditGradeChanges(result.changes, req.user.id);
    return jsonSuccess(res, 'Template dan data e-Rapor berhasil disimpan.', {
      template_id: result.template.id,
      students: result.mappings.length,
      created_students: result.createdStudents.length,
      columns: workbook.columns.length,
      scores_saved: result.changes.length,
      mapel_id: workbook.mapelId,
    });
  } catch (error: unknown) {
    if (String(error).includes('SQLITE_CONSTRAINT_UNIQUE')) {
      return jsonError(res, 'NIS atau ID anggota rombel sudah digunakan. Periksa data siswa lalu coba kembali.', 409, 'ERAPOR_IMPORT_CONFLICT');
    }
    Logger.error('Failed to import e-Rapor grades', error as Error);
    return jsonError(res, error instanceof Error ? error.message : 'Gagal mengimpor nilai e-Rapor', 422, 'ERAPOR_IMPORT_FAILED');
  }
};
