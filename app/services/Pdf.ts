// Minimal PDF writer for tabular school reports: A4, base-14 Helvetica with
// WinAnsi text, no external dependency. Coordinates are PostScript points
// measured from the bottom-left of the page.
export interface PdfColumn {
  label: string;
  width: number;
  align?: 'left' | 'center' | 'right';
}

export type PdfCell = string | number | null | undefined;

export interface PdfReport {
  title: string;
  subtitle?: string;
  meta?: string[];
  landscape?: boolean;
  columns: PdfColumn[];
  rows: PdfCell[][];
  footnotes?: string[];
  printedBy?: string;
}

const A4 = { width: 595.28, height: 841.89 };
const MARGIN = 36;
const CELL_PAD = 3.5;
const TITLE_SIZE = 15;
const SUBTITLE_SIZE = 10;
const META_SIZE = 9;
const BODY_SIZE = 9;
const LINE_GAP = 11;
const ROW_PAD = 4;
const MAX_CELL_LINES = 6;
const FOOTER_SPACE = 20;
const FOOTER_Y = 24;
const HEADER_FILL = '0.92 0.92 0.94';
const EMPTY_CELL = '—';

const HELVETICA: number[] = [
  278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278,
  556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556,
  1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778,
  667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556,
  333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556,
  556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584,
];

const HELVETICA_BOLD: number[] = [
  278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278,
  556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 333, 333, 584, 584, 584, 611,
  975, 722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833, 722, 778,
  667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 333, 278, 333, 584, 556,
  333, 556, 611, 556, 611, 556, 333, 611, 611, 278, 278, 556, 278, 889, 611, 611,
  611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500, 389, 280, 389, 584,
];

// Only the typographic marks a report can legitimately contain; anything else
// outside Latin-1 becomes "?" so the byte stream stays valid.
const WINANSI_EXTRAS = new Map<string, number>([
  ['…', 0x85], ['‘', 0x91], ['’', 0x92], ['“', 0x93], ['”', 0x94],
  ['•', 0x95], ['–', 0x96], ['—', 0x97], ['™', 0x99],
]);

const toByte = (char: string): number => {
  const mapped = WINANSI_EXTRAS.get(char);
  if (mapped !== undefined) return mapped;
  const code = char.codePointAt(0) ?? 63;
  return code >= 0x20 && code <= 0xff ? code : 63;
};

const escapeText = (value: string): string => [...value].map(char => {
  const byte = toByte(char);
  if (byte === 0x28 || byte === 0x29 || byte === 0x5c) return `\\${String.fromCharCode(byte)}`;
  return byte < 0x80 ? String.fromCharCode(byte) : `\\${byte.toString(8).padStart(3, '0')}`;
}).join('');

const textWidth = (value: string, size: number, bold = false): number => {
  const table = bold ? HELVETICA_BOLD : HELVETICA;
  let units = 0;
  for (const char of value) {
    const byte = toByte(char);
    units += byte >= 0x20 && byte <= 0x7e ? table[byte - 0x20] : 556;
  }
  return (units / 1000) * size;
};

const cellText = (value: PdfCell): string => {
  if (value === null || value === undefined || value === '') return EMPTY_CELL;
  return String(value);
};

// Greedy word wrap; a single word wider than the column is broken by character.
const wrapText = (value: string, maxWidth: number, size: number, bold = false): string[] => {
  const lines: string[] = [];
  let current = '';

  for (const word of value.split(/\s+/).filter(Boolean)) {
    const candidate = current ? `${current} ${word}` : word;
    if (textWidth(candidate, size, bold) <= maxWidth) {
      current = candidate;
      continue;
    }
    if (current) lines.push(current);
    current = '';
    let chunk = word;
    while (textWidth(chunk, size, bold) > maxWidth && chunk.length > 1) {
      let cut = chunk.length;
      while (cut > 1 && textWidth(chunk.slice(0, cut), size, bold) > maxWidth) cut -= 1;
      lines.push(chunk.slice(0, cut));
      chunk = chunk.slice(cut);
    }
    current = chunk;
  }
  if (current) lines.push(current);
  return lines.length > 0 ? lines : [''];
};

const fitCell = (value: string, maxWidth: number, size: number, bold: boolean): string[] => {
  const lines = wrapText(value, maxWidth, size, bold);
  if (lines.length <= MAX_CELL_LINES) return lines;
  const kept = lines.slice(0, MAX_CELL_LINES);
  kept[MAX_CELL_LINES - 1] = `${kept[MAX_CELL_LINES - 1]}...`;
  return kept;
};

const tallest = (linesByCell: string[][]): number =>
  linesByCell.reduce((max, lines) => Math.max(max, lines.length), 1);

const round = (value: number): string => String(Math.round(value * 100) / 100);

const textOp = (x: number, y: number, size: number, bold: boolean, value: string): string =>
  // The header band sets a grey fill; every text run has to claim black back.
  `0 0 0 rg BT /${bold ? 'F2' : 'F1'} ${size} Tf 1 0 0 1 ${round(x)} ${round(y)} Tm (${escapeText(value)}) Tj ET`;

