import { createHash } from 'crypto';
import path from 'node:path';
import { inflateRawSync } from 'zlib';

const MAX_XLSX_ENTRIES = 200;
const MAX_XLSX_PART_BYTES = 8 * 1024 * 1024;
const MAX_XLSX_TOTAL_BYTES = 16 * 1024 * 1024;
const MAX_XLSX_ROWS = 10_000;
const MAX_XLSX_COLUMNS = 128;

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

const isEraporXlsxPart = (name: string): boolean => name === 'xl/workbook.xml'
  || name === 'xl/_rels/workbook.xml.rels'
  || name === 'xl/sharedStrings.xml'
  || /^xl\/worksheets\/[^/]+\.xml$/i.test(name);

const readEraporXlsxParts = (archive: Buffer): Map<string, Buffer> => {
  const endOffset = archive.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (endOffset < 0 || endOffset + 22 > archive.length) throw new Error('File .xlsx tidak valid atau belum tersimpan sebagai workbook Excel.');

  const entryCount = archive.readUInt16LE(endOffset + 10);
  const directoryOffset = archive.readUInt32LE(endOffset + 16);
  if (entryCount > MAX_XLSX_ENTRIES || directoryOffset >= archive.length) throw new Error('Struktur file .xlsx terlalu kompleks untuk diimpor.');

  const parts = new Map<string, Buffer>();
  let directoryPosition = directoryOffset;
  let totalUncompressedBytes = 0;
  for (let index = 0; index < entryCount; index += 1) {
    if (directoryPosition + 46 > archive.length || archive.readUInt32LE(directoryPosition) !== 0x02014B50) {
      throw new Error('Struktur file .xlsx tidak dapat dibaca. Simpan ulang sebagai Excel Workbook (.xlsx).');
    }
    const flags = archive.readUInt16LE(directoryPosition + 8);
    const compressionMethod = archive.readUInt16LE(directoryPosition + 10);
    const compressedSize = archive.readUInt32LE(directoryPosition + 20);
    const uncompressedSize = archive.readUInt32LE(directoryPosition + 24);
    const fileNameLength = archive.readUInt16LE(directoryPosition + 28);
    const extraLength = archive.readUInt16LE(directoryPosition + 30);
    const commentLength = archive.readUInt16LE(directoryPosition + 32);
    const localHeaderOffset = archive.readUInt32LE(directoryPosition + 42);
    const fileNameStart = directoryPosition + 46;
    if (fileNameStart + fileNameLength + extraLength + commentLength > archive.length) throw new Error('Struktur file .xlsx tidak lengkap.');
    const fileName = archive.subarray(fileNameStart, fileNameStart + fileNameLength).toString('utf8').replace(/\\/g, '/');
    directoryPosition += 46 + fileNameLength + extraLength + commentLength;
    if (!isEraporXlsxPart(fileName)) continue;
    if ((flags & 0x0001) !== 0 || uncompressedSize > MAX_XLSX_PART_BYTES) throw new Error('File .xlsx terenkripsi atau berukuran terlalu besar.');
    if (compressionMethod !== 0 && compressionMethod !== 8) throw new Error('Kompresi file .xlsx tidak didukung. Simpan ulang sebagai Excel Workbook (.xlsx).');
    if (localHeaderOffset + 30 > archive.length || archive.readUInt32LE(localHeaderOffset) !== 0x04034B50) throw new Error('Isi file .xlsx tidak lengkap.');

    const localNameLength = archive.readUInt16LE(localHeaderOffset + 26);
    const localExtraLength = archive.readUInt16LE(localHeaderOffset + 28);
    const dataStart = localHeaderOffset + 30 + localNameLength + localExtraLength;
    const dataEnd = dataStart + compressedSize;
    if (dataEnd > archive.length) throw new Error('Isi file .xlsx tidak lengkap.');

    let contents: Buffer;
    try {
      const compressedData = archive.subarray(dataStart, dataEnd);
      contents = compressionMethod === 0
        ? Buffer.from(compressedData)
        : inflateRawSync(compressedData, { maxOutputLength: MAX_XLSX_PART_BYTES });
    } catch {
      throw new Error('Isi file .xlsx tidak dapat diekstrak. Simpan ulang sebagai Excel Workbook (.xlsx).');
    }
    if (contents.length !== uncompressedSize) throw new Error('Isi file .xlsx tidak lengkap.');
    totalUncompressedBytes += contents.length;
    if (totalUncompressedBytes > MAX_XLSX_TOTAL_BYTES) throw new Error('Isi file .xlsx terlalu besar untuk diimpor.');
    parts.set(fileName, contents);
  }
  return parts;
};

