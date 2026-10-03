import type { NaraMiddleware, NaraRequest, NaraResponse } from '@core';
import { jsonError, jsonSuccess, jsonValidationError, queryString } from '@core';
import Logger from '@services/Logger';
import multer from 'multer';
import { findEraporColumnMappings, findEraporColumnMappingsByClassSubject, findEraporGradeTemplate, findEraporStudentMappings, saveEraporColumnMappings as persistEraporColumnMappings, saveEraporGradeChanges, saveEraporTemplateSetup } from '@queries/eraporGrades';
import { findAllClasses, findClassById, findClassesByTeacherUser } from '@queries/classes';
import { findAllSubjects, findSubjectById } from '@queries/subjects';
import { findStudentsByClass } from '@queries/students';
import { findGradeComponentsByYear } from '@queries/gradeComponents';
import { findActiveSchoolLocation } from '@queries/schoolLocations';
import { findGradesByClassSubject } from '@queries/grades';
import { logGradeChange } from '@queries/gradeAuditLogs';
import { isAdmin, hasPermission, hasRole } from '@queries/users';
import { isTeacherUser, isTeacherAssignedToClassSubject, isTeacherHomeroomOfClass } from '@queries/teacherClassAssignments';
import { findTeacherSchedulesByDay } from '@queries/schedules';
import { findTodayConfirmationByTeacher } from '@queries/teacherConfirmations';
import { isTeacherPresenceEnabled } from '@queries/appSettings';
import { isTeachingDay } from '@queries/schoolCalendar';
import { EraporColumnMappingsSchema, EraporGradeSaveSchema, EraporTemplateSchema, zodToErrors } from '@validators';
import { normalizeEraporText, parseEraporWorkbook, renderEraporWorkbook, type EraporAssessmentColumn } from '@services/EraporWorkbook';
import { createEraporXlsx, eraporExcelColumnName } from '@services/EraporXlsx';

