import { describe, expect, it } from 'vitest';
import { renderTablePdf, type PdfColumn } from '../../app/services/Pdf';

const columns: PdfColumn[] = [
  { label: 'No', width: 5, align: 'center' },
  { label: 'Nama', width: 45 },
  { label: 'Nilai', width: 10, align: 'right' },
];

const build = (rows: (string | number | null)[][], extra: Record<string, unknown> = {}): Buffer =>
  renderTablePdf({ title: 'DOKUMEN UJI', columns, rows, ...extra });

const pageCount = (pdf: Buffer): number =>
  (pdf.toString('latin1').match(/\/Type \/Page[^s]/g) ?? []).length;

const objectAt = (pdf: Buffer, offset: number): string => pdf.toString('latin1').slice(offset, offset + 12);
describe('Pdf writer', () => {
  it('produces a PDF document with a header and trailer', () => {
    const pdf = build([[1, 'Budi Santoso', 88]]);
    const text = pdf.toString('latin1');
    expect(text.startsWith('%PDF-1.4')).toBe(true);
    expect(text.trimEnd().endsWith('%%EOF')).toBe(true);
    expect(text).toContain('/BaseFont /Helvetica');
    expect(text).toContain('/BaseFont /Helvetica-Bold');
  });

  it('keeps every cross-reference offset pointing at its object', () => {
    const pdf = build(Array.from({ length: 40 }, (_, index) => [index + 1, `Siswa ${index}`, 70 + index]));
    const text = pdf.toString('latin1');
    const size = Number(text.match(/\/Size (\d+)/)?.[1]);
    const xrefPosition = Number(text.match(/startxref\n(\d+)/)?.[1]);
    expect(text.slice(xrefPosition, xrefPosition + 4)).toBe('xref');
    const entries = text.slice(xrefPosition).split('\n').slice(2);
    for (let id = 1; id < size; id += 1) {
      expect(objectAt(pdf, Number(entries[id].slice(0, 10))).startsWith(`${id} 0 obj`)).toBe(true);
    }
  });

  it('splits long tables across pages and repeats the column header', () => {
    const single = build([[1, 'Budi', 80]]);
    const many = build(Array.from({ length: 120 }, (_, index) => [index + 1, `Siswa contoh ${index}`, 60]));
    expect(pageCount(single)).toBe(1);
    expect(pageCount(many)).toBeGreaterThan(2);
    expect(many.toString('latin1')).toContain('/Count');
    expect(many.toString('latin1')).toContain('Halaman 1 dari');
  });

  it('escapes parentheses and backslashes in cell text', () => {
    const text = build([[1, 'Anggraini (Kelas A) \\ jalur', 90]]).toString('latin1');
    expect(text).toContain('Anggraini \\(Kelas A\\) \\\\ jalur');
  });

  it('writes WinAnsi octal escapes for accented and typographic characters', () => {
    const text = build([[1, 'Sri Wahyuni — susulan', 70], [2, 'Élia Nur', 65]]).toString('latin1');
    expect(text).toContain('\\227'); // em dash
    expect(text).toContain('\\311'); // É
  });

  it('replaces characters WinAnsi cannot represent', () => {
    const text = build([[1, 'Nilai sempurna 🎯', 100]]).toString('latin1');
    expect(text).toContain('Nilai sempurna ?');
    expect(text).not.toContain('🎯');
  });

  it('shows a dash for empty cells so columns stay readable', () => {
    const text = build([[1, null, undefined]]).toString('latin1');
    expect(text).toContain('\\227');
  });

  it('swaps the page box when the report is landscape', () => {
    const portrait = build([[1, 'Budi', 80]]).toString('latin1');
    const landscape = build([[1, 'Budi', 80]], { landscape: true }).toString('latin1');
    expect(portrait).toContain('/MediaBox [0 0 595.28 841.89]');
    expect(landscape).toContain('/MediaBox [0 0 841.89 595.28]');
  });

  it('prints the school header, footnotes and the actor in the footer', () => {
    const text = build([[1, 'Budi', 80]], {
      subtitle: 'SMA Negeri 15 Surabaya',
      meta: ['Kelas: 10A'],
      footnotes: ['Sumber data: jurnal mengajar guru.'],
      printedBy: 'kepala (headmaster)',
    }).toString('latin1');
    expect(text).toContain('SMA Negeri 15 Surabaya');
    expect(text).toContain('Kelas: 10A');
    expect(text).toContain('Sumber data: jurnal mengajar guru.');
    expect(text).toContain('Dicetak: kepala \\(headmaster\\)');
  });

  it('renders an empty table instead of failing when there is no data', () => {
    const pdf = build([], { footnotes: ['Belum ada data.'] });
    expect(pageCount(pdf)).toBe(1);
    expect(pdf.toString('latin1')).toContain('Belum ada data.');
  });
});