const decodeXml = (value: string): string => value.replace(/&(?:amp|lt|gt|quot|apos|#\d+|#x[\da-f]+);/gi, entity => {
  const named: Record<string, string> = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'" };
  const mapped = named[entity.toLowerCase()];
  if (mapped !== undefined) return mapped;
  const codePoint = entity[2]?.toLowerCase() === 'x'
    ? Number.parseInt(entity.slice(3, -1), 16)
    : Number.parseInt(entity.slice(2, -1), 10);
  return Number.isInteger(codePoint) && codePoint >= 0 && codePoint <= 0x10FFFF
    ? String.fromCodePoint(codePoint)
    : entity;
});

const xmlAttribute = (attributes: string, name: string): string | undefined => {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const value = new RegExp(`(?:^|\\s)${escapedName}\\s*=\\s*["']([^"']*)["']`, 'i').exec(attributes)?.[1];
  return value === undefined ? undefined : decodeXml(value);
};

const readXmlTextRuns = (xml: string): string => [...xml.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t\s*>/gi)]
  .map(match => decodeXml(match[1] ?? ''))
  .join('');

const readSharedStrings = (xml: string | undefined): string[] => xml
  ? [...xml.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si\s*>/gi)].map(match => readXmlTextRuns(match[1] ?? ''))
  : [];

const firstWorksheetPath = (workbookXml: string, relationshipsXml: string): string => {
  const sheetAttributes = /<sheet\b([^>]*)\/?\s*>/i.exec(workbookXml)?.[1];
  const relationshipId = sheetAttributes ? xmlAttribute(sheetAttributes, 'r:id') : undefined;
  if (!relationshipId) throw new Error('File .xlsx tidak memiliki lembar kerja.');

  const relationship = [...relationshipsXml.matchAll(/<Relationship\b([^>]*)\/?\s*>/gi)]
    .find(match => xmlAttribute(match[1] ?? '', 'Id') === relationshipId);
  const target = relationship ? xmlAttribute(relationship[1] ?? '', 'Target') : undefined;
  if (!target) throw new Error('Lembar kerja pada file .xlsx tidak ditemukan.');

  const sheetPath = path.posix.normalize(target.startsWith('/') ? target.slice(1) : path.posix.join('xl', target));
  if (!/^xl\/worksheets\/[^/]+\.xml$/i.test(sheetPath)) throw new Error('Lokasi lembar kerja pada file .xlsx tidak didukung.');
  return sheetPath;
};

const columnIndexFromReference = (reference: string): number => {
  const letters = /^\$?([A-Z]+)\$?\d+$/i.exec(reference)?.[1]?.toUpperCase();
  if (!letters) return -1;
  let column = 0;
  for (const letter of letters) column = column * 26 + letter.charCodeAt(0) - 64;
  return column - 1;
};

