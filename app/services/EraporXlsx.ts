import { deflateRawSync } from 'zlib';

interface ParsedHtmlCell {
  value: string;
  columnSpan: number;
  rowSpan: number;
}

interface SheetCell extends ParsedHtmlCell {
  column: number;
}

interface ZipEntry {
  name: string;
  data: Buffer;
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

const spanValue = (tag: string, name: 'colspan' | 'rowspan'): number => {
  const value = Number(new RegExp(`\\b${name}\\s*=\\s*["']?(\\d+)`, 'i').exec(tag)?.[1] ?? '1');
  return Number.isSafeInteger(value) && value > 0 ? Math.min(value, 100) : 1;
};

const parseHtmlRows = (html: string): ParsedHtmlCell[][] => [...html.matchAll(/<tr\b[^>]*>[\s\S]*?<\/tr\s*>/gi)].map(rowMatch => {
  const row = rowMatch[0];
  const cells: ParsedHtmlCell[] = [];
  for (const match of row.matchAll(/(<t[dh]\b[^>]*>)([\s\S]*?)(<\/t[dh]>)/gi)) {
    const openTag = match[1] ?? '<td>';
    cells.push({
      value: decodeHtml(match[2] ?? ''),
      columnSpan: spanValue(openTag, 'colspan'),
      rowSpan: spanValue(openTag, 'rowspan'),
    });
  }
  return cells;
});

export const eraporExcelColumnName = (zeroBased: number): string => {
  let value = zeroBased + 1;
  let name = '';
  while (value > 0) {
    const remainder = (value - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    value = Math.floor((value - 1) / 26);
  }
  return name;
};

const escapeXml = (value: string): string => value
  .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&apos;');

const cellXml = (cell: SheetCell, rowNumber: number, numericCells: ReadonlySet<string>): string => {
  const reference = `${eraporExcelColumnName(cell.column)}${rowNumber}`;
  if (numericCells.has(reference) && cell.value !== '' && /^\d+(?:\.\d+)?$/.test(cell.value)) {
    return `<c r="${reference}"><v>${cell.value}</v></c>`;
  }
  return `<c r="${reference}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(cell.value)}</t></is></c>`;
};

const buildWorksheet = (rows: ParsedHtmlCell[][], numericCells: ReadonlySet<string>): string => {
  const occupiedUntil = new Map<number, number>();
  const outputRows: string[] = [];
  const mergedRanges: string[] = [];
  let maxColumn = 1;

  rows.forEach((row, rowIndex) => {
    let column = 0;
    const outputCells: string[] = [];
    for (const cell of row) {
      while (Array.from({ length: cell.columnSpan }, (_unused, index) => column + index)
        .some(index => (occupiedUntil.get(index) ?? -1) >= rowIndex)) column += 1;

      const sheetCell: SheetCell = { ...cell, column };
      outputCells.push(cellXml(sheetCell, rowIndex + 1, numericCells));
      const endColumn = column + cell.columnSpan - 1;
      const endRow = rowIndex + cell.rowSpan - 1;
      maxColumn = Math.max(maxColumn, endColumn + 1);
      if (cell.rowSpan > 1 || cell.columnSpan > 1) {
        mergedRanges.push(`${eraporExcelColumnName(column)}${rowIndex + 1}:${eraporExcelColumnName(endColumn)}${endRow + 1}`);
      }
      for (let spanColumn = column; spanColumn <= endColumn; spanColumn += 1) {
        if (cell.rowSpan > 1) occupiedUntil.set(spanColumn, endRow);
      }
      column = endColumn + 1;
    }
    outputRows.push(`<row r="${rowIndex + 1}">${outputCells.join('')}</row>`);
  });

  const lastRow = Math.max(rows.length, 1);
  const mergeXml = mergedRanges.length > 0
    ? `<mergeCells count="${mergedRanges.length}">${mergedRanges.map(range => `<mergeCell ref="${range}"/>`).join('')}</mergeCells>`
    : '';
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
    `<dimension ref="A1:${eraporExcelColumnName(maxColumn - 1)}${lastRow}"/>` +
    `<sheetViews><sheetView workbookViewId="0"/></sheetViews>` +
    `<sheetFormatPr defaultRowHeight="15"/>` +
    `<sheetData>${outputRows.join('')}</sheetData>${mergeXml}</worksheet>`;
};

const crcTable = (): Uint32Array => {
  const table = new Uint32Array(256);
  for (let value = 0; value < 256; value += 1) {
    let crc = value;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc & 1) ? (0xEDB88320 ^ (crc >>> 1)) : (crc >>> 1);
    table[value] = crc >>> 0;
  }
  return table;
};

const CRC_TABLE = crcTable();

const crc32 = (data: Buffer): number => {
  let crc = 0xFFFFFFFF;
  for (const byte of data) crc = (CRC_TABLE[(crc ^ byte) & 0xFF] ?? 0) ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
};

const createZip = (entries: ZipEntry[]): Buffer => {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const fileName = Buffer.from(entry.name, 'utf8');
    const compressed = deflateRawSync(entry.data);
    const checksum = crc32(entry.data);
    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034B50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0, 6);
    localHeader.writeUInt16LE(8, 8);
    localHeader.writeUInt16LE(0, 10);
    localHeader.writeUInt16LE(33, 12);
    localHeader.writeUInt32LE(checksum, 14);
    localHeader.writeUInt32LE(compressed.length, 18);
    localHeader.writeUInt32LE(entry.data.length, 22);
    localHeader.writeUInt16LE(fileName.length, 26);
    localHeader.writeUInt16LE(0, 28);
    localParts.push(localHeader, fileName, compressed);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014B50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0, 8);
    centralHeader.writeUInt16LE(8, 10);
    centralHeader.writeUInt16LE(0, 12);
    centralHeader.writeUInt16LE(33, 14);
    centralHeader.writeUInt32LE(checksum, 16);
    centralHeader.writeUInt32LE(compressed.length, 20);
    centralHeader.writeUInt32LE(entry.data.length, 24);
    centralHeader.writeUInt16LE(fileName.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);
    centralParts.push(centralHeader, fileName);
    offset += localHeader.length + fileName.length + compressed.length;
  }

  const centralDirectory = Buffer.concat(centralParts);
  const endRecord = Buffer.alloc(22);
  endRecord.writeUInt32LE(0x06054B50, 0);
  endRecord.writeUInt16LE(0, 4);
  endRecord.writeUInt16LE(0, 6);
  endRecord.writeUInt16LE(entries.length, 8);
  endRecord.writeUInt16LE(entries.length, 10);
  endRecord.writeUInt32LE(centralDirectory.length, 12);
  endRecord.writeUInt32LE(offset, 16);
  endRecord.writeUInt16LE(0, 20);
  return Buffer.concat([...localParts, centralDirectory, endRecord]);
};

export const createEraporXlsx = (html: string, numericCells: ReadonlySet<string>, sheetName = 'Nilai'): Buffer => {
  const rows = parseHtmlRows(html);
  if (rows.length === 0) throw new Error('Template e-Rapor tidak memiliki tabel untuk diekspor.');
  const worksheet = buildWorksheet(rows, numericCells);
  const files = [
    {
      name: '[Content_Types].xml',
      data: Buffer.from('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
        '<Default Extension="xml" ContentType="application/xml"/>' +
        '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
        '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
        '</Types>', 'utf8'),
    },
    {
      name: '_rels/.rels',
      data: Buffer.from('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
        '</Relationships>', 'utf8'),
    },
    {
      name: 'xl/workbook.xml',
      data: Buffer.from('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
        `<sheets><sheet name="${escapeXml(sheetName.slice(0, 31))}" sheetId="1" r:id="rId1"/></sheets></workbook>`, 'utf8'),
    },
    {
      name: 'xl/_rels/workbook.xml.rels',
      data: Buffer.from('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
        '</Relationships>', 'utf8'),
    },
    { name: 'xl/worksheets/sheet1.xml', data: Buffer.from(worksheet, 'utf8') },
  ];
  return createZip(files);
};
