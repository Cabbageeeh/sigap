import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@services/SQLite', () => ({
  default: {
    one: vi.fn(),
    many: vi.fn(),
    all: vi.fn(),
    get: vi.fn(),
    exec: vi.fn(),
    run: vi.fn(),
    update: vi.fn(),
    transaction: vi.fn((callback: () => void) => callback()),
  },
}));

import SQLite from '@services/SQLite';
import { getAttendanceRecap } from '../../app/queries/studentAttendance';

const sqlOf = (call: unknown[]): string => String(call[0]);

describe('getAttendanceRecap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(SQLite.all).mockReturnValue([]);
  });

  it('counts the total from the same rows the status columns use', () => {
    getAttendanceRecap('class-1', 1000, 2000);
    const sql = sqlOf(vi.mocked(SQLite.all).mock.calls[0]);
    const total = sql.match(/AS total/)?.index ?? -1;
    const absent = sql.match(/AS absent/)?.index ?? -1;

    expect(total).toBeGreaterThan(-1);
    expect(sql.slice(total - 160, total)).toContain('j.id IS NOT NULL');
    expect(sql.slice(total - 160, total)).toContain('sch.id IS NOT NULL');
    expect(sql.slice(absent - 160, absent)).toContain("sa.status = 'absent'");
    expect(sql).not.toContain('COUNT(j.id)');
  });

  it('scopes every column to the viewing teacher when one is given', () => {
    getAttendanceRecap('class-1', 1000, 2000, 'teacher-1');

    expect(SQLite.all).toHaveBeenCalledWith(
      expect.stringContaining('AND sch.teacher_user_id = ?'),
      [1000, 2000, 'teacher-1', 'class-1'],
    );
  });

  it('keeps the whole class in view for the office', () => {
    getAttendanceRecap('class-1', 1000, 2000);

    expect(SQLite.all).toHaveBeenCalledWith(
      expect.not.stringContaining('sch.teacher_user_id'),
      [1000, 2000, 'class-1'],
    );
  });
});
