import { describe, it, expect, vi, beforeEach } from 'vitest';

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
import { getConfirmationLogsPaginated, countTeachersConfirmedOn } from '../../app/queries/teacherConfirmations';

describe('teacher confirmation log queries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(SQLite.get).mockReturnValue({ count: 0 });
    vi.mocked(SQLite.all).mockReturnValue([]);
  });

  it('lists logs newest first without filters', () => {
    getConfirmationLogsPaginated({ page: 1, limit: 20 });

    expect(SQLite.all).toHaveBeenCalledWith(
      expect.stringContaining('ORDER BY tc.confirmed_at DESC'),
      [20, 0]
    );
    expect(SQLite.all).toHaveBeenCalledWith(
      expect.not.stringContaining('WHERE'),
      expect.any(Array)
    );
  });

  it('applies teacher and date range filters to data and count', () => {
    getConfirmationLogsPaginated({ page: 2, limit: 20, startMs: 1000, endMs: 2000, teacherUserId: 'teacher-1' });

    expect(SQLite.get).toHaveBeenCalledWith(
      expect.stringContaining('tc.teacher_user_id = ?'),
      ['teacher-1', 1000, 2000]
    );
    expect(SQLite.all).toHaveBeenCalledWith(
      expect.stringContaining('tc.confirmed_at >= ?'),
      ['teacher-1', 1000, 2000, 20, 20]
    );
  });

  it('counts distinct teachers confirmed within a day', () => {
    vi.mocked(SQLite.get).mockReturnValue({ count: 5 });
    const dayStart = new Date('2026-09-01T00:00:00').getTime();

    expect(countTeachersConfirmedOn(dayStart)).toBe(5);
    expect(SQLite.get).toHaveBeenCalledWith(
      expect.stringContaining('COUNT(DISTINCT teacher_user_id)'),
      [dayStart, dayStart + 86400000]
    );
  });
});
