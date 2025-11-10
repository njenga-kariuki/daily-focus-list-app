/**
 * Parses a date string in "YYYY-MM-DD" format as local midnight.
 * This avoids timezone issues where new Date("2024-11-09") gets parsed as UTC midnight,
 * which can show as the previous day in timezones behind UTC.
 *
 * @param dateStr - Date string in "YYYY-MM-DD" format
 * @returns Date object representing midnight in local timezone
 */
export function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day); // month is 0-indexed in JS
}