const xlsxToHtmlTable = (archive: Buffer): string => {
  const parts = readEraporXlsxParts(archive);
  const workbookXml = parts.get('xl/workbook.xml')?.toString('utf8');
  const relationshipsXml = parts.get('xl/_rels/workbook.xml.rels')?.toString('utf8');
  if (!workbookXml || !relationshipsXml) throw new Error('File .xlsx tidak berisi struktur workbook Excel yang valid. Simpan ulang sebagai Excel Workbook (.xlsx).');

  const worksheetXml = parts.get(firstWorksheetPath(workbookXml, relationshipsXml))?.toString('utf8');
  if (!worksheetXml) throw new Error('Lembar kerja pada file .xlsx tidak ditemukan.');
  const sharedStrings = readSharedStrings(parts.get('xl/sharedStrings.xml')?.toString('utf8'));
  const rows = new Map<number, string[]>();
  let nextRowNumber = 1;
  let maxRowNumber = 0;
  let maxColumnNumber = 0;

  for (const rowMatch of worksheetXml.matchAll(/<row\b([^>]*?)(?:\/>|>([\s\S]*?)<\/row\s*>)/gi)) {
    const rowAttributes = rowMatch[1] ?? '';
    const explicitRowNumber = Number(xmlAttribute(rowAttributes, 'r'));
    const rowNumber = Number.isSafeInteger(explicitRowNumber) && explicitRowNumber > 0 ? explicitRowNumber : nextRowNumber;
    if (rowNumber > MAX_XLSX_ROWS) throw new Error(`File .xlsx melebihi batas ${MAX_XLSX_ROWS} baris.`);
    nextRowNumber = rowNumber + 1;
    maxRowNumber = Math.max(maxRowNumber, rowNumber);
    const cells = Array<string>(MAX_XLSX_COLUMNS).fill('');
    let nextColumnNumber = 0;

    for (const cellMatch of (rowMatch[2] ?? '').matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c\s*>)/gi)) {
      const cellAttributes = cellMatch[1] ?? '';
      const reference = xmlAttribute(cellAttributes, 'r') ?? '';
      const referencedColumn = columnIndexFromReference(reference);
      const columnNumber = referencedColumn < 0 ? nextColumnNumber : referencedColumn;
      if (columnNumber >= MAX_XLSX_COLUMNS) throw new Error(`File .xlsx melebihi batas ${MAX_XLSX_COLUMNS} kolom.`);
      nextColumnNumber = columnNumber + 1;
      maxColumnNumber = Math.max(maxColumnNumber, columnNumber + 1);

      const cellXml = cellMatch[2] ?? '';
      const cellType = xmlAttribute(cellAttributes, 't');
      const formula = /<f\b[^>]*>([\s\S]*?)<\/f\s*>/i.exec(cellXml)?.[1];
      let value = '';
      if (cellType === 'inlineStr') {
        value = readXmlTextRuns(cellXml);
      } else {
        const rawValue = /<v\b[^>]*>([\s\S]*?)<\/v\s*>/i.exec(cellXml)?.[1];
        if (rawValue !== undefined) {
          const decodedValue = decodeXml(rawValue);
          if (cellType === 's') {
            const sharedString = sharedStrings[Number(decodedValue)];
            if (sharedString === undefined) throw new Error('Teks pada file .xlsx tidak dapat dibaca.');
            value = sharedString;
          } else {
            value = formula === undefined ? decodedValue : `=${decodeXml(formula)}`;
          }
        }
      }
      cells[columnNumber] = value;
    }
    rows.set(rowNumber, cells);
  }

  if (maxRowNumber === 0 || maxColumnNumber === 0) throw new Error('File .xlsx tidak memiliki tabel nilai.');
  const tableRows = Array.from({ length: maxRowNumber }, (_unused, index) => {
    const cells = rows.get(index + 1) ?? [];
    const tableCells = Array.from({ length: maxColumnNumber }, (_unusedCell, column) => `<td>${escapeHtml(cells[column] ?? '')}</td>`).join('');
    return `<tr>${tableCells}</tr>`;
  }).join('');
  return `<html><body><table>${tableRows}</table></body></html>`;
};

