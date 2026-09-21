import { describe, it, expect } from 'vitest';
import { parseStudentCsv } from '../../app/services/StudentCsvParser';

const freshSets = () => ({ classNames: new Set(['10A', '10B']), existingNis: new Map([['10001', 'Ani — kelas 10A']]) });

const row = (overrides: Record<string, unknown> = {}) => ({
  line: 2,
  nis: '10011',
  name: 'Andi Saputra',
  class_name: '10A',
  phone: '0812',
  address: 'Jl. Melati',
  parent_name: null,
  parent_phone: null,
  parent_address: null,
  ...overrides,
});

describe('parseStudentCsv', () => {
  it('parses valid rows and skips a header line', () => {
    const { classNames, existingNis } = freshSets();
    const csv = 'nis,name,class,phone,address\n10011,Andi Saputra,10A,0812,Jl. Melati\n10012,Budi Hartono,10B,,';
    const result = parseStudentCsv(csv, classNames, existingNis);

    expect(result.errors).toEqual([]);
    expect(result.rows).toEqual([
      row(),
      row({ line: 3, nis: '10012', name: 'Budi Hartono', class_name: '10B', phone: null, address: null }),
    ]);
  });

  it('maps the Indonesian template columns including parent data', () => {
    const { classNames, existingNis } = freshSets();
    const csv = [
      'NIS,Nama Siswa,Kelas,Telepon Siswa,Alamat Siswa,Nama Orang Tua,Telepon Orang Tua,Alamat Orang Tua',
      '10011,Andi Saputra,10A,0812,Jl. Melati,Siti Saputra,0813,Jl. Melati',
    ].join('\n');
    const result = parseStudentCsv(csv, classNames, existingNis);

    expect(result.errors).toEqual([]);
    expect(result.rows).toEqual([row({ parent_name: 'Siti Saputra', parent_phone: '0813', parent_address: 'Jl. Melati' })]);
  });

  it('follows header order instead of column position', () => {
    const { classNames, existingNis } = freshSets();
    const csv = 'Nama Orang Tua,Kelas,Nama Siswa,NIS\nSiti Saputra,10B,Budi Hartono,10012';
    const result = parseStudentCsv(csv, classNames, existingNis);

    expect(result.errors).toEqual([]);
    expect(result.rows).toEqual([row({
      line: 2, nis: '10012', name: 'Budi Hartono', class_name: '10B', phone: null, address: null, parent_name: 'Siti Saputra',
    })]);
  });

  it('keeps quoted cells that contain the delimiter', () => {
    const { classNames, existingNis } = freshSets();
    const csv = 'nis,name,class,phone,address\n10011,Andi Saputra,10A,0812,"Jl. Mawar No. 5, RT 01/RW 02"';
    const result = parseStudentCsv(csv, classNames, existingNis);

    expect(result.errors).toEqual([]);
    expect(result.rows[0].address).toBe('Jl. Mawar No. 5, RT 01/RW 02');
  });

  it('accepts a semicolon separated file', () => {
    const { classNames, existingNis } = freshSets();
    const csv = 'nis;name;class;phone;address\n10011;Andi Saputra;10A;0812;Jl. Melati';
    const result = parseStudentCsv(csv, classNames, existingNis);

    expect(result.errors).toEqual([]);
    expect(result.rows).toEqual([row()]);
  });

  it('strips a UTF-8 byte order mark from the header', () => {
    const { classNames, existingNis } = freshSets();
    const bom = String.fromCharCode(0xFEFF);
    const csv = `${bom}NIS,Nama Siswa,Kelas,Nama Orang Tua\n10011,Andi Saputra,10A,Siti Saputra`;
    const result = parseStudentCsv(csv, classNames, existingNis);

    expect(result.errors).toEqual([]);
    expect(result.rows[0]).toMatchObject({ nis: '10011', parent_name: 'Siti Saputra' });
  });

  it('uses the selected class for four-column scoped imports', () => {
    const { classNames, existingNis } = freshSets();
    const csv = 'nis,name,phone,address\n10011,Andi Saputra,0812,Jl. Melati';
    const result = parseStudentCsv(csv, classNames, existingNis, '10A');

    expect(result.errors).toEqual([]);
    expect(result.rows).toEqual([row({ line: 2 })]);
  });

  it('rejects a header without NIS or name column', () => {
    const { classNames, existingNis } = freshSets();
    const result = parseStudentCsv('Kelas,Nama Orang Tua\n10A,Siti', classNames, existingNis);

    expect(result.rows).toEqual([]);
    expect(result.errors).toEqual([{ line: 1, message: 'Baris header CSV harus memuat kolom NIS dan Nama Siswa' }]);
  });

  it('rejects duplicate NIS within the file', () => {
    const { classNames, existingNis } = freshSets();
    const csv = '10011,A,10A,\n10011,B,10B,';
    const result = parseStudentCsv(csv, classNames, existingNis);

    expect(result.rows).toHaveLength(1);
    expect(result.errors).toEqual([{ line: 2, message: 'NIS 10011 sudah dipakai A — kelas 10A' }]);
  });

  it('rejects NIS that already exists in the database', () => {
    const { classNames, existingNis } = freshSets();
    const result = parseStudentCsv('10001,Dup,10A,', classNames, existingNis);
    expect(result.errors).toEqual([{ line: 1, message: 'NIS 10001 sudah dipakai Ani — kelas 10A' }]);
    expect(result.rows).toEqual([]);
  });

  it('rejects empty NIS and empty name', () => {
    const { classNames, existingNis } = freshSets();
    const result = parseStudentCsv(',Tanpa Nis,10A,\n10013,,10A,', classNames, existingNis);
    expect(result.errors).toEqual([
      { line: 1, message: 'NIS kosong' },
      { line: 2, message: 'Nama kosong' },
    ]);
  });

  it('rejects unknown class names', () => {
    const { classNames, existingNis } = freshSets();
    const result = parseStudentCsv('10013,Ani,11Z,', classNames, existingNis);
    expect(result.errors).toEqual([{ line: 1, message: 'Kelas "11Z" tidak ditemukan' }]);
  });

  it('rejects a one character parent name', () => {
    const { classNames, existingNis } = freshSets();
    const result = parseStudentCsv('10013,Ani,10A,,,B,', classNames, existingNis);
    expect(result.errors).toEqual([{ line: 1, message: 'Nama orang tua minimal 2 karakter' }]);
  });

  it('ignores blank lines', () => {
    const { classNames, existingNis } = freshSets();
    const result = parseStudentCsv('10013,Ani,10A,\n\n10014,Budi,10B,', classNames, existingNis);
    expect(result.errors).toEqual([]);
    expect(result.rows).toHaveLength(2);
  });
});
