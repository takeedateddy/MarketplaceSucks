import { describe, it, expect } from 'vitest';
import {
  monthsBetween,
  parseJoinDate,
  formatRelativeTime,
  isWithinHours,
  getDayOfWeek,
  isWeekend,
} from './date-utils';

describe('monthsBetween', () => {
  it('returns 0 for same date', () => {
    const d = new Date(2024, 5, 15);
    expect(monthsBetween(d, d)).toBe(0);
  });

  it('calculates months correctly', () => {
    const from = new Date(2024, 0, 1); // Jan 2024
    const to = new Date(2024, 6, 1);   // Jul 2024
    expect(monthsBetween(from, to)).toBe(6);
  });

  it('handles cross-year', () => {
    const from = new Date(2023, 10, 1); // Nov 2023
    const to = new Date(2024, 2, 1);    // Mar 2024
    expect(monthsBetween(from, to)).toBe(4);
  });
});

describe('parseJoinDate', () => {
  it('returns null for empty string', () => {
    expect(parseJoinDate('')).toBeNull();
  });

  it('parses "Joined in 2019"', () => {
    const result = parseJoinDate('Joined in 2019');
    expect(result).toBeInstanceOf(Date);
    expect(result!.getFullYear()).toBe(2019);
    expect(result!.getMonth()).toBe(0); // defaults to January
  });

  it('parses "Member since March 2020"', () => {
    const result = parseJoinDate('Member since March 2020');
    expect(result).toBeInstanceOf(Date);
    expect(result!.getFullYear()).toBe(2020);
    expect(result!.getMonth()).toBe(2); // March
  });

  it('returns null when no year found', () => {
    expect(parseJoinDate('Joined recently')).toBeNull();
  });

  it('handles abbreviated month names', () => {
    const result = parseJoinDate('Joined Sep 2021');
    expect(result).toBeInstanceOf(Date);
    expect(result!.getMonth()).toBe(8); // September
  });
});

describe('formatRelativeTime', () => {
  const now = new Date('2024-06-15T12:00:00Z');

  it('returns "just now" for less than 60 seconds', () => {
    const date = new Date(now.getTime() - 30 * 1000);
    expect(formatRelativeTime(date, now)).toBe('just now');
  });

  it('returns "1 minute ago" for 1 minute', () => {
    const date = new Date(now.getTime() - 60 * 1000);
    expect(formatRelativeTime(date, now)).toBe('1 minute ago');
  });

  it('returns "N minutes ago"', () => {
    const date = new Date(now.getTime() - 30 * 60 * 1000);
    expect(formatRelativeTime(date, now)).toBe('30 minutes ago');
  });

  it('returns "1 hour ago"', () => {
    const date = new Date(now.getTime() - 60 * 60 * 1000);
    expect(formatRelativeTime(date, now)).toBe('1 hour ago');
  });

  it('returns "N hours ago"', () => {
    const date = new Date(now.getTime() - 5 * 60 * 60 * 1000);
    expect(formatRelativeTime(date, now)).toBe('5 hours ago');
  });

  it('returns "1 day ago"', () => {
    const date = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    expect(formatRelativeTime(date, now)).toBe('1 day ago');
  });

  it('returns "just now" for future dates', () => {
    const date = new Date(now.getTime() + 60 * 60 * 1000);
    expect(formatRelativeTime(date, now)).toBe('just now');
  });
});

describe('isWithinHours', () => {
  it('returns true when within window', () => {
    const date = new Date(Date.now() - 1 * 60 * 60 * 1000); // 1 hour ago
    expect(isWithinHours(date, 24)).toBe(true);
  });

  it('returns false when outside window', () => {
    const date = new Date(Date.now() - 48 * 60 * 60 * 1000); // 48 hours ago
    expect(isWithinHours(date, 24)).toBe(false);
  });

  it('returns true for zero diff (now)', () => {
    const date = new Date();
    expect(isWithinHours(date, 1)).toBe(true);
  });

  it('returns false for future dates', () => {
    const date = new Date(Date.now() + 60 * 60 * 1000);
    expect(isWithinHours(date, 24)).toBe(false);
  });
});

describe('getDayOfWeek', () => {
  it('returns correct day names', () => {
    // 2024-06-10 is a Monday
    expect(getDayOfWeek(new Date(2024, 5, 10))).toBe('Monday');
    expect(getDayOfWeek(new Date(2024, 5, 15))).toBe('Saturday');
    expect(getDayOfWeek(new Date(2024, 5, 16))).toBe('Sunday');
  });
});

describe('isWeekend', () => {
  it('returns true for Saturday', () => {
    expect(isWeekend(new Date(2024, 5, 15))).toBe(true); // Saturday
  });

  it('returns true for Sunday', () => {
    expect(isWeekend(new Date(2024, 5, 16))).toBe(true); // Sunday
  });

  it('returns false for weekdays', () => {
    expect(isWeekend(new Date(2024, 5, 10))).toBe(false); // Monday
    expect(isWeekend(new Date(2024, 5, 12))).toBe(false); // Wednesday
    expect(isWeekend(new Date(2024, 5, 14))).toBe(false); // Friday
  });
});