interface UploadedFile {
  buffer: Buffer;
  originalname: string;
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

const canViewScope = (userId: string, classId: string, subjectId: string): boolean =>
  isAdmin(userId) || (!hasRole(userId, 'parent') && hasPermission(userId, 'grades.view')
    && (isTeacherHomeroomOfClass(userId, classId) || isTeacherAssignedToClassSubject(userId, classId, subjectId)));

const canEditScope = (userId: string, classId: string, subjectId: string): boolean =>
  isAdmin(userId) || (isTeacherActor(userId)
    && (hasPermission(userId, 'grades.create') || hasPermission(userId, 'grades.edit'))
    && isTeacherAssignedToClassSubject(userId, classId, subjectId));

const readSelection = (req: NaraRequest) => EraporTemplateSchema.safeParse({
  class_id: queryString(req, 'class_id'),
  subject_id: queryString(req, 'subject_id'),
  semester: queryString(req, 'semester', '1'),
});

const matchesSelectedClass = (fileGrade: string, fileRombel: string, grade: string, className: string): boolean => {
  const clean = (value: string): string => value.toLocaleLowerCase('id-ID').replace(/[^a-z0-9]/g, '');
  const classLabel = clean(className.replace(/kelas/gi, ''));
  return normalizeEraporText(fileGrade) === normalizeEraporText(grade) && classLabel.endsWith(clean(fileRombel));
};

const auditGradeChanges = (changes: ReturnType<typeof saveEraporGradeChanges>, userId: string): void => {
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

const mapWorkbookStudents = (
  classId: string,
  rows: ReturnType<typeof parseEraporWorkbook>['rows'],
): Array<{ student_id: string; external_member_id: string }> => {
  const roster = findStudentsByClass(classId);
  if (roster.length !== rows.length) throw new Error(`Jumlah siswa pada file (${rows.length}) berbeda dengan SIGAP (${roster.length}). Unduh ulang template e-Rapor untuk kelas ini.`);

  const studentsByName = new Map<string, typeof roster>();
  for (const student of roster) {
    const key = normalizeEraporText(student.name);
    studentsByName.set(key, [...(studentsByName.get(key) ?? []), student]);
  }
  const existingByExternalId = new Map(findEraporStudentMappings(classId).map(mapping => [mapping.external_member_id, mapping.student_id]));
  const seenStudents = new Set<string>();
  const mappings = rows.map(row => {
    const knownStudentId = existingByExternalId.get(row.externalMemberId);
    const matches = studentsByName.get(normalizeEraporText(row.name)) ?? [];
    const student = knownStudentId
      ? roster.find(item => item.id === knownStudentId)
      : matches.length === 1 ? matches[0] : undefined;
    if (!student) {
      const reason = matches.length > 1 ? 'namanya ganda di SIGAP' : 'tidak ditemukan di kelas SIGAP';
      throw new Error(`Siswa "${row.name}" pada baris ${row.rowNumber} ${reason}. Periksa data siswa sebelum mengimpor.`);
    }
    if (seenStudents.has(student.id)) throw new Error(`Siswa "${student.name}" muncul lebih dari sekali pada file.`);
    seenStudents.add(student.id);
    return { student_id: student.id, external_member_id: row.externalMemberId };
  });
  if (seenStudents.size !== roster.length) throw new Error('File tidak memuat seluruh siswa di kelas SIGAP.');
  return mappings;
};

export const gradesEraporPage = (req: NaraRequest, res: NaraResponse) => {
  if (!req.user) return res.redirect('/login');
  const userId = req.user.id;
  const administrator = isAdmin(userId);
  const allowed = administrator || (!hasRole(userId, 'parent') && (hasPermission(userId, 'grades.view') || hasPermission(userId, 'grades.create')));
  if (!allowed) return res.redirect('/grades');

  const classOptions = administrator ? findAllClasses() : findClassesByTeacherUser(userId);
  const classId = queryString(req, 'class_id');
  const subjectId = queryString(req, 'subject_id');
  const semesterValue = Number(queryString(req, 'semester', '1'));
  const semester = semesterValue === 2 ? 2 : 1;
  const attendanceConfirmed = !isTeacherActor(userId) || attendanceConfirmedToday(userId);
  const selectedClass = classOptions.find(item => item.id === classId);
  const selectedSubject = findSubjectById(subjectId);
  const canView = !!selectedClass && !!selectedSubject && canViewScope(userId, classId, subjectId)
    && (administrator || attendanceConfirmed);
  const canEdit = !!selectedClass && !!selectedSubject && canEditScope(userId, classId, subjectId)
    && (administrator || attendanceConfirmedToday(userId));
  const gradeComponents = selectedClass ? findGradeComponentsByYear(selectedClass.academic_year_id) : [];

  let template: ReturnType<typeof findEraporGradeTemplate> = undefined;
  let columns: EraporAssessmentColumn[] = [];
  let sourceTypeByExternalId = new Map<string, string>();
  let sourceMappingByExternalId = new Map<string, string>();
  let matrix: Array<{ student_id: string; name: string; nis: string; external_member_id: string; scores: Array<{ external_id: string; label: string; score: number | null }> }> = [];
  let rosterReady = false;
  if (canView) {
    template = findEraporGradeTemplate(classId, subjectId, semester);
    if (template) {
      try {
        columns = parseEraporWorkbook(template.template_html, semester).columns;
        sourceMappingByExternalId = new Map(findEraporColumnMappings(template.id)
          .filter(item => !!item.source_component_type)
          .map(item => [item.external_id, item.source_component_type!]));
        sourceTypeByExternalId = new Map(columns.map(column => [
          column.externalId,
          sourceMappingByExternalId.get(column.externalId) ?? column.gradeType,
        ]));
        const students = findStudentsByClass(classId);
        const mappings = findEraporStudentMappings(classId);
        const mappingByStudent = new Map(mappings.map(item => [item.student_id, item.external_member_id]));
        const grades = findGradesByClassSubject(classId, subjectId);
        rosterReady = students.length === mappings.filter(item => students.some(student => student.id === item.student_id)).length
          && students.every(student => mappingByStudent.has(student.id));
        matrix = students.map(student => ({
          student_id: student.id,
          name: student.name,
          nis: student.nis,
          external_member_id: mappingByStudent.get(student.id) ?? '',
          scores: columns.map(column => ({
            external_id: column.externalId,
            label: column.label,
            score: grades.find(grade => grade.student_id === student.id && grade.type === sourceTypeByExternalId.get(column.externalId))?.score ?? null,
          })),
        }));
      } catch (error: unknown) {
        Logger.warn('Stored e-Rapor template could not be parsed', error as Error);
      }
    }
  }

  return res.inertia('gradesErapor', {
    classes: classOptions,
    subjects: findAllSubjects(),
    classId: selectedClass?.id ?? '',
    subjectId: selectedSubject?.id ?? '',
    semester,
    template: template ? { source_file_name: template.source_file_name, mapel_id: template.mapel_id } : null,
    columns: columns.map(column => {
      const sourceType = sourceMappingByExternalId.get(column.externalId) ?? null;
      return {
        external_id: column.externalId,
        label: column.label,
        source_component_type: sourceType,
        source_component_name: sourceType
          ? gradeComponents.find(component => component.type === sourceType)?.name ?? sourceType
          : null,
      };
    }),
    gradeComponents: gradeComponents.map(component => ({ type: component.type, name: component.name })),
    canConfigureMappings: administrator && canView && !!template && columns.length > 0,
    canManageStudents: administrator,
    matrix,
    rosterReady,
    permissions: { canView, canEdit, canExport: canView && rosterReady && !!template },
    attendanceConfirmed,
  });
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
  if (!file) return jsonError(res, 'Pilih file format nilai e-Rapor (.xls)', 400, 'FILE_REQUIRED');
  if (!file.originalname.toLocaleLowerCase('id-ID').endsWith('.xls')) return jsonError(res, 'Format yang didukung adalah file .xls dari e-Rapor SMP 2025.2', 422, 'INVALID_FILE_TYPE');

  let workbook: ReturnType<typeof parseEraporWorkbook>;
  try {
    workbook = parseEraporWorkbook(file.buffer.toString('utf-8'), semester);
    if (!matchesSelectedClass(workbook.grade, workbook.rombel, targetClass.grade, targetClass.name)) {
      return jsonError(res, 'Isi file tidak cocok dengan kelas yang dipilih di SIGAP', 422, 'CLASS_MISMATCH');
    }
    const school = findActiveSchoolLocation();
    if (school?.npsn && school.npsn !== workbook.npsn) return jsonError(res, 'NPSN pada file berbeda dengan profil sekolah SIGAP', 422, 'NPSN_MISMATCH');
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'File e-Rapor tidak dapat dibaca';
    return jsonError(res, message, 422, 'INVALID_ERAPOR_FILE');
  }

  try {
    const mappings = mapWorkbookStudents(classId, workbook.rows);
    const existingTemplate = findEraporGradeTemplate(classId, subjectId, semester);
    const configuredByExternalId = new Map(existingTemplate
      ? findEraporColumnMappings(existingTemplate.id).map(item => [item.external_id, item.source_component_type])
      : []);
    const profile = saveEraporTemplateSetup({
      academic_year_id: targetClass.academic_year_id,
      class_id: classId,
      subject_id: subjectId,
      semester: semester as 1 | 2,
      mapel_id: workbook.mapelId,
      template_html: workbook.html,
      source_file_name: file.originalname.replace(/[^\w .()-]/g, '_').slice(0, 120),
      created_by: req.user.id,
      mappings,
    });
    const studentIdByExternalId = new Map(mappings.map(mapping => [mapping.external_member_id, mapping.student_id]));
    const gradeInputs = workbook.rows.flatMap(row => workbook.columns.flatMap((column, index) => {
      const score = row.scores[index];
      const studentId = studentIdByExternalId.get(row.externalMemberId);
      const type = configuredByExternalId.get(column.externalId) || column.gradeType;
      return score === null || !studentId ? [] : [{ student_id: studentId, subject_id: subjectId, class_id: classId, type, score }];
    }));
    const changes = saveEraporGradeChanges(gradeInputs, req.user.id);
    auditGradeChanges(changes, req.user.id);
    return jsonSuccess(res, `Template tersimpan dan ${changes.length} perubahan nilai berhasil diimpor`, {
      template_id: profile.id,
      students: mappings.length,
      columns: workbook.columns.length,
      scores_saved: changes.length,
      mapel_id: workbook.mapelId,
    });
  } catch (error: unknown) {
    if (String(error).includes('SQLITE_CONSTRAINT_UNIQUE')) {
      return jsonError(res, 'ID anggota rombel pada file sudah terhubung ke siswa lain di kelas ini', 409, 'ERAPOR_ID_CONFLICT');
    }
    Logger.error('Failed to import e-Rapor grades', error as Error);
    return jsonError(res, error instanceof Error ? error.message : 'Gagal mengimpor nilai e-Rapor', 422, 'ERAPOR_IMPORT_FAILED');
  }
};

export const saveEraporColumnMappings = (req: NaraRequest, res: NaraResponse) => {
  if (!req.user) return jsonError(res, 'Sesi login diperlukan', 401);
  if (!isAdmin(req.user.id)) return jsonError(res, 'Hanya admin yang dapat mengatur pemetaan nilai e-Rapor', 403, 'ADMIN_REQUIRED');
  const parsed = EraporColumnMappingsSchema.safeParse(req.body);
  if (!parsed.success) return jsonValidationError(res, 'Pemetaan kolom e-Rapor tidak valid', zodToErrors(parsed.error));
  const { class_id: classId, subject_id: subjectId, semester } = parsed.data;
  const targetClass = findClassById(classId);
  const template = findEraporGradeTemplate(classId, subjectId, semester);
  if (!targetClass || !template) return jsonError(res, 'Template e-Rapor belum tersedia untuk pilihan ini', 404, 'ERAPOR_TEMPLATE_NOT_FOUND');

  let columns: EraporAssessmentColumn[];
  try {
    columns = parseEraporWorkbook(template.template_html, semester).columns;
  } catch (error: unknown) {
    Logger.error('Stored e-Rapor template could not be parsed during mapping save', error as Error);
    return jsonError(res, 'Template e-Rapor tersimpan tidak valid. Unggah ulang file dari e-Rapor.', 409, 'INVALID_ERAPOR_TEMPLATE');
  }
  const entries = parsed.data.mappings;
  if (entries.length !== columns.length || new Set(entries.map(item => item.external_id)).size !== columns.length) {
    return jsonError(res, 'Pemetaan harus mencakup setiap kolom template tepat satu kali', 422, 'ERAPOR_COLUMN_MISMATCH');
  }
  const columnsById = new Map(columns.map(column => [column.externalId, column]));
  const components = new Set(findGradeComponentsByYear(targetClass.academic_year_id).map(component => component.type));
  const selectedSources = entries.flatMap(item => item.source_component_type ? [item.source_component_type] : []);
  if (new Set(selectedSources).size !== selectedSources.length) {
    return jsonError(res, 'Setiap jenis nilai SIGAP hanya dapat dipetakan ke satu kolom e-Rapor dalam template ini', 422, 'DUPLICATE_ERAPOR_SOURCE');
  }
  const sourcesUsedInOtherSemester = new Set(findEraporColumnMappingsByClassSubject(classId, subjectId)
    .filter(item => item.semester !== semester && item.source_component_type)
    .map(item => item.source_component_type!));
  if (selectedSources.some(sourceType => sourcesUsedInOtherSemester.has(sourceType))) {
    return jsonError(res, 'Gunakan jenis nilai SIGAP yang berbeda untuk semester berbeda agar nilainya tidak saling menimpa', 422, 'ERAPOR_SOURCE_USED_IN_OTHER_SEMESTER');
  }
  if (entries.some(item => !columnsById.has(item.external_id) || (item.source_component_type !== null && !components.has(item.source_component_type)))) {
    return jsonError(res, 'Pilih kolom template dan jenis nilai SIGAP yang tersedia', 422, 'INVALID_ERAPOR_MAPPING');
  }

  try {
    const changes = persistEraporColumnMappings(template.id, entries.map(item => ({
      external_id: item.external_id,
      source_component_type: item.source_component_type,
      direct_grade_type: columnsById.get(item.external_id)!.gradeType,
    })));
    auditGradeChanges(changes, req.user.id);
    return jsonSuccess(res, 'Pemetaan nilai e-Rapor tersimpan', { mapped: entries.filter(item => item.source_component_type).length, direct: entries.filter(item => !item.source_component_type).length });
  } catch (error: unknown) {
    Logger.error('Failed to save e-Rapor column mappings', error as Error);
    return jsonError(res, 'Pemetaan nilai e-Rapor gagal disimpan', 500, 'ERAPOR_MAPPING_SAVE_FAILED');
  }
};

export const saveEraporGrades = (req: NaraRequest, res: NaraResponse) => {
  if (!req.user) return jsonError(res, 'Sesi login diperlukan', 401);
  const form = EraporGradeSaveSchema.safeParse(req.body);
  if (!form.success) return jsonValidationError(res, 'Data nilai e-Rapor tidak valid', zodToErrors(form.error));
  const { class_id: classId, subject_id: subjectId, semester, entries } = form.data;
  if (!canEditScope(req.user.id, classId, subjectId)) return jsonError(res, 'Anda tidak memiliki akses untuk mengubah nilai mapel dan kelas ini', 403);
  if (isTeacherActor(req.user.id) && !attendanceConfirmedToday(req.user.id)) return jsonError(res, 'Konfirmasi kehadiran hari ini diperlukan sebelum mengakses nilai', 403, 'CONFIRMATION_REQUIRED');

  const template = findEraporGradeTemplate(classId, subjectId, semester);
  if (!template) return jsonError(res, 'Unggah template e-Rapor untuk kelas, mapel, dan semester ini terlebih dahulu', 409, 'ERAPOR_TEMPLATE_REQUIRED');
  const roster = findStudentsByClass(classId);
  const mappings = findEraporStudentMappings(classId);
  const mappedStudentIds = new Set(mappings.map(mapping => mapping.student_id));
  if (roster.some(student => !mappedStudentIds.has(student.id))) return jsonError(res, 'Pemetaan siswa e-Rapor belum lengkap. Unggah ulang template untuk kelas ini.', 409, 'ERAPOR_ROSTER_MISMATCH');
  if (entries.length !== roster.length || new Set(entries.map(entry => entry.student_id)).size !== entries.length || entries.some(entry => !roster.some(student => student.id === entry.student_id))) {
    return jsonError(res, 'Data harus mencakup setiap siswa di kelas tepat satu kali', 422, 'ERAPOR_STUDENT_MISMATCH');
  }

  let columns: EraporAssessmentColumn[];
  try {
    columns = parseEraporWorkbook(template.template_html, semester).columns;
  } catch (error: unknown) {
    Logger.error('Stored e-Rapor template could not be parsed during grade save', error as Error);
    return jsonError(res, 'Template e-Rapor tersimpan tidak valid. Unggah ulang file dari e-Rapor.', 409, 'INVALID_ERAPOR_TEMPLATE');
  }
  const columnsByExternalId = new Map(columns.map(column => [column.externalId, column]));
  const sourceMappingByExternalId = new Map(findEraporColumnMappings(template.id)
    .filter(item => !!item.source_component_type)
    .map(item => [item.external_id, item.source_component_type!]));
  const changes = [] as Array<{ student_id: string; subject_id: string; class_id: string; type: string; score: number | null }>;
  for (const entry of entries) {
    if (entry.scores.length !== columns.length || new Set(entry.scores.map(score => score.external_id)).size !== columns.length) {
      return jsonError(res, 'Setiap siswa harus memiliki satu nilai untuk setiap kolom template', 422, 'ERAPOR_COLUMN_MISMATCH');
    }
    for (const item of entry.scores) {
      const column = columnsByExternalId.get(item.external_id);
      if (!column) return jsonError(res, 'Kolom nilai tidak cocok dengan template tersimpan', 422, 'ERAPOR_COLUMN_MISMATCH');
      changes.push({
        student_id: entry.student_id,
        subject_id: subjectId,
        class_id: classId,
        type: sourceMappingByExternalId.get(column.externalId) ?? column.gradeType,
        score: item.score,
      });
    }
  }

  try {
    const saved = saveEraporGradeChanges(changes, req.user.id);
    auditGradeChanges(saved, req.user.id);
    return jsonSuccess(res, `${saved.length} perubahan nilai e-Rapor tersimpan`, { saved: saved.length });
  } catch (error: unknown) {
    Logger.error('Failed to save e-Rapor grades', error as Error);
    return jsonError(res, 'Nilai e-Rapor gagal disimpan', 500, 'ERAPOR_SAVE_FAILED');
  }
};

export const exportEraporGrades = (req: NaraRequest, res: NaraResponse) => {
  if (!req.user) return jsonError(res, 'Sesi login diperlukan', 401);
  const selection = readSelection(req);
  if (!selection.success) return jsonValidationError(res, 'Pilih kelas, mata pelajaran, dan semester yang valid', zodToErrors(selection.error));
  const format = queryString(req, 'format', 'xlsx');
  if (format !== 'xls' && format !== 'xlsx') return jsonError(res, 'Pilih format ekspor .xls atau .xlsx', 422, 'INVALID_EXPORT_FORMAT');
  const { class_id: classId, subject_id: subjectId, semester } = selection.data;
  if (!canViewScope(req.user.id, classId, subjectId)) return jsonError(res, 'Anda tidak memiliki akses ke nilai mapel dan kelas ini', 403);
  if (isTeacherActor(req.user.id) && !attendanceConfirmedToday(req.user.id)) return jsonError(res, 'Konfirmasi kehadiran hari ini diperlukan sebelum mengakses nilai', 403, 'CONFIRMATION_REQUIRED');

  const targetClass = findClassById(classId);
  const template = findEraporGradeTemplate(classId, subjectId, semester);
  if (!targetClass || !template) return jsonError(res, 'Template e-Rapor belum tersedia untuk pilihan ini', 404, 'ERAPOR_TEMPLATE_NOT_FOUND');
  const students = findStudentsByClass(classId);
  const mappings = findEraporStudentMappings(classId);
  const mappingByStudent = new Map(mappings.map(mapping => [mapping.student_id, mapping.external_member_id]));
  let workbook: ReturnType<typeof parseEraporWorkbook>;
  try {
    workbook = parseEraporWorkbook(template.template_html, semester);
  } catch (error: unknown) {
    Logger.error('Stored e-Rapor template could not be parsed during export', error as Error);
    return jsonError(res, 'Template e-Rapor tersimpan tidak valid. Unggah ulang file dari e-Rapor.', 409, 'INVALID_ERAPOR_TEMPLATE');
  }
  const templateMembers = new Set(workbook.rows.map(row => row.externalMemberId));
  if (students.length !== workbook.rows.length || students.some(student => !mappingByStudent.has(student.id) || !templateMembers.has(mappingByStudent.get(student.id) ?? ''))) {
    return jsonError(res, 'Daftar siswa berubah sejak template diunggah. Unggah ulang template e-Rapor terbaru.', 409, 'ERAPOR_ROSTER_MISMATCH');
  }
  const grades = findGradesByClassSubject(classId, subjectId);
  const sourceMappingByExternalId = new Map(findEraporColumnMappings(template.id)
    .filter(item => !!item.source_component_type)
    .map(item => [item.external_id, item.source_component_type!]));
  const typeByExternalId = new Map(workbook.columns.map(column => [
    column.externalId,
    sourceMappingByExternalId.get(column.externalId) ?? column.gradeType,
  ]));
  const typeSet = new Set(typeByExternalId.values());
  const scoresByStudent = new Map<string, Map<string, number>>();
  for (const grade of grades) {
    if (!typeSet.has(grade.type)) continue;
    const scores = scoresByStudent.get(grade.student_id) ?? new Map<string, number>();
    scores.set(grade.type, grade.score);
    scoresByStudent.set(grade.student_id, scores);
  }
  const currentStudentById = new Map(students.map(student => [student.id, student]));
  const rowsByMemberId = new Map<string, { name: string; scores: Map<string, number> }>();
  for (const mapping of mappings) {
    const student = currentStudentById.get(mapping.student_id);
    if (!student) continue;
    const gradeScores = scoresByStudent.get(student.id) ?? new Map<string, number>();
    const templateScores = new Map<string, number>();
    for (const column of workbook.columns) {
      const sourceType = typeByExternalId.get(column.externalId);
      const score = sourceType ? gradeScores.get(sourceType) : undefined;
      if (score !== undefined) templateScores.set(column.gradeType, score);
    }
    rowsByMemberId.set(mapping.external_member_id, { name: student.name, scores: templateScores });
  }

  const renderedHtml = renderEraporWorkbook(template.template_html, rowsByMemberId, workbook.columns);
  const fileNameBase = `Nilai_mapel_${workbook.mapelId}_${workbook.grade}${workbook.rombel}`.replace(/[^\w.-]/g, '_');
  if (format === 'xls') {
    res.setHeader('Content-Type', 'application/vnd.ms-excel; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${fileNameBase}.xls"`);
    return res.send(renderedHtml);
  }

  const numericCells = new Set<string>();
  for (const row of workbook.rows) {
    workbook.columns.forEach((_column, index) => numericCells.add(`${eraporExcelColumnName(index + 7)}${row.rowNumber}`));
  }
  const output = createEraporXlsx(renderedHtml, numericCells);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${fileNameBase}.xlsx"`);
  return res.send(output);
};
