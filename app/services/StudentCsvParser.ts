/**
 * Pure CSV parsing for student imports. No dependencies, no DB access —
 * validated against class names and existing NIS supplied by the caller.
 */

export interface CsvStudentRow {
  line: number;
  nis: string;
  name: string;
  class_name: string;
  phone: string | null;
  address: string | null;
  parent_name: string | null;
  parent_phone: string | null;
  parent_address: string | null;
}

export interface CsvImportResult {
  rows: CsvStudentRow[];
  errors: { line: number; message: string }[];
}

type CsvColumn =
  | 'nis'
  | 'name'
  | 'class_name'
  | 'phone'
  | 'address'
  | 'parent_name'
  | 'parent_phone'
  | 'parent_address';

const HEADER_ALIASES: Record<string, CsvColumn> = {
  nis: 'nis',
  name: 'name',
  nama: 'name',
  'nama siswa': 'name',
  class: 'class_name',
  kelas: 'class_name',
  phone: 'phone',
  telepon: 'phone',
  'telepon siswa': 'phone',
  hp: 'phone',
  address: 'address',
  alamat: 'address',
  'alamat siswa': 'address',
  parent_name: 'parent_name',
  'nama orang tua': 'parent_name',
  'nama ortu': 'parent_name',
  parent_phone: 'parent_phone',
  'telepon orang tua': 'parent_phone',
  'telepon ortu': 'parent_phone',
  'hp orang tua': 'parent_phone',
  'hp ortu': 'parent_phone',
  parent_address: 'parent_address',
  'alamat orang tua': 'parent_address',
  'alamat ortu': 'parent_address',
};

const normalizeHeader = (cell: string): string =>
  cell.trim().toLowerCase().replace(/\s+/g, ' ');

const splitCells = (line: string, delimiter: string): string[] => {
  const cells: string[] = [];
  let current = '';
  let quoted = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (quoted && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        quoted = !quoted;
      }
    } else if (char === delimiter && !quoted) {
      cells.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  cells.push(current);

  return cells.map(cell => cell.trim());
};

const positionalColumns = (forcedClassName?: string): Record<CsvColumn, number> => ({
  nis: 0,
  name: 1,
  class_name: forcedClassName ? -1 : 2,
  phone: forcedClassName ? 2 : 3,
  address: forcedClassName ? 3 : 4,
  parent_name: forcedClassName ? 4 : 5,
  parent_phone: forcedClassName ? 5 : 6,
  parent_address: forcedClassName ? 6 : 7,
});

export const parseStudentCsv = (csv: string, classNames: Set<string>, existingNis: Map<string, string>, forcedClassName?: string): CsvImportResult => {
  const result: CsvImportResult = { rows: [], errors: [] };
  const lines = csv.replace(/^\uFEFF/, '').split(/\r?\n/).filter(line => line.trim() !== '');
  if (lines.length === 0) return result;

  const delimiter = lines[0].includes(';') && !lines[0].includes(',') ? ';' : ',';
  const columns = positionalColumns(forcedClassName);
  const mapped = new Set<CsvColumn>();
  splitCells(lines[0], delimiter).forEach((cell, index) => {
    const column = HEADER_ALIASES[normalizeHeader(cell)];
    if (column && !mapped.has(column)) {
      columns[column] = index;
      mapped.add(column);
    }
  });

  const hasHeader = mapped.size > 0;
  if (hasHeader) {
    // With a header, columns it does not mention are absent — positional guesses would read the wrong cell.
    (Object.keys(columns) as CsvColumn[]).forEach(column => {
      if (!mapped.has(column)) columns[column] = -1;
    });
    if (!mapped.has('nis') || !mapped.has('name')) {
      return { rows: [], errors: [{ line: 1, message: 'Baris header CSV harus memuat kolom NIS dan Nama Siswa' }] };
    }
  }

  for (let index = hasHeader ? 1 : 0; index < lines.length; index++) {
    const lineNumber = index + 1;
    const cells = splitCells(lines[index], delimiter);
    const cellOf = (column: CsvColumn): string => cells[columns[column]] ?? '';

    const nis = cellOf('nis');
    const name = cellOf('name');
    const className = forcedClassName ?? cellOf('class_name');
    const phone = cellOf('phone') || null;
    const address = cellOf('address') || null;
    const parentName = cellOf('parent_name');
    const parentPhone = cellOf('parent_phone') || null;
    const parentAddress = cellOf('parent_address') || null;

    if (!nis) {
      result.errors.push({ line: lineNumber, message: 'NIS kosong' });
      continue;
    }
    const owner = existingNis.get(nis);
    if (owner) {
      result.errors.push({ line: lineNumber, message: `NIS ${nis} sudah dipakai ${owner}` });
      continue;
    }
    if (!name) {
      result.errors.push({ line: lineNumber, message: 'Nama kosong' });
      continue;
    }
    if (!classNames.has(className)) {
      result.errors.push({ line: lineNumber, message: `Kelas "${className}" tidak ditemukan` });
      continue;
    }
    if (parentName.length === 1) {
      result.errors.push({ line: lineNumber, message: 'Nama orang tua minimal 2 karakter' });
      continue;
    }

    result.rows.push({
      line: lineNumber,
      nis,
      name,
      class_name: className,
      phone,
      address,
      parent_name: parentName || null,
      parent_phone: parentPhone,
      parent_address: parentAddress,
    });
    existingNis.set(nis, `${name} — kelas ${className}`);
  }

  return result;
};
