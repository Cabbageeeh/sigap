import { createHash } from 'crypto';

export interface EraporAssessmentColumn {
  index: number;
  category: 'lingkup_materi' | 'akhir_semester';
  label: string;
  externalId: string;
  gradeType: string;
}

export interface EraporWorkbookRow {
  rowNumber: number;
  number: string;
  name: string;
  mapelId: string;
  npsn: string;
  grade: string;
  rombel: string;
  externalMemberId: string;
  scores: Array<number | null>;
  status: string;
}

export interface ParsedEraporWorkbook {
  html: string;
  mapelId: string;
  npsn: string;
  grade: string;
  rombel: string;
  columns: EraporAssessmentColumn[];
  rows: EraporWorkbookRow[];
}

interface HtmlCell {
  value: string;
  openTag: string;
  closeTag: string;
}

const decodeHtml = (value: string): string => value
  .replace(/<br\s*\/?>/gi, ' ')
  .replace(/<[^>]*>/g, ' ')
  .replace(/&nbsp;|&#160;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;|&apos;/gi, "'")
  .replace(/&#(\d+);/g, (_match, decimal: string) => String.fromCodePoint(Number(decimal)))
  .replace(/&#x([\da-f]+);/gi, (_match, hexadecimal: string) => String.fromCodePoint(parseInt(hexadecimal, 16)))
  .replace(/\s+/g, ' ')
  .trim();

const escapeHtml = (value: string): string => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

const sanitizeHtml = (html: string): string => html
  .replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, '')
  .replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
  .replace(/\s+(?:href|src)\s*=\s*("|')\s*javascript:[\s\S]*?\1/gi, '');

const parseCells = (rowHtml: string): HtmlCell[] => {
  const cells: HtmlCell[] = [];
  const expression = /(<t[dh]\b[^>]*>)([\s\S]*?)(<\/t[dh]>)/gi;
  for (const match of rowHtml.matchAll(expression)) {
    cells.push({ value: decodeHtml(match[2] ?? ''), openTag: match[1] ?? '<td>', closeTag: match[3] ?? '</td>' });
  }
  return cells;
};

const readRows = (html: string): string[] => [...html.matchAll(/<tr\b[^>]*>[\s\S]*?<\/tr\s*>/gi)].map(match => match[0]);

const gradeTypeFor = (semester: number, category: EraporAssessmentColumn['category'], externalId: string): string => {
  const key = createHash('sha256').update(`${category}:${externalId}`).digest('hex').slice(0, 12);
  return `erapor_s${semester}_${category === 'lingkup_materi' ? 'lm' : 'as'}_${key}`;
};

const parseScore = (value: string, rowNumber: number, columnLabel: string): number | null => {
  if (!value) return null;
  if (/^[=+@]/.test(value)) throw new Error(`Nilai pada baris ${rowNumber}, kolom ${columnLabel} harus berupa angka, bukan rumus.`);
  const score = Number(value.replace(',', '.'));
  if (!Number.isFinite(score) || score < 0 || score > 100) {
    throw new Error(`Nilai pada baris ${rowNumber}, kolom ${columnLabel} harus berupa angka 0–100.`);
  }
  return score;
};

export const normalizeEraporText = (value: string): string => value
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .trim()
  .replace(/\s+/g, ' ')
  .toLocaleLowerCase('id-ID');

export const parseEraporWorkbook = (source: string, semester: number): ParsedEraporWorkbook => {
  const html = sanitizeHtml(source.replace(/^\uFEFF/, ''));
  if (!/^\s*(?:<!doctype\s+html|<html|<div\b)/i.test(html) || !/<table\b/i.test(html)) {
    throw new Error('File tidak dikenali sebagai format nilai e-Rapor SMP 2025.2 (.xls). Unggah file yang diunduh dari menu impor e-Rapor.');
  }

  const rows = readRows(html);
  const headerIndex = rows.findIndex(row => {
    const labels = parseCells(row).map(cell => normalizeEraporText(cell.value));
    return labels.includes('mapel_id') && labels.includes('id_anggota_rombel') && labels.includes('status kunci');
  });
  if (headerIndex < 0 || rows.length < headerIndex + 4) {
    throw new Error('Header file e-Rapor tidak lengkap. Unggah format asli dari e-Rapor.');
  }

  const assessmentLabels = parseCells(rows[headerIndex + 1] ?? '').map(cell => cell.value);
  const assessmentIds = parseCells(rows[headerIndex + 2] ?? '').map(cell => cell.value);
  const learningLabels = assessmentLabels.filter(label => /^sumatif\s+\d+$/i.test(label));
  const finalLabels = assessmentIds.slice(learningLabels.length);
  if (learningLabels.length === 0 || finalLabels.length !== 2 || !finalLabels.some(label => normalizeEraporText(label) === 'non tes') || !finalLabels.some(label => normalizeEraporText(label) === 'tes')) {
    throw new Error('Format ini perlu memuat kolom Sumatif serta Akhir Semester Non Tes dan Tes.');
  }

  const columns: EraporAssessmentColumn[] = learningLabels.map((label, index) => {
    const externalId = assessmentIds[index]?.trim() ?? '';
    if (!externalId || !/^\d+$/.test(externalId)) throw new Error(`ID untuk kolom ${label} tidak ditemukan pada header file.`);
    return { index, category: 'lingkup_materi', label, externalId, gradeType: gradeTypeFor(semester, 'lingkup_materi', externalId) };
  });
  for (const label of finalLabels) {
    const normalized = normalizeEraporText(label);
    const externalId = normalized === 'non tes' ? 'non_tes' : 'tes';
    columns.push({ index: columns.length, category: 'akhir_semester', label, externalId, gradeType: gradeTypeFor(semester, 'akhir_semester', externalId) });
  }
  if (new Set(columns.map(column => column.externalId)).size !== columns.length) throw new Error('ID kolom penilaian pada header harus unik.');

  const bodyRows = rows.slice(headerIndex + 3).map((rowHtml, index) => ({ rowHtml, rowNumber: headerIndex + index + 4, cells: parseCells(rowHtml) }))
    .filter(row => /^\d+$/.test(row.cells[0]?.value ?? '') && row.cells.length === columns.length + 8);
  if (bodyRows.length === 0) throw new Error('File tidak berisi baris siswa.');

  const dataRows = bodyRows.map(({ rowNumber, cells }) => {
    const mapelId = cells[2]?.value ?? '';
    const npsn = cells[3]?.value ?? '';
    const grade = cells[4]?.value ?? '';
    const rombel = cells[5]?.value ?? '';
    const externalMemberId = cells[6]?.value ?? '';
    if (!mapelId || !npsn || !grade || !rombel || !externalMemberId || !cells[1]?.value) {
      throw new Error(`Identitas siswa pada baris ${rowNumber} belum lengkap.`);
    }
    return {
      rowNumber,
      number: cells[0]?.value ?? '',
      name: cells[1]?.value ?? '',
      mapelId,
      npsn,
      grade,
      rombel,
      externalMemberId,
      scores: columns.map((column, index) => parseScore(cells[index + 7]?.value ?? '', rowNumber, column.label)),
      status: cells[columns.length + 7]?.value ?? '',
    };
  });

  const distinctValues = (key: 'mapelId' | 'npsn' | 'grade' | 'rombel'): string[] => [...new Set(dataRows.map(row => row[key]))];
  if (distinctValues('mapelId').length !== 1 || distinctValues('npsn').length !== 1 || distinctValues('grade').length !== 1 || distinctValues('rombel').length !== 1) {
    throw new Error('File mencampur lebih dari satu mapel, sekolah, atau rombel. Unggah satu file untuk satu kelas dan mapel.');
  }
  if (new Set(dataRows.map(row => row.externalMemberId)).size !== dataRows.length) throw new Error('ID anggota rombel pada file harus unik untuk setiap siswa.');

  return { html, mapelId: dataRows[0]!.mapelId, npsn: dataRows[0]!.npsn, grade: dataRows[0]!.grade, rombel: dataRows[0]!.rombel, columns, rows: dataRows };
};

export const renderEraporWorkbook = (
  html: string,
  rowsByMemberId: Map<string, { name: string; scores: Map<string, number> }>,
  columns: EraporAssessmentColumn[],
): string => html.replace(/<tr\b[^>]*>[\s\S]*?<\/tr\s*>/gi, rowHtml => {
  const cells = parseCells(rowHtml);
  if (!/^\d+$/.test(cells[0]?.value ?? '') || cells.length !== columns.length + 8) return rowHtml;
  const entry = rowsByMemberId.get(cells[6]?.value ?? '');
  if (!entry) return rowHtml;
  const replacementByIndex = new Map<number, string>([[1, entry.name]]);
  columns.forEach((column, index) => replacementByIndex.set(index + 7, String(entry.scores.get(column.gradeType) ?? '')));
  let cellIndex = 0;
  return rowHtml.replace(/(<t[dh]\b[^>]*>)[\s\S]*?(<\/t[dh]>)/gi, (cellHtml, openTag: string, closeTag: string) => {
    const replacement = replacementByIndex.get(cellIndex++);
    return replacement === undefined ? cellHtml : `${openTag}${escapeHtml(replacement)}${closeTag}`;
  });
});