const lineOp = (x1: number, y1: number, x2: number, y2: number, width: number): string =>
  `${round(width)} w 0 0 0 RG ${round(x1)} ${round(y1)} m ${round(x2)} ${round(y2)} l S`;

const fillOp = (x: number, y: number, width: number, height: number): string =>
  `${HEADER_FILL} rg ${round(x)} ${round(y)} ${round(width)} ${round(height)} re f`;

interface Page {
  ops: string[];
  cursor: number;
  tableTop: number;
  tableBottom: number;
}

interface Layout {
  pageWidth: number;
  pageHeight: number;
  contentWidth: number;
  columns: PdfColumn[];
  columnX: number[];
  columnWidth: number[];
  innerWidth: number[];
}

const buildLayout = (report: PdfReport): Layout => {
  const pageWidth = report.landscape ? A4.height : A4.width;
  const pageHeight = report.landscape ? A4.width : A4.height;
  const contentWidth = pageWidth - MARGIN * 2;
  const totalWeight = report.columns.reduce((sum, column) => sum + column.width, 0) || 1;
  const columnWidth = report.columns.map(column => (column.width / totalWeight) * contentWidth);
  const columnX: number[] = [];
  let x = MARGIN;
  for (const width of columnWidth) {
    columnX.push(x);
    x += width;
  }
  return {
    pageWidth,
    pageHeight,
    contentWidth,
    columns: report.columns,
    columnX,
    columnWidth,
    innerWidth: columnWidth.map(width => width - CELL_PAD * 2),
  };
};

const alignedX = (value: string, layout: Layout, index: number, size: number, bold: boolean): number => {
  const width = textWidth(value, size, bold);
  const align = layout.columns[index].align ?? 'left';
  if (align === 'right') return layout.columnX[index] + layout.columnWidth[index] - CELL_PAD - width;
  if (align === 'center') return layout.columnX[index] + (layout.columnWidth[index] - width) / 2;
  return layout.columnX[index] + CELL_PAD;
};

// Exactly PdfColumn entries per row, so a short row pads out and never offsets
// the following columns.
const splitRow = (layout: Layout, cells: PdfCell[]): string[][] =>
  layout.columns.map((column, index) =>
    fitCell(cellText(cells[index]), layout.innerWidth[index], BODY_SIZE, false));

const rowHeight = (lines: string[][]): number => tallest(lines) * LINE_GAP + ROW_PAD * 2;

const headerLines = (layout: Layout): string[][] =>
  layout.columns.map((column, index) =>
    wrapText(column.label, layout.innerWidth[index], BODY_SIZE, true));

interface Frame {
  layout: Layout;
  headerBlock: number;
  bodyLimit: number;
}

const beginPage = (report: PdfReport, frame: Frame, first: boolean): Page => {
  const { layout, headerBlock } = frame;
  const page: Page = { ops: [], cursor: MARGIN, tableTop: MARGIN, tableBottom: MARGIN };

  if (first) {
    page.cursor = MARGIN + TITLE_SIZE;
    page.ops.push(textOp(MARGIN, layout.pageHeight - page.cursor, TITLE_SIZE, true, report.title));
    if (report.subtitle) {
      page.cursor += SUBTITLE_SIZE + 6;
      page.ops.push(textOp(MARGIN, layout.pageHeight - page.cursor, SUBTITLE_SIZE, false, report.subtitle));
    }
    for (const line of report.meta ?? []) {
      page.cursor += META_SIZE + 4;
      page.ops.push(textOp(MARGIN, layout.pageHeight - page.cursor, META_SIZE, false, line));
    }
    page.cursor += 10;
  }

  const top = layout.pageHeight - page.cursor;
  page.ops.push(fillOp(MARGIN, top - headerBlock, layout.contentWidth, headerBlock));
  headerLines(layout).forEach((lines, index) => {
    lines.forEach((line, lineIndex) => {
      const y = top - ROW_PAD - BODY_SIZE * 0.8 - lineIndex * LINE_GAP;
      page.ops.push(textOp(alignedX(line, layout, index, BODY_SIZE, true), y, BODY_SIZE, true, line));
    });
  });
  page.ops.push(lineOp(MARGIN, top - headerBlock, MARGIN + layout.contentWidth, top - headerBlock, 0.6));

  page.cursor += headerBlock;
  page.tableTop = page.cursor;
  page.tableBottom = page.cursor;
  return page;
};

const drawRow = (page: Page, frame: Frame, lines: string[][]): void => {
  const { layout } = frame;
  const height = rowHeight(lines);
  const top = page.cursor;
  const baseline = layout.pageHeight - top - ROW_PAD - BODY_SIZE * 0.8;

  lines.forEach((cellLines, index) => {
    cellLines.forEach((line, lineIndex) => {
      const x = alignedX(line, layout, index, BODY_SIZE, false);
      page.ops.push(textOp(x, baseline - lineIndex * LINE_GAP, BODY_SIZE, false, line));
    });
  });
  page.ops.push(lineOp(MARGIN, layout.pageHeight - top - height,
    MARGIN + layout.contentWidth, layout.pageHeight - top - height, 0.3));

  page.cursor = top + height;
  page.tableBottom = page.cursor;
};

