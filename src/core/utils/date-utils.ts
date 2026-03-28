/**
 * Date utility functions for relative time parsing and age calculations.
 * Used by listing parsers, date filters, and seller trust scoring.
 *
 * @module date-utils
 */

/**
 * Calculate the number of months between two dates.
 *
 * @param from - Start date
 * @param to - End date (defaults to now)
 * @returns Number of months (approximate)
 *
 * @example
 * ```typescript
 * const joined = new Date('2020-01-15');
 * monthsBetween(joined) // => ~62 (as of March 2025)
 * ```
 */
export function monthsBetween(from: Date, to: Date = new Date()): number {
  const years = to.getFullYear() - from.getFullYear();
  const months = to.getMonth() - from.getMonth();
  return years * 12 + months;
}

/**
 * Parse a "Joined in YYYY" or "Member since YYYY" string into a Date.
 *
 * @param joinText - Text containing join year/date info
 * @returns Parsed Date or null if unparseable
 *
 * @example
 * ```typescript
 * parseJoinDate('Joined Facebook in 2019') // => Date('2019-01-01')
 * parseJoinDate('Member since March 2020') // => Date('2020-03-01')
 * ```
 */
export function parseJoinDate(joinText: string): Date | null {
  if (!joinText) return null;

  // Match "YYYY" pattern
  const yearMatch = joinText.match(/\b(20\d{2}|19\d{2})\b/);
  if (!yearMatch) return null;

  const year = parseInt(yearMatch[1], 10);

  // Try to find month
  const months: Record<string, number> = {
    january: 0, february: 1, march: 2, april: 3,
    may: 4, june: 5, july: 6, august: 7,
    september: 8, october: 9, november: 10, december: 11,
    jan: 0, feb: 1, mar: 2, apr: 3,
    jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
  };

  const lower = joinText.toLowerCase();
  let month = 0; // Default to January
  for (const [name, idx] of Object.entries(months)) {
    if (lower.includes(name)) {
      month = idx;
      break;
    }
  }

  return new Date(year, month, 1);
}

/**
 * Format a Date into a human-readable relative time string.
 *
 * @param date - The date to format
 * @param now - Reference time (defaults to current time)
 * @returns Human-readable string like "2 hours ago", "3 days ago"
 *
 * @example
 * ```typescript
 * formatRelativeTime(new Date(Date.now() - 3600000)) // => "1 hour ago"
 * ```
 */
export function formatRelativeTime(date: Date, now: Date = new Date()): string {
  const diffMs = now.getTime() - date.getTime();

  if (diffMs < 0) return 'just now';

  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);

  if (seconds < 60) return 'just now';
  if (minutes === 1) return '1 minute ago';
  if (minutes < 60) return `${minutes} minutes ago`;
  if (hours === 1) return '1 hour ago';
  if (hours < 24) return `${hours} hours ago`;
  if (days === 1) return '1 day ago';
  if (days < 7) return `${days} days ago`;
  if (weeks === 1) return '1 week ago';
  if (weeks < 5) return `${weeks} weeks ago`;
  if (months === 1) return '1 month ago';
  return `${months} months ago`;
}

/**
 * Check if a date falls within a given time window from now.
 *
 * @param date - The date to check
 * @param hours - Maximum age in hours
 * @returns Whether the date is within the window
 *
 * @example
 * ```typescript
 * isWithinHours(new Date(Date.now() - 3600000), 24) // => true (1 hour ago, within 24h)
 * ```
 */
export function isWithinHours(date: Date, hours: number): boolean {
  const now = Date.now();
  const diff = now - date.getTime();
  return diff >= 0 && diff <= hours * 60 * 60 * 1000;
}

/**
 * Get the day of week name from a Date.
 *
 * @param date - The date
 * @returns Day name (e.g., "Monday")
 */
export function getDayOfWeek(date: Date): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[date.getDay()];
}

/**
 * Check if a date falls on a weekend (Saturday or Sunday).
 *
 * @param date - The date to check
 * @returns Whether the date is a weekend day
 */
export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}
