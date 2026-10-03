import type { NaraRequest, NaraResponse } from '@core';
import { jsonError, jsonSuccess, jsonValidationError, queryString } from '@core';
import Logger from '@services/Logger';
import { findEraporMappingAuditLogs, findEraporColumnMappings, findEraporColumnMappingsByClassSubject, findEraporDefaultColumnMappingsByYear, findEraporGradeTemplate, findEraporStudentMappings, findEraporTeacherMappingAccessAuditLogs, saveEraporColumnMappings as persistEraporColumnMappings, saveEraporDefaultColumnMappings as persistEraporDefaultColumnMappings, saveEraporGradeChanges } from '@queries/eraporGrades';
import { findAllClasses, findClassById, findClassesByTeacherUser } from '@queries/classes';
import { findAllSubjects, findSubjectById } from '@queries/subjects';
import { findStudentsByClass } from '@queries/students';
import { findGradeComponentsByYear } from '@queries/gradeComponents';
import { findGradesByClassSubject } from '@queries/grades';
import { logGradeChange } from '@queries/gradeAuditLogs';
import { isAdmin, hasPermission, hasRole } from '@queries/users';
import { isTeacherUser, isTeacherAssignedToClassSubject, isTeacherHomeroomOfClass } from '@queries/teacherClassAssignments';
import { findTeacherSchedulesByDay } from '@queries/schedules';
import { findTodayConfirmationByTeacher } from '@queries/teacherConfirmations';
import { isTeacherEraporMappingEnabled, isTeacherPresenceEnabled } from '@queries/appSettings';
import { isTeachingDay } from '@queries/schoolCalendar';
import { EraporColumnMappingsSchema, EraporDefaultColumnMappingsSchema, EraporGradeSaveSchema, EraporTemplateSchema, zodToErrors } from '@validators';
import { normalizeEraporText, parseEraporWorkbook, renderEraporWorkbook, type EraporAssessmentColumn } from '@services/EraporWorkbook';
import { createEraporXlsx, eraporExcelColumnName } from '@services/EraporXlsx';

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

const resolveEraporColumnSources = (
  templateId: string,
  academicYearId: string,
  subjectId: string,
  semester: 1 | 2,
  columns: EraporAssessmentColumn[],
): Map<string, string | null> => {
  const templateSources = new Map(findEraporColumnMappings(templateId)
    .map(item => [item.external_id, item.source_component_type]));
  const defaultSources = new Map<string, string | null>();
  const defaults = findEraporDefaultColumnMappingsByYear(academicYearId)
    .filter(item => item.semester === semester && (item.subject_id === null || item.subject_id === subjectId));
  for (const item of defaults.filter(mapping => mapping.subject_id === null)) defaultSources.set(item.column_key, item.source_component_type);
  for (const item of defaults.filter(mapping => mapping.subject_id === subjectId)) defaultSources.set(item.column_key, item.source_component_type);
  return new Map(columns.map(column => [
    column.externalId,
    templateSources.has(column.externalId)
      ? templateSources.get(column.externalId) ?? null
      : defaultSources.get(normalizeEraporText(column.label)) ?? null,
  ]));
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
        sourceMappingByExternalId = new Map([...resolveEraporColumnSources(
          template.id,
          selectedClass.academic_year_id,
          subjectId,
          semester,
          columns,
        )].filter((entry): entry is [string, string] => !!entry[1]));
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
            score: grades.find(grade => grade.student_id === student.id && grade.type === sourceTypeByExternalId.get(column.externalId))?.score
              ?? (sourceTypeByExternalId.get(column.externalId) !== column.gradeType
                ? grades.find(grade => grade.student_id === student.id && grade.type === column.gradeType)?.score
                : null)
              ?? null,
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
    canConfigureMappings: canView && !!template && columns.length > 0
      && (administrator || (isTeacherEraporMappingEnabled() && canEdit)),
    canSaveAsDefault: administrator,
    canManageMappingAccess: administrator,
    teacherMappingAccessEnabled: isTeacherEraporMappingEnabled(),
    teacherMappingAccessAudit: administrator ? findEraporTeacherMappingAccessAuditLogs() : [],
    mappingAudit: canView && template
      ? findEraporMappingAuditLogs(template.id, selectedClass?.academic_year_id ?? '', subjectId, semester)
      : [],
    canManageStudents: administrator,
    matrix,
    rosterReady,
    permissions: { canView, canEdit, canExport: canView && rosterReady && !!template },
    attendanceConfirmed,
  });
};

