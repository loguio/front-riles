import {
  formatDateKey,
  getDaysOfWeek,
  getMonthTitle,
  getNextMonth,
  getPrevMonth,
  getWeekNumber,
} from "./dateUtils";

describe("dateUtils", () => {
  it("formats a date key with zero padding", () => {
    expect(formatDateKey(2026, 9, 5)).toBe("2026-10-05");
    expect(formatDateKey(2026, 11, 25)).toBe("2026-12-25");
  });

  it("computes ISO week numbers", () => {
    // 2026-01-01 is a Thursday, which belongs to ISO week 1.
    expect(getWeekNumber(new Date(2026, 0, 1))).toBe(1);
    // 2025-12-29 (Monday) is also ISO week 1 of 2026.
    expect(getWeekNumber(new Date(2025, 11, 29))).toBe(1);
  });

  it("builds a Monday-first week of seven days", () => {
    const days = getDaysOfWeek(2026, 42);
    expect(days).toHaveLength(7);
    expect(days[0].dayName).toBe("Lun");
    expect(days[6].dayName).toBe("Dim");
  });

  it("titles months in French", () => {
    expect(getMonthTitle(9, 2026)).toBe("Octobre 2026");
  });

  it("cycles months across year boundaries", () => {
    expect(getPrevMonth(0, 2026)).toEqual({ month: 11, year: 2025 });
    expect(getNextMonth(11, 2026)).toEqual({ month: 0, year: 2027 });
  });
});
