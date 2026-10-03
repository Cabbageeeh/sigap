import type { NaraRequest, NaraResponse } from '@core';
import { jsonError } from '@core';
import { findClassById } from '@queries/classes';
import { findClassRoster } from '@queries/students';
import { isAdmin } from '@queries/users';
import { createEraporXlsx } from '@services/EraporXlsx';

const escapeTemplateCell = (value: string): string => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;');

export const exportClassStudentImportTemplate = (req: NaraRequest, res: NaraResponse) => {
  if (!req.user) return jsonError(res, 'Unauthorized', 401);
  if (!isAdmin(req.user.id)) return jsonError(res, 'Forbidden', 403);

  const classId = req.params.id;
  const classContext = classId ? findClassById(classId) : undefined;
  if (!classContext) return jsonError(res, 'Kelas tidak ditemukan', 404, 'CLASS_NOT_FOUND');

  const headers = [
    'ID Siswa SIGAP (jangan diubah)',
    'NIS',
    'Nama Siswa',
    'Kelas',
    'Telepon Siswa',
    'Alamat Siswa',
    'Nama Orang Tua',
    'Telepon Orang Tua',
    'Alamat Orang Tua',
  ];
  const roster = findClassRoster(classContext.id);
  const rows = [headers, ...roster.map(student => [
    student.id,
    student.nis,
    student.name,
    classContext.name,
    student.phone ?? '',
    student.address ?? '',
    student.parent_name ?? '',
    student.parent_phone ?? '',
    student.parent_address ?? '',
  ])];
  const html = `<html><body><table>${rows.map(row => `<tr>${row.map(value => `<td>${escapeTemplateCell(value)}</td>`).join('')}</tr>`).join('')}</table></body></html>`;
  const output = createEraporXlsx(html, new Set(), 'Data Siswa');
  const safeClassName = classContext.name.replace(/[^\w-]+/g, '-').replace(/^-|-$/g, '') || 'kelas';
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="data-kelas-${safeClassName}.xlsx"`);
  res.setHeader('Cache-Control', 'no-store');
  return res.send(output);
};