export const saveEraporColumnMappings = (req: NaraRequest, res: NaraResponse) => {
  if (!req.user) return jsonError(res, 'Sesi login diperlukan', 401);
  const administrator = isAdmin(req.user.id);
  if (!administrator && !isTeacherActor(req.user.id)) {
    return jsonError(res, 'Hanya guru pengampu dan admin yang dapat mengubah pemetaan e-Rapor', 403, 'ERAPOR_MAPPING_FORBIDDEN');
  }
  if (!administrator && !isTeacherEraporMappingEnabled()) {
    return jsonError(res, 'Admin SIGAP sedang menonaktifkan perubahan pemetaan oleh guru', 403, 'ERAPOR_TEACHER_MAPPING_DISABLED');
  }
  const parsed = EraporColumnMappingsSchema.safeParse(req.body);
  if (!parsed.success) return jsonValidationError(res, 'Pemetaan kolom e-Rapor tidak valid', zodToErrors(parsed.error));
  const { class_id: classId, subject_id: subjectId, semester } = parsed.data;
  if (!administrator && !canEditScope(req.user.id, classId, subjectId)) {
    return jsonError(res, 'Pemetaan hanya dapat diubah untuk kelas dan mapel yang Anda ampu', 403, 'ERAPOR_MAPPING_SCOPE_FORBIDDEN');
  }
  if (!administrator && !attendanceConfirmedToday(req.user.id)) {
    return jsonError(res, 'Konfirmasi kehadiran hari ini diperlukan sebelum mengubah pemetaan nilai', 403, 'TEACHER_CONFIRMATION_REQUIRED');
  }
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
      column_label: columnsById.get(item.external_id)!.label,
      source_component_type: item.source_component_type,
      direct_grade_type: columnsById.get(item.external_id)!.gradeType,
    })), { user_id: req.user.id, user_name: req.user.name ?? req.user.username });
    auditGradeChanges(changes, req.user.id);
    return jsonSuccess(res, 'Pemetaan nilai e-Rapor tersimpan', { mapped: entries.filter(item => item.source_component_type).length, direct: entries.filter(item => !item.source_component_type).length });
  } catch (error: unknown) {
    Logger.error('Failed to save e-Rapor column mappings', error as Error);
    return jsonError(res, 'Pemetaan nilai e-Rapor gagal disimpan', 500, 'ERAPOR_MAPPING_SAVE_FAILED');
  }
};

export const saveEraporDefaultColumnMappings = (req: NaraRequest, res: NaraResponse) => {
  if (!req.user) return jsonError(res, 'Sesi login diperlukan', 401);
  if (!isAdmin(req.user.id)) return jsonError(res, 'Hanya admin yang dapat mengatur pemetaan default e-Rapor', 403, 'ADMIN_REQUIRED');
  const parsed = EraporDefaultColumnMappingsSchema.safeParse(req.body);
  if (!parsed.success) return jsonValidationError(res, 'Pemetaan default e-Rapor tidak valid', zodToErrors(parsed.error));
  const { class_id: classId, subject_id: subjectId, semester, scope, mappings } = parsed.data;
  const targetClass = findClassById(classId);
  const template = findEraporGradeTemplate(classId, subjectId, semester);
  if (!targetClass || !template) return jsonError(res, 'Unggah template e-Rapor untuk pilihan ini terlebih dahulu', 404, 'ERAPOR_TEMPLATE_NOT_FOUND');

  let columns: EraporAssessmentColumn[];
  try {
    columns = parseEraporWorkbook(template.template_html, semester).columns;
  } catch (error: unknown) {
    Logger.error('Stored e-Rapor template could not be parsed during default mapping save', error as Error);
    return jsonError(res, 'Template e-Rapor tersimpan tidak valid. Unggah ulang file dari e-Rapor.', 409, 'INVALID_ERAPOR_TEMPLATE');
  }
  if (mappings.length !== columns.length || new Set(mappings.map(item => item.external_id)).size !== columns.length) {
    return jsonError(res, 'Pemetaan default harus mencakup setiap kolom template tepat satu kali', 422, 'ERAPOR_COLUMN_MISMATCH');
  }
  const columnsById = new Map(columns.map(column => [column.externalId, column]));
  const components = new Set(findGradeComponentsByYear(targetClass.academic_year_id).map(component => component.type));
  if (mappings.some(item => !columnsById.has(item.external_id)
    || (item.source_component_type !== null && !components.has(item.source_component_type)))) {
    return jsonError(res, 'Pilih kolom template dan jenis nilai SIGAP yang tersedia', 422, 'INVALID_ERAPOR_MAPPING');
  }

  const subjectScopeId = scope === 'subject' ? subjectId : null;
  const columnKeys = new Set(columns.map(column => normalizeEraporText(column.label)));
  if (columnKeys.size !== columns.length) {
    return jsonError(res, 'Default tidak dapat disimpan karena ada nama kolom template yang berulang', 422, 'DUPLICATE_ERAPOR_COLUMN_LABEL');
  }
  const existingMappings = findEraporDefaultColumnMappingsByYear(targetClass.academic_year_id);
  const nextMappings = [
    ...existingMappings.filter(item => !(item.semester === semester
      && item.subject_id === subjectScopeId && columnKeys.has(item.column_key))),
    ...mappings.map(item => ({
      semester: semester as 1 | 2,
      subject_id: subjectScopeId,
      column_key: normalizeEraporText(columnsById.get(item.external_id)!.label),
      source_component_type: item.source_component_type,
    })),
  ];
  const subjectIds = new Set([
    subjectId,
    ...findAllSubjects().map(subject => subject.id),
    ...nextMappings.flatMap(item => item.subject_id ? [item.subject_id] : []),
  ]);
  for (const candidateSubjectId of subjectIds) {
    const sourcesBySemester = new Map<number, Set<string>>();
    for (const candidateSemester of [1, 2]) {
      const effectiveByColumn = new Map<string, string | null>();
      for (const item of nextMappings) {
        if (item.semester === candidateSemester && item.subject_id === null) effectiveByColumn.set(item.column_key, item.source_component_type);
      }
      for (const item of nextMappings) {
        if (item.semester === candidateSemester && item.subject_id === candidateSubjectId) effectiveByColumn.set(item.column_key, item.source_component_type);
      }
      const sourceTypes = [...effectiveByColumn.values()].filter((value): value is string => !!value);
      if (new Set(sourceTypes).size !== sourceTypes.length) {
        return jsonError(res, 'Setiap jenis nilai SIGAP hanya dapat dipetakan ke satu kolom e-Rapor untuk mapel dan semester yang sama', 422, 'DUPLICATE_ERAPOR_SOURCE');
      }
      sourcesBySemester.set(candidateSemester, new Set(sourceTypes));
    }
    const semesterOneSources = sourcesBySemester.get(1) ?? new Set<string>();
    const semesterTwoSources = sourcesBySemester.get(2) ?? new Set<string>();
    if ([...semesterOneSources].some(sourceType => semesterTwoSources.has(sourceType))) {
      return jsonError(res, 'Gunakan jenis nilai SIGAP yang berbeda untuk Semester I dan II agar nilainya tidak saling menimpa', 422, 'ERAPOR_SOURCE_USED_IN_OTHER_SEMESTER');
    }
  }

  try {
    persistEraporDefaultColumnMappings(
      targetClass.academic_year_id,
      subjectScopeId,
      semester as 1 | 2,
      mappings.map(item => ({
        column_key: normalizeEraporText(columnsById.get(item.external_id)!.label),
        source_component_type: item.source_component_type,
      })),
      req.user.id,
      req.user.name ?? req.user.username,
      scope === 'subject' ? `${findSubjectById(subjectId)?.name ?? 'Mapel ini'} · semua kelas` : 'Semua mapel · tahun ajaran ini',
    );
    const scopeMessage = scope === 'subject' ? 'mapel ini di semua kelas' : 'semua mapel pada tahun ajaran ini';
    return jsonSuccess(res, `Pemetaan default untuk ${scopeMessage} dan ${semester === 1 ? 'Semester I' : 'Semester II'} tersimpan`, { saved: mappings.length, scope });
  } catch (error: unknown) {
    Logger.error('Failed to save e-Rapor default column mappings', error as Error);
    return jsonError(res, 'Pemetaan default e-Rapor gagal disimpan', 500, 'ERAPOR_DEFAULT_MAPPING_SAVE_FAILED');
  }
};

