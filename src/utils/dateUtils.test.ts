import { describe, expect, it } from "vitest";
import {
  formatDateKey,
  getDaysOfWeek,
  getFullDateLabel,
  getMondayOfWeek,
  getMonthGrid,
  getMonthTitle,
  getNextMonth,
  getPrevMonth,
  getWeekNumber,
} from "./dateUtils";

describe("formatDateKey", () => {
  it("zero-pads month and day to build a YYYY-MM-DD key", () => {
    expect(formatDateKey(2026, 9, 4)).toBe("2026-10-04");
    expect(formatDateKey(2026, 0, 5)).toBe("2026-01-05");
    expect(formatDateKey(2024, 11, 31)).toBe("2024-12-31");
  });
});

describe("getWeekNumber (ISO-8601)", () => {
  it("returns week 1 for a date inside the first ISO week", () => {
    expect(getWeekNumber(new Date(2026, 0, 1))).toBe(1);
  });

  it("rolls over the year boundary correctly", () => {
    // 31 Dec 2024 is a Tuesday: still ISO week 1 (of 2025).
    expect(getWeekNumber(new Date(2024, 11, 31))).toBe(1);
    // 2026 is a 53-week year: 31 Dec 2026 is week 53.
    expect(getWeekNumber(new Date(2026, 11, 31))).toBe(53);
  });

  it("keeps a full ISO week inside a single week number", () => {
    for (let day = 12; day <= 18; day++) {
      expect(getWeekNumber(new Date(2026, 9, day))).toBe(42);
    }
    expect(getWeekNumber(new Date(2026, 9, 19))).toBe(43);
  });
});

describe("getMondayOfWeek", () => {
  it("returns the Monday of the requested ISO week", () => {
    const monday = getMondayOfWeek(2026, 42);
    expect(monday.getDay()).toBe(1);
    expect(
      formatDateKey(monday.getFullYear(), monday.getMonth(), monday.getDate()),
    ).toBe("2026-10-12");
  });
});

describe("getDaysOfWeek", () => {
  it("returns 7 consecutive days from Monday to Sunday", () => {
    const week = getDaysOfWeek(2026, 42);

    expect(week).toHaveLength(7);
    expect(week.map((d) => d.dayName)).toEqual([
      "Lun",
      "Mar",
      "Mer",
      "Jeu",
      "Ven",
      "Sam",
      "Dim",
    ]);

    week.forEach((day, index) => {
      // JS Date: 1 = Monday ... 0 = Sunday on the 7th entry.
      const expectedDow = index < 6 ? index + 1 : 0;
      expect(new Date(day.year, day.month, day.dayNumber).getDay()).toBe(
        expectedDow,
      );
      expect(day.weekNumber).toBe(42);
      expect(day.dateKey).toBe(
        formatDateKey(day.year, day.month, day.dayNumber),
      );
    });

    expect(week[0].fullDateLabel).toBe("LUNDI 12 OCTOBRE");
    expect(week[6].dayNumber).toBe(18);
  });
});

describe("getMonthGrid", () => {
  it("builds every day of October 2026 with Monday-first leading blanks", () => {
    const grid = getMonthGrid(2026, 9);

    expect(grid.monthTitle).toBe("Octobre 2026");
    expect(grid.totalDays).toBe(31);
    expect(grid.days).toHaveLength(31);
    // 1 Oct 2026 is a Thursday → 3 leading blanks (Mon, Tue, Wed).
    expect(grid.leadingBlanks).toBe(3);
    expect(grid.days[0]).toEqual({
      dayNumber: 1,
      month: 9,
      year: 2026,
      dateKey: "2026-10-01",
      weekNumber: 40,
      isCurrentMonth: true,
    });
    expect(grid.days[30].dateKey).toBe("2026-10-31");
    expect(grid.days.every((d) => d.isCurrentMonth)).toBe(true);
  });

  it("handles February in a non-leap year", () => {
    const grid = getMonthGrid(2026, 1);
    expect(grid.totalDays).toBe(28);
    expect(grid.days).toHaveLength(28);
  });
});

describe("month navigation helpers", () => {
  it("wraps around year boundaries", () => {
    expect(getPrevMonth(0, 2026)).toEqual({ month: 11, year: 2025 });
    expect(getPrevMonth(5, 2026)).toEqual({ month: 4, year: 2026 });
    expect(getNextMonth(11, 2026)).toEqual({ month: 0, year: 2027 });
    expect(getNextMonth(5, 2026)).toEqual({ month: 6, year: 2026 });
  });

  it("formats month titles in French", () => {
    expect(getMonthTitle(9, 2026)).toBe("Octobre 2026");
    expect(getMonthTitle(0)).toBe("Janvier 2026");
    expect(getMonthTitle(11, 2025)).toBe("Décembre 2025");
  });
});

describe("getFullDateLabel", () => {
  it("renders the French weekday and month for a fixed date", () => {
    expect(getFullDateLabel(14, 9, 2026)).toBe("MERCREDI 14 OCTOBRE");
    expect(getFullDateLabel(1, 0, 2026)).toBe("JEUDI 1 JANVIER");
  });
});
