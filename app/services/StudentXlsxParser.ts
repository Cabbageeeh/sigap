import { inflateRawSync } from 'zlib';
import path from 'node:path';

const REQUIRED_XLSX_PARTS = new Set(['xl/workbook.xml', 'xl/_rels/workbook.xml.rels']);
const MAX_ZIP_ENTRIES = 200;
const MAX_PART_BYTES = 8 * 1024 * 1024;
const MAX_TOTAL_PART_BYTES = 16 * 1024 * 1024;
const MAX_ROWS = 10_000;
const MAX_COLUMNS = 32;

const isRequiredPart = (name: string): boolean => REQUIRED_XLSX_PARTS.has(name)
  || name === 'xl/sharedStrings.xml'
  || /^xl\/worksheets\/[^/]+\.xml$/i.test(name);

const readZipParts = (archive: Buffer): Map<string, Buffer> => {
  const endSignature = Buffer.from([0x50, 0x4b, 0x05, 0x06]);
  const endOffset = archive.lastIndexOf(endSignature);
  if (endOffset < 0 || endOffset + 22 > archive.length) throw new Error('File Excel tidak valid. Unduh template .xlsx dari SIGAP.');

  const entryCount = archive.readUInt16LE(endOffset + 10);
  const directoryOffset = archive.readUInt32LE(endOffset + 16);
  if (entryCount > MAX_ZIP_ENTRIES || directoryOffset >= archive.length) throw new Error('File Excel terlalu kompleks untuk diimpor.');

  const parts = new Map<string, Buffer>();
  let directoryPosition = directoryOffset;
  let totalUncompressedBytes = 0;
  for (let index = 0; index < entryCount; index += 1) {
    if (directoryPosition + 46 > archive.length || archive.readUInt32LE(directoryPosition) !== 0x02014B50) {
      throw new Error('Struktur file Excel tidak dapat dibaca.');
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
    const fileName = archive.subarray(fileNameStart, fileNameStart + fileNameLength).toString('utf8').replace(/\\/g, '/');
    directoryPosition += 46 + fileNameLength + extraLength + commentLength;
    if (!isRequiredPart(fileName)) continue;
    if ((flags & 0x0001) !== 0 || uncompressedSize > MAX_PART_BYTES) throw new Error('File Excel terenkripsi atau berukuran terlalu besar.');
    if (compressionMethod !== 0 && compressionMethod !== 8) throw new Error('Metode kompresi file Excel tidak didukung.');

    if (localHeaderOffset + 30 > archive.length || archive.readUInt32LE(localHeaderOffset) !== 0x04034B50) {
      throw new Error('Isi file Excel tidak lengkap.');
    }
    const localNameLength = archive.readUInt16LE(localHeaderOffset + 26);
    const localExtraLength = archive.readUInt16LE(localHeaderOffset + 28);
    const dataStart = localHeaderOffset + 30 + localNameLength + localExtraLength;
    const dataEnd = dataStart + compressedSize;
    if (dataEnd > archive.length) throw new Error('Isi file Excel tidak lengkap.');

    const compressedData = archive.subarray(dataStart, dataEnd);
    const contents = compressionMethod === 0 ? Buffer.from(compressedData) : inflateRawSync(compressedData, { maxOutputLength: MAX_PART_BYTES });
    if (contents.length !== uncompressedSize) throw new Error('Isi file Excel tidak lengkap.');
    totalUncompressedBytes += contents.length;
    if (totalUncompressedBytes > MAX_TOTAL_PART_BYTES) throw new Error('File Excel terlalu besar untuk diimpor.');
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

const textRuns = (xml: string): string => [...xml.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t\s*>/gi)]
  .map(match => decodeXml(match[1] ?? ''))
  .join('');

const readSharedStrings = (xml: string | undefined): string[] => xml
  ? [...xml.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si\s*>/gi)].map(match => textRuns(match[1] ?? ''))
  : [];

const firstWorksheetPath = (workbookXml: string, relationshipsXml: string): string => {
  const firstSheetAttributes = /<sheet\b([^>]*)\/?\s*>/i.exec(workbookXml)?.[1];
  const relationshipId = firstSheetAttributes ? xmlAttribute(firstSheetAttributes, 'r:id') : undefined;
  if (!relationshipId) throw new Error('File Excel tidak memiliki lembar data siswa.');

  const relationship = [...relationshipsXml.matchAll(/<Relationship\b([^>]*)\/?\s*>/gi)]
    .find(match => xmlAttribute(match[1] ?? '', 'Id') === relationshipId);
  const target = relationship ? xmlAttribute(relationship[1] ?? '', 'Target') : undefined;
  if (!target) throw new Error('Lembar data pada file Excel tidak ditemukan.');

  const sheetPath = path.posix.normalize(target.startsWith('/') ? target.slice(1) : `xl/${target}`);
  if (!/^xl\/worksheets\/[^/]+\.xml$/i.test(sheetPath)) throw new Error('Lokasi lembar Excel tidak didukung.');
  return sheetPath;
};

const columnIndexFromReference = (reference: string): number => {
  const letters = /^\$?([A-Z]+)\$?\d+$/i.exec(reference)?.[1]?.toUpperCase();
  if (!letters) return -1;
  let column = 0;
  for (const letter of letters) column = column * 26 + letter.charCodeAt(0) - 64;
  return column - 1;
};

const csvCell = (value: string): string => `"${value.replace(/"/g, '""')}"`;

export const parseStudentXlsxToCsv = (archive: Buffer): string => {
  const parts = readZipParts(archive);
  const workbookXml = parts.get('xl/workbook.xml')?.toString('utf8');
  const relationshipsXml = parts.get('xl/_rels/workbook.xml.rels')?.toString('utf8');
  if (!workbookXml || !relationshipsXml) throw new Error('File Excel tidak valid. Unduh template .xlsx dari SIGAP.');

  const worksheetPath = firstWorksheetPath(workbookXml, relationshipsXml);
  const worksheetXml = parts.get(worksheetPath)?.toString('utf8');
  if (!worksheetXml) throw new Error('Lembar data pada file Excel tidak ditemukan.');
  const sharedStrings = readSharedStrings(parts.get('xl/sharedStrings.xml')?.toString('utf8'));
  const rows = new Map<number, string[]>();
  let nextRowNumber = 1;
  let maxRowNumber = 0;
  let maxColumnCount = 8;

  for (const rowMatch of worksheetXml.matchAll(/<row\b([^>]*?)(?:\/>|>([\s\S]*?)<\/row\s*>)/gi)) {
    const attributes = rowMatch[1] ?? '';
    const explicitRowNumber = Number(xmlAttribute(attributes, 'r'));
    const rowNumber = Number.isSafeInteger(explicitRowNumber) && explicitRowNumber > 0 ? explicitRowNumber : nextRowNumber;
    if (rowNumber > MAX_ROWS) throw new Error(`File Excel melebihi batas ${MAX_ROWS} baris.`);
    nextRowNumber = rowNumber + 1;
    maxRowNumber = Math.max(maxRowNumber, rowNumber);
    const cells = Array<string>(MAX_COLUMNS).fill('');

    for (const cellMatch of (rowMatch[2] ?? '').matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c\s*>)/gi)) {
      const cellAttributes = cellMatch[1] ?? '';
      const reference = xmlAttribute(cellAttributes, 'r') ?? '';
      const columnIndex = columnIndexFromReference(reference);
      if (columnIndex < 0 || columnIndex >= MAX_COLUMNS) continue;
      const cellXml = cellMatch[2] ?? '';
      const cellType = xmlAttribute(cellAttributes, 't');
      let value = '';
      if (cellType === 'inlineStr') {
        value = textRuns(cellXml);
      } else {
        const rawValue = /<v\b[^>]*>([\s\S]*?)<\/v\s*>/i.exec(cellXml)?.[1];
        if (rawValue !== undefined) {
          const decodedValue = decodeXml(rawValue);
          if (cellType === 's') {
            const sharedString = sharedStrings[Number(decodedValue)];
            if (sharedString === undefined) throw new Error('Teks pada file Excel tidak dapat dibaca.');
            value = sharedString;
          } else {
            value = decodedValue;
          }
        }
      }
      cells[columnIndex] = value;
      maxColumnCount = Math.max(maxColumnCount, columnIndex + 1);
    }
    rows.set(rowNumber, cells);
  }

  if (maxRowNumber === 0) throw new Error('File Excel tidak memiliki baris data.');
  return Array.from({ length: maxRowNumber }, (_unused, index) => {
    const values = rows.get(index + 1) ?? Array<string>(MAX_COLUMNS).fill('');
    return values.slice(0, maxColumnCount).map(csvCell).join(',');
  }).join('\n');
};