export const saveEraporGrades = (req: NaraRequest, res: NaraResponse) => {
  if (!req.user) return jsonError(res, 'Sesi login diperlukan', 401);
  const form = EraporGradeSaveSchema.safeParse(req.body);
  if (!form.success) return jsonValidationError(res, 'Data nilai e-Rapor tidak valid', zodToErrors(form.error));
  const { class_id: classId, subject_id: subjectId, semester, entries } = form.data;
  if (!canEditScope(req.user.id, classId, subjectId)) return jsonError(res, 'Anda tidak memiliki akses untuk mengubah nilai mapel dan kelas ini', 403);
  if (isTeacherActor(req.user.id) && !attendanceConfirmedToday(req.user.id)) return jsonError(res, 'Konfirmasi kehadiran hari ini diperlukan sebelum mengakses nilai', 403, 'CONFIRMATION_REQUIRED');

  const targetClass = findClassById(classId);
  const template = findEraporGradeTemplate(classId, subjectId, semester);
  if (!targetClass || !template) return jsonError(res, 'Unggah template e-Rapor untuk kelas, mapel, dan semester ini terlebih dahulu', 409, 'ERAPOR_TEMPLATE_REQUIRED');
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
  const sourceMappingByExternalId = new Map([...resolveEraporColumnSources(
    template.id,
    targetClass.academic_year_id,
    subjectId,
    semester as 1 | 2,
    columns,
  )].filter((entry): entry is [string, string] => !!entry[1]));
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
  const sourceMappingByExternalId = new Map([...resolveEraporColumnSources(
    template.id,
    targetClass.academic_year_id,
    subjectId,
    semester as 1 | 2,
    workbook.columns,
  )].filter((entry): entry is [string, string] => !!entry[1]));
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
      const score = sourceType
        ? gradeScores.get(sourceType) ?? (sourceType !== column.gradeType ? gradeScores.get(column.gradeType) : undefined)
        : undefined;
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
