import type { NaraRequest, NaraResponse } from '@core';
import { jsonError, queryInt } from '@core';
import { renderTablePdf, type PdfCell, type PdfColumn } from '@services/Pdf';
import { findActiveSchoolLocation } from '@queries/schoolLocations';
import { findClassById, findClassesByTeacherUser } from '@queries/classes';
import { findClassRoster } from '@queries/students';
import { findAllSubjects } from '@queries/subjects';
import { findSchedulesByTeacher } from '@queries/schedules';
import { isTeacherHomeroomOfClass, isTeacherUser } from '@queries/teacherClassAssignments';
import { getAttendanceRecap } from '@queries/studentAttendance';
import { findClassGradeDetails } from '@queries/headmaster';
import { findConfirmationReportRows } from '@queries/teacherConfirmations';
import { findJournalReportRows } from '@queries/journals';
import { isAdmin, hasPermission, hasRole } from '@queries/users';

const DAY_MS = 86400000;

const startOfDay = (timestamp: number): number => {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
};

const formatDate = (timestamp: number): string =>
  new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(timestamp);

const formatClock = (timestamp: number): string =>
  new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false }).format(timestamp);

const compactDate = (timestamp: number): string => {
  const date = new Date(timestamp);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}${month}${day}`;
};

const slug = (value: string): string =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'dokumen';

const rate = (part: number, total: number): string =>
  total > 0 ? `${Math.round((part / total) * 100)}%` : '—';

// Reports default to the running month — that is the period a school prints for.
const requestedRange = (req: NaraRequest): { from: number; to: number } => {
  const now = Date.now();
  const today = startOfDay(now);
  const monthStart = startOfDay(new Date(new Date(now).getFullYear(), new Date(now).getMonth(), 1).getTime());
  const from = queryInt(req, 'from', monthStart);
  const requestedTo = queryInt(req, 'to', today + DAY_MS - 1);
  return requestedTo < from ? { from, to: from + DAY_MS - 1 } : { from, to: requestedTo };
};

const actorLabel = (req: NaraRequest): string => {
  const user = req.user;
  if (!user) return '';
  const role = user.roles?.[0] ?? '';
  return role ? `${user.name || user.username} (${role})` : (user.name || user.username);
};

const schoolName = (): string => findActiveSchoolLocation()?.name ?? '';

const documentMeta = (req: NaraRequest, lines: string[]): string[] => [
  ...lines,
  `Dicetak oleh: ${actorLabel(req)}`,
  `Tanggal cetak: ${formatDate(Date.now())} ${formatClock(Date.now())}`,
];

const sendPdf = (res: NaraResponse, filename: string, buffer: Buffer): NaraResponse => {
  res.status(200)
    .type('application/pdf')
    .setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    .setHeader('Cache-Control', 'no-store')
    .send(buffer);
  return res;
};

const forbidden = (res: NaraResponse): NaraResponse =>
  jsonError(res, 'Anda tidak berhak mengunduh dokumen ini', 403, 'EXPORT_FORBIDDEN');

// A teacher may only document classes they teach; everyone else needs the view
// permission the matching screen already requires.
const teacherOnlyFor = (userId: string): boolean => !isAdmin(userId) && !hasRole(userId, 'parent') && isTeacherUser(userId);

// These documents carry a whole class of personal data, so a parent account is
// never a valid actor here even if it gains a broad view permission later.
const officeMaySee = (userId: string, permission: string): boolean =>
  !hasRole(userId, 'parent') && (isAdmin(userId) || hasPermission(userId, permission));

const classInScope = (userId: string, classId: string): boolean =>
  findClassesByTeacherUser(userId).some(item => item.id === classId);

export const exportClassAttendancePdf = (req: NaraRequest, res: NaraResponse) => {
  if (!req.user) return jsonError(res, 'Sesi login diperlukan', 401);

  const userId = req.user.id;
  const classId = req.params.classId ?? '';
  const classItem = findClassById(classId);
  if (!classItem) return jsonError(res, 'Kelas tidak ditemukan', 404);

  const teacher = teacherOnlyFor(userId);
  const allowed = teacher ? classInScope(userId, classId) : officeMaySee(userId, 'attendance.view');
  if (!allowed) return forbidden(res);

  const { from, to } = requestedRange(req);
  const rows = getAttendanceRecap(classId, from, to, teacher ? userId : undefined);
  const totals = rows.reduce(
    (sum, row) => ({
      present: sum.present + row.present,
      sick: sum.sick + row.sick,
      leave: sum.leave + row.leave,
      absent: sum.absent + row.absent,
      total: sum.total + row.total,
    }),
    { present: 0, sick: 0, leave: 0, absent: 0, total: 0 },
  );

  const columns: PdfColumn[] = [
    { label: 'No', width: 4, align: 'center' },
    { label: 'Nama Siswa', width: 30 },
    { label: 'NIS', width: 12 },
    { label: 'Hadir', width: 8, align: 'center' },
    { label: 'Sakit', width: 8, align: 'center' },
    { label: 'Izin', width: 8, align: 'center' },
    { label: 'Alpa', width: 8, align: 'center' },
    { label: 'Jumlah Sesi', width: 10, align: 'center' },
    { label: 'Persentase Hadir', width: 12, align: 'center' },
  ];
  const body: PdfCell[][] = rows.map((row, index) => [
    index + 1, row.student_name, row.nis, row.present, row.sick, row.leave, row.absent, row.total,
    rate(row.present, row.total),
  ]);
  if (rows.length > 0) {
    body.push(['', 'JUMLAH KESELURUHAN', '', totals.present, totals.sick, totals.leave, totals.absent, totals.total,
      rate(totals.present, totals.total)]);
  }

  const buffer = renderTablePdf({
    title: 'REKAPITULASI KEHADIRAN SISWA',
    subtitle: schoolName(),
    meta: documentMeta(req, [`Kelas: ${classItem.name}`, `Periode: ${formatDate(from)} s.d. ${formatDate(to)}`]),
    columns,
    rows: body,
    footnotes: rows.length === 0
      ? ['Belum ada catatan absensi pada periode ini. Absensi tercatat otomatis lewat jurnal guru.']
      : ['Sumber data: presensi siswa yang tercatat pada jurnal mengajar guru.'],
  });

  return sendPdf(res, `rekap-absensi-${slug(classItem.name)}-${compactDate(from)}-${compactDate(to)}.pdf`, buffer);
};

export const exportClassRosterPdf = (req: NaraRequest, res: NaraResponse) => {
  if (!req.user) return jsonError(res, 'Sesi login diperlukan', 401);

  const userId = req.user.id;
  const classId = req.params.classId ?? '';
  const classItem = findClassById(classId);
  if (!classItem) return jsonError(res, 'Kelas tidak ditemukan', 404);

  const allowed = teacherOnlyFor(userId)
    ? classInScope(userId, classId)
    : officeMaySee(userId, 'students.view');
  if (!allowed) return forbidden(res);

  const rows = findClassRoster(classId);
  const buffer = renderTablePdf({
    title: 'DAFTAR SISWA',
    subtitle: schoolName(),
    meta: documentMeta(req, [`Kelas: ${classItem.name}`, `Jumlah siswa: ${rows.length}`]),
    columns: [
      { label: 'No', width: 4, align: 'center' },
      { label: 'Nama Siswa', width: 24 },
      { label: 'NIS', width: 11 },
      { label: 'Nama Orang Tua / Wali', width: 22 },
      { label: 'Telepon', width: 15 },
      { label: 'Alamat', width: 24 },
    ],
    rows: rows.map((row, index) => [
      index + 1, row.name, row.nis, row.parent_name ?? row.parent_username, row.parent_phone ?? row.phone, row.parent_address ?? row.address,
    ]),
    footnotes: rows.length === 0 ? ['Belum ada siswa terdaftar pada kelas ini.'] : undefined,
  });

  return sendPdf(res, `daftar-siswa-${slug(classItem.name)}.pdf`, buffer);
};

export const exportClassGradesPdf = (req: NaraRequest, res: NaraResponse) => {
  if (!req.user) return jsonError(res, 'Sesi login diperlukan', 401);

  const userId = req.user.id;
  const classId = req.params.classId ?? '';
  const classItem = findClassById(classId);
  if (!classItem) return jsonError(res, 'Kelas tidak ditemukan', 404);

  if (isAdmin(userId) || hasRole(userId, 'parent') || !hasPermission(userId, 'grades.view')) return forbidden(res);

  const teacher = teacherOnlyFor(userId);
  const homeroom = teacher && isTeacherHomeroomOfClass(userId, classId);
  if (teacher && !homeroom && !classInScope(userId, classId)) return forbidden(res);

  const details = findClassGradeDetails(classId);
  const subjectNamesById = new Map(findAllSubjects().map(subject => [subject.id, subject.name]));
  const subjectNames = teacher && !homeroom
    ? new Set(
      findSchedulesByTeacher(userId)
        .filter(schedule => schedule.class_id === classId)
        .map(schedule => subjectNamesById.get(schedule.subject_id) ?? '')
        .filter(Boolean),
    )
    : null;

  // One average per student per subject: the printed sheet is for signing off,
  // not the full component history that lives on screen.
  const students = new Map<string, { name: string; nis: string; scores: Map<string, number[]> }>();
  const subjects = new Set<string>();
  for (const row of details) {
    if (subjectNames && !subjectNames.has(row.subject_name)) continue;
    subjects.add(row.subject_name);
    const student = students.get(row.student_id) ?? { name: row.student_name, nis: row.nis, scores: new Map<string, number[]>() };
    const scores = student.scores.get(row.subject_name) ?? [];
    scores.push(row.score);
    student.scores.set(row.subject_name, scores);
    students.set(row.student_id, student);
  }

  const subjectList = [...subjects].sort((a, b) => a.localeCompare(b, 'id'));
  const average = (values: number[]): string =>
    values.length > 0 ? (values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2) : '—';

  const columns: PdfColumn[] = [
    { label: 'No', width: 4, align: 'center' },
    { label: 'Nama Siswa', width: 22 },
    { label: 'NIS', width: 10 },
    ...subjectList.map(name => ({ label: name, width: 8, align: 'center' as const })),
    { label: 'Rata-rata', width: 9, align: 'center' as const },
  ];
  const body: PdfCell[][] = [...students.values()]
    .sort((a, b) => a.name.localeCompare(b.name, 'id'))
    .map((student, index) => {
      const cells = subjectList.map(name => average(student.scores.get(name) ?? []));
      const all = subjectList.flatMap(name => student.scores.get(name) ?? []);
      return [index + 1, student.name, student.nis, ...cells, average(all)];
    });

  const buffer = renderTablePdf({
    title: 'LEMBAR REKAPITULASI NILAI',
    subtitle: schoolName(),
    landscape: subjectList.length > 5,
    meta: documentMeta(req, [
      `Kelas: ${classItem.name}`,
      subjectNames ? `Mata pelajaran: ${[...subjectNames].join(', ')}` : `Semua mata pelajaran (${subjectList.length})`,
    ]),
    columns,
    rows: body,
    footnotes: body.length === 0
      ? ['Belum ada nilai yang tercatat untuk lingkup ini.']
      : ['Nilai yang tampil adalah rata-rata seluruh komponen (tugas, ulangan harian, UTS, UAS) per mata pelajaran.'],
  });

  return sendPdf(res, `rekap-nilai-${slug(classItem.name)}.pdf`, buffer);
};

export const exportTeacherPresencePdf = (req: NaraRequest, res: NaraResponse) => {
  if (!req.user) return jsonError(res, 'Sesi login diperlukan', 401);

  const userId = req.user.id;
  const privileged = officeMaySee(userId, 'confirmations.view');
  if (!privileged) return forbidden(res);

  const ownView = teacherOnlyFor(userId);
  const scopedTeacher = ownView ? userId : (req.query.teacher_id as string | undefined) || undefined;
  const { from, to } = requestedRange(req);
  const rows = findConfirmationReportRows(from, to, scopedTeacher);
  const startTime = findActiveSchoolLocation()?.start_time ?? null;

  const buffer = renderTablePdf({
    title: 'DAFTAR HADIR GURU',
    subtitle: schoolName(),
    meta: documentMeta(req, [
      `Periode: ${formatDate(from)} s.d. ${formatDate(to)}`,
      `Jumlah pindai: ${rows.length}`,
      startTime ? `Batas datang tepat waktu: ${startTime}` : 'Batas datang tepat waktu belum diatur',
    ]),
    columns: [
      { label: 'No', width: 4, align: 'center' },
      { label: 'Tanggal', width: 14 },
      { label: 'Nama Guru', width: 28 },
      { label: 'Jam Pindai', width: 11, align: 'center' },
      { label: 'Jarak (meter)', width: 11, align: 'center' },
      { label: 'Lokasi', width: 13, align: 'center' },
      { label: 'Status', width: 12, align: 'center' },
    ],
    rows: rows.map((row, index) => [
      index + 1,
      formatDate(row.confirmation_date),
      row.teacher_name,
      formatClock(row.confirmed_at),
      row.distance_meters ?? '—',
      row.is_inside_school === 1 ? 'Dalam radius' : 'Luar radius',
      startTime && formatClock(row.confirmed_at) > startTime ? 'Terlambat' : 'Tepat waktu',
    ]),
    footnotes: rows.length === 0
      ? ['Tidak ada pindai QR pada periode ini.']
      : ['Kehadiran guru dicatat satu kali per hari lewat pindai QR di gerbang sekolah.'],
  });

  return sendPdf(res, `daftar-hadir-guru-${compactDate(from)}-${compactDate(to)}.pdf`, buffer);
};

export const exportJournalLogPdf = (req: NaraRequest, res: NaraResponse) => {
  if (!req.user) return jsonError(res, 'Sesi login diperlukan', 401);

  const userId = req.user.id;
  const teacher = teacherOnlyFor(userId);
  // The journals screen is deliberately closed to administrators, so is its export.
  if (!teacher && (isAdmin(userId) || hasRole(userId, 'parent') || !hasPermission(userId, 'journals.view'))) return forbidden(res);

  const scopedTeacher = teacher ? userId : (req.query.teacher_id as string | undefined) || undefined;
  const { from, to } = requestedRange(req);
  const rows = findJournalReportRows(from, to, scopedTeacher);

  const buffer = renderTablePdf({
    title: 'REKAPITULASI JURNAL MENGAJAR',
    subtitle: schoolName(),
    landscape: true,
    meta: documentMeta(req, [
      `Periode: ${formatDate(from)} s.d. ${formatDate(to)}`,
      `Jumlah sesi tercatat: ${rows.length}`,
    ]),
    columns: [
      { label: 'No', width: 3, align: 'center' },
      { label: 'Tanggal', width: 11 },
      { label: 'Guru', width: 16 },
      { label: 'Kelas', width: 8 },
      { label: 'Mata Pelajaran', width: 16 },
      { label: 'Jam', width: 11, align: 'center' },
      { label: 'Materi', width: 35 },
    ],
    rows: rows.map((row, index) => [
      index + 1,
      formatDate(row.date),
      row.teacher_name,
      row.class_name,
      row.subject_name,
      `${formatClock(row.start_time)}-${formatClock(row.end_time)}`,
      row.material,
    ]),
    footnotes: rows.length === 0 ? ['Belum ada jurnal mengajar pada periode ini.'] : undefined,
  });

  return sendPdf(res, `jurnal-mengajar-${compactDate(from)}-${compactDate(to)}.pdf`, buffer);
};