const drawFootnotes = (report: PdfReport, frame: Frame, pages: Page[]): void => {
  let page = pages[pages.length - 1];
  for (const note of report.footnotes ?? []) {
    const lines = wrapText(note, frame.layout.contentWidth, META_SIZE, false).slice(0, 4);
    const height = lines.length * (META_SIZE + 3) + 6;
    if (page.cursor + height > frame.bodyLimit) {
      page = beginPage(report, frame, false);
      pages.push(page);
    }
    page.cursor += 8;
    lines.forEach((line, index) => {
      page.ops.push(textOp(MARGIN, frame.layout.pageHeight - page.cursor - index * (META_SIZE + 3),
        META_SIZE, false, line));
    });
    page.cursor += height;
  }
};

const assemblePdf = (pages: Page[], pageWidth: number, pageHeight: number): Buffer => {
  const chunks: Buffer[] = [];
  const offsets: number[] = [0];
  let position = 0;

  const push = (value: string): void => {
    const chunk = Buffer.from(value, 'latin1');
    chunks.push(chunk);
    position += chunk.length;
  };
  const openObject = (id: number): void => {
    offsets[id] = position;
    push(`${id} 0 obj\n`);
  };

  push('%PDF-1.4\n');
  const firstPageId = 5;
  const kids = pages.map((_, index) => `${firstPageId + index * 2} 0 R`).join(' ');

  openObject(1);
  push('<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
  openObject(2);
  push(`<< /Type /Pages /Kids [${kids}] /Count ${pages.length} >>\nendobj\n`);
  openObject(3);
  push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n');
  openObject(4);
  push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\nendobj\n');

  pages.forEach((_, index) => {
    const pageId = firstPageId + index * 2;
    const contentId = pageId + 1;
    const stream = pages[index].ops.join('\n');
    openObject(pageId);
    push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${round(pageWidth)} ${round(pageHeight)}] `
      + `/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentId} 0 R >>\nendobj\n`);
    openObject(contentId);
    push(`<< /Length ${Buffer.byteLength(stream, 'latin1')} >>\nstream\n${stream}\nendstream\nendobj\n`);
  });

  const size = offsets.length;
  const xrefPosition = position;
  push(`xref\n0 ${size}\n0000000000 65535 f \n`);
  for (let id = 1; id < size; id += 1) {
    push(`${String(offsets[id] ?? 0).padStart(10, '0')} 00000 n \n`);
  }
  push(`trailer\n<< /Size ${size} /Root 1 0 R >>\nstartxref\n${xrefPosition}\n%%EOF\n`);

  return Buffer.concat(chunks);
};

const drawChrome = (report: PdfReport, frame: Frame, pages: Page[]): void => {
  const { layout } = frame;
  pages.forEach((page, index) => {
    for (let column = 1; column < layout.columnX.length; column += 1) {
      page.ops.push(lineOp(layout.columnX[column], layout.pageHeight - page.tableTop,
        layout.columnX[column], layout.pageHeight - page.tableBottom, 0.25));
    }
    page.ops.push(lineOp(MARGIN, layout.pageHeight - page.tableTop, MARGIN, layout.pageHeight - page.tableBottom, 0.5));
    page.ops.push(lineOp(MARGIN + layout.contentWidth, layout.pageHeight - page.tableTop,
      MARGIN + layout.contentWidth, layout.pageHeight - page.tableBottom, 0.5));

    const right = `Halaman ${index + 1} dari ${pages.length}`;
    if (report.printedBy) {
      page.ops.push(textOp(MARGIN, FOOTER_Y, META_SIZE - 1, false, `Dicetak: ${report.printedBy}`));
    }
    page.ops.push(textOp(layout.pageWidth - MARGIN - textWidth(right, META_SIZE - 1, false),
      FOOTER_Y, META_SIZE - 1, false, right));
  });
};

export const renderTablePdf = (report: PdfReport): Buffer => {
  const layout = buildLayout(report);
  const frame: Frame = {
    layout,
    headerBlock: rowHeight(headerLines(layout)),
    bodyLimit: layout.pageHeight - MARGIN - FOOTER_SPACE,
  };

  const pages: Page[] = [beginPage(report, frame, true)];
  let page = pages[0];

  for (const cells of report.rows) {
    const lines = splitRow(layout, cells);
    if (page.cursor + rowHeight(lines) > frame.bodyLimit) {
      page = beginPage(report, frame, false);
      pages.push(page);
    }
    drawRow(page, frame, lines);
  }

  drawFootnotes(report, frame, pages);
  drawChrome(report, frame, pages);

  return assemblePdf(pages, layout.pageWidth, layout.pageHeight);
};