const workbookBufferToSource = (source: Buffer): string => {
  if (source[0] === 0x50 && source[1] === 0x4b) return xlsxToHtmlTable(source);
  if (source[0] === 0xff && source[1] === 0xfe) return source.subarray(2).toString('utf16le');
  if (source[0] === 0xfe && source[1] === 0xff) {
    const littleEndian = Buffer.from(source.subarray(2));
    for (let index = 0; index + 1 < littleEndian.length; index += 2) {
      const byte = littleEndian[index];
      littleEndian[index] = littleEndian[index + 1] ?? 0;
      littleEndian[index + 1] = byte ?? 0;
    }
    return littleEndian.toString('utf16le');
  }
  return source.toString('utf8');
};

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
  const learningColumns = assessmentLabels.flatMap((label, cellIndex) =>
    /^sumatif\s+\d+$/i.test(label) ? [{ label, cellIndex }] : []);
  const finalLabelsByColumn = new Map<number, string>();
  for (let cellIndex = 0; cellIndex < Math.max(assessmentLabels.length, assessmentIds.length); cellIndex += 1) {
    for (const label of [assessmentLabels[cellIndex] ?? '', assessmentIds[cellIndex] ?? '']) {
      const normalized = normalizeEraporText(label);
      if (normalized === 'non tes' || normalized === 'tes') finalLabelsByColumn.set(cellIndex, label.trim());
    }
  }
  const finalColumns = [...finalLabelsByColumn.entries()]
    .map(([cellIndex, label]) => ({ cellIndex, label, normalized: normalizeEraporText(label) }))
    .sort((first, second) => first.cellIndex - second.cellIndex);
  const assessmentPositions = [
    ...learningColumns.map(column => column.cellIndex),
    ...finalColumns.map(column => column.cellIndex),
  ].sort((first, second) => first - second);
  if (learningColumns.length === 0 || finalColumns.length !== 2
    || !finalColumns.some(column => column.normalized === 'non tes')
    || !finalColumns.some(column => column.normalized === 'tes')) {
    throw new Error('Format ini perlu memuat kolom Sumatif serta Akhir Semester Non Tes dan Tes.');
  }
  if (assessmentPositions.some((cellIndex, index) => cellIndex !== index + 7)) {
    throw new Error('Kolom penilaian harus berurutan setelah identitas siswa pada template e-Rapor.');
  }

  const columns: EraporAssessmentColumn[] = learningColumns.map(({ label, cellIndex }) => {
    const externalId = assessmentIds[cellIndex]?.trim() ?? '';
    if (!externalId || !/^\d+$/.test(externalId)) throw new Error(`ID untuk kolom ${label} tidak ditemukan pada header file.`);
    return { index: cellIndex - 7, category: 'lingkup_materi', label, externalId, gradeType: gradeTypeFor(semester, 'lingkup_materi', externalId) };
  });
  for (const { cellIndex, label, normalized } of finalColumns) {
    const externalId = normalized === 'non tes' ? 'non_tes' : 'tes';
    columns.push({ index: cellIndex - 7, category: 'akhir_semester', label, externalId, gradeType: gradeTypeFor(semester, 'akhir_semester', externalId) });
  }
  columns.sort((first, second) => first.index - second.index);
  if (new Set(columns.map(column => column.externalId)).size !== columns.length) throw new Error('ID kolom penilaian pada header harus unik.');

  const expectedCellCount = columns.length + 8;
  const bodyRows = rows.slice(headerIndex + 3).map((rowHtml, index) => {
    const cells = parseCells(rowHtml);
    const hasUnexpectedValues = cells.slice(expectedCellCount).some(cell => cell.value !== '');
    const normalizedCells = cells.slice(0, expectedCellCount);
    while (normalizedCells.length < expectedCellCount) normalizedCells.push({ value: '', openTag: '<td>', closeTag: '</td>' });
    return { rowHtml, rowNumber: headerIndex + index + 4, cells: normalizedCells, hasUnexpectedValues };
  }).filter(row => /^\d+$/.test(row.cells[0]?.value ?? '') && !row.hasUnexpectedValues);
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
      scores: columns.map(column => parseScore(cells[column.index + 7]?.value ?? '', rowNumber, column.label)),
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

export const parseEraporWorkbookFile = (source: Buffer, semester: number): ParsedEraporWorkbook =>
  parseEraporWorkbook(workbookBufferToSource(source), semester);

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
  columns.forEach(column => replacementByIndex.set(column.index + 7, String(entry.scores.get(column.gradeType) ?? '')));
  let cellIndex = 0;
  return rowHtml.replace(/(<t[dh]\b[^>]*>)[\s\S]*?(<\/t[dh]>)/gi, (cellHtml, openTag: string, closeTag: string) => {
    const replacement = replacementByIndex.get(cellIndex++);
    return replacement === undefined ? cellHtml : `${openTag}${escapeHtml(replacement)}${closeTag}`;
  });
});
