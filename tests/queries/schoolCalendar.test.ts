import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@services/SQLite', () => ({
  default: { all: vi.fn(), many: vi.fn(), one: vi.fn(), get: vi.fn() },
}));
vi.mock('../../app/queries/appSettings', () => ({
  findSetting: vi.fn(),
  upsertSetting: vi.fn(),
}));

import SQLite from '@services/SQLite';
import { findNonTeachingDays, isTeachingDay } from '../../app/queries/schoolCalendar';
import { findSetting } from '../../app/queries/appSettings';

const DAY_MS = 24 * 60 * 60 * 1000;
const wednesday = new Date(2026, 8, 2, 12, 0, 0).getTime();
const startOf = (timestamp: number): number => {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
};
const wednesdayStart = startOf(wednesday);
const saturdayStart = wednesdayStart + 3 * DAY_MS;
const sundayStart = wednesdayStart + 4 * DAY_MS;

const holidays = (dates: number[]) => {
  vi.mocked(SQLite.many).mockReturnValue(dates.map((date, index) => ({ id: `h-${index}`, date, name: `Libur ${index}` })));
};

describe('school calendar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(findSetting).mockReturnValue('1');
    holidays([]);
  });

  it('blocks Sunday always, and Saturday only when the school does not work it', () => {
    const week = findNonTeachingDays(wednesdayStart, sundayStart + DAY_MS - 1);
    expect(week.has(sundayStart)).toBe(true);
    expect(week.has(saturdayStart)).toBe(false);

    vi.mocked(findSetting).mockReturnValue('0');
    const shortWeek = findNonTeachingDays(wednesdayStart, sundayStart + DAY_MS - 1);
    expect(shortWeek.has(saturdayStart)).toBe(true);
  });

  it('blocks stored holiday dates inside the window only', () => {
    const thursdayStart = wednesdayStart + DAY_MS;
    holidays([thursdayStart]);

    const week = findNonTeachingDays(wednesdayStart, sundayStart + DAY_MS - 1);
    expect(week.has(thursdayStart)).toBe(true);
    expect(week.has(wednesdayStart)).toBe(false);

    const beforeHoliday = findNonTeachingDays(wednesdayStart, wednesdayStart + DAY_MS - 1);
    expect(beforeHoliday.has(thursdayStart)).toBe(false);
  });

  it('reports a plain weekday as a teaching day', () => {
    expect(isTeachingDay(wednesday)).toBe(true);
  });
});
