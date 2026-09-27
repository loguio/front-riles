/**
 * Date and Calendar helper utilities for Riles Running App
 */

export interface CalendarDayItem {
  dayName: string; // 'Lun', 'Mar', ...
  dayNumber: number; // 1-31
  month: number; // 0-11
  year: number;
  dateKey: string; // 'YYYY-MM-DD'
  fullDateLabel: string; // 'MERCREDI 14 OCTOBRE'
  weekNumber: number;
}

export interface MonthGridCell {
  dayNumber: number;
  month: number;
  year: number;
  dateKey: string;
  weekNumber: number;
  isCurrentMonth: boolean;
}

const FRENCH_DAYS_SHORT = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const FRENCH_DAYS_FULL = [
  "DIMANCHE",
  "LUNDI",
  "MARDI",
  "MERCREDI",
  "JEUDI",
  "VENDREDI",
  "SAMEDI",
];

const FRENCH_MONTHS_FULL = [
  "JANVIER",
  "FÉVRIER",
  "MARS",
  "AVRIL",
  "MAI",
  "JUIN",
  "JUILLET",
  "AOÛT",
  "SEPTEMBRE",
  "OCTOBRE",
  "NOVEMBRE",
  "DÉCEMBRE",
];

const FRENCH_MONTHS_TITLE = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];

/**
 * Returns ISO week number for a given date (1-53)
 */
export function getWeekNumber(date: Date): number {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
  // Set to nearest Thursday: current date + 4 - current day number (Monday=1, Sunday=7)
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/**
 * Returns the Monday Date for a given ISO week number in a given year
 */
export function getMondayOfWeek(year: number, week: number): Date {
  const jan4 = new Date(year, 0, 4);
  const dayOfWeek = jan4.getDay() || 7;
  const firstMonday = new Date(year, 0, 4 - (dayOfWeek - 1));
  return new Date(
    firstMonday.getFullYear(),
    firstMonday.getMonth(),
    firstMonday.getDate() + (week - 1) * 7,
  );
}

/**
 * Formats a Date to 'YYYY-MM-DD' key
 */
export function formatDateKey(
  year: number,
  month: number,
  day: number,
): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * Returns the 7 days (Monday through Sunday) for a given week
 */
export function getDaysOfWeek(year = 2026, weekNumber = 42): CalendarDayItem[] {
  const monday = getMondayOfWeek(year, weekNumber);

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(
      monday.getFullYear(),
      monday.getMonth(),
      monday.getDate() + i,
    );
    const dayIndex = d.getDay(); // 0 is Sunday
    const month = d.getMonth();
    const dayNumber = d.getDate();
    const fullYear = d.getFullYear();
    const dateKey = formatDateKey(fullYear, month, dayNumber);
    const fullDateLabel = `${FRENCH_DAYS_FULL[dayIndex]} ${dayNumber} ${FRENCH_MONTHS_FULL[month]}`;
    const week = getWeekNumber(d);

    return {
      dayName: FRENCH_DAYS_SHORT[i],
      dayNumber,
      month,
      year: fullYear,
      dateKey,
      fullDateLabel,
      weekNumber: week,
    };
  });
}

/**
 * Returns month grid information for any month/year
 */
export function getMonthGrid(year = 2026, month = 9) {
  const firstDay = new Date(year, month, 1);
  const totalDays = new Date(year, month + 1, 0).getDate();

  // Day of week: 0 = Sun, 1 = Mon, ..., 6 = Sat -> Monday = 0, Sunday = 6
  const rawDay = firstDay.getDay();
  const leadingBlanks = (rawDay + 6) % 7;

  const days: MonthGridCell[] = [];
  for (let day = 1; day <= totalDays; day++) {
    const date = new Date(year, month, day);
    const dateKey = formatDateKey(year, month, day);
    const weekNumber = getWeekNumber(date);
    days.push({
      dayNumber: day,
      month,
      year,
      dateKey,
      weekNumber,
      isCurrentMonth: true,
    });
  }

  return {
    year,
    month,
    monthTitle: getMonthTitle(month, year),
    totalDays,
    leadingBlanks,
    days,
  };
}

/**
 * Returns month title like "Octobre 2026" for a given month index & year
 */
export function getMonthTitle(monthIndex: number, year = 2026): string {
  return `${FRENCH_MONTHS_TITLE[monthIndex]} ${year}`;
}

/**
 * Returns previous month { month, year }
 */
export function getPrevMonth(month: number, year: number) {
  if (month === 0) {
    return { month: 11, year: year - 1 };
  }
  return { month: month - 1, year };
}

/**
 * Returns next month { month, year }
 */
export function getNextMonth(month: number, year: number) {
  if (month === 11) {
    return { month: 0, year: year + 1 };
  }
  return { month: month + 1, year };
}

/**
 * Returns full date label for a day
 */
export function getFullDateLabel(
  dayNumber: number,
  month = 9,
  year = 2026,
): string {
  const d = new Date(year, month, dayNumber);
  const dayIndex = d.getDay();
  return `${FRENCH_DAYS_FULL[dayIndex]} ${dayNumber} ${FRENCH_MONTHS_FULL[month]}`;
}
