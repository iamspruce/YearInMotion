import type { YearProgress } from '../types/index.js';

/**
 * Calculate the current year progress
 *
 * @param date - Optional date to calculate progress for (defaults to now)
 * @param timezone - Optional timezone (IANA format, defaults to UTC)
 * @returns Year progress data
 */
export function calculateYearProgress(date?: Date, timezone?: string): YearProgress {
    // Use provided date or current date
    const now = date ?? new Date();

    // Apply timezone if specified
    let workingDate = now;
    if (timezone && timezone !== 'UTC') {
        try {
            const formatter = new Intl.DateTimeFormat('en-US', {
                timeZone: timezone,
                year: 'numeric',
                month: 'numeric',
                day: 'numeric',
                hour: 'numeric',
                minute: 'numeric',
                second: 'numeric',
            });
            const parts = formatter.formatToParts(now);
            const getPart = (type: string): string =>
                parts.find((p) => p.type === type)?.value ?? '0';

            workingDate = new Date(
                parseInt(getPart('year'), 10),
                parseInt(getPart('month'), 10) - 1,
                parseInt(getPart('day'), 10),
                parseInt(getPart('hour'), 10),
                parseInt(getPart('minute'), 10),
                parseInt(getPart('second'), 10)
            );
        } catch {
            // Fall back to original date if timezone parsing fails
            workingDate = now;
        }
    }

    const year = workingDate.getFullYear();
    const start = new Date(year, 0, 1); // January 1st
    const end = new Date(year + 1, 0, 1); // Next January 1st

    // Calculate day of year (1-indexed)
    const dayOfYear = Math.floor((workingDate.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    // Calculate total days in year
    const totalDays = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    // Calculate percentage (rounded down to nearest integer)
    const percent = Math.floor((dayOfYear / totalDays) * 100);

    return {
        year,
        percent,
        dayOfYear,
        totalDays,
        isLeapYear: totalDays === 366,
        date: now.toISOString(),
    };
}

/**
 * Check if a date is a leap year
 */
export function isLeapYear(year: number): boolean {
    return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/**
 * Get total days in a year
 */
export function getDaysInYear(year: number): number {
    return isLeapYear(year) ? 366 : 365;
}

/**
 * Format a percentage for display
 */
export function formatPercent(percent: number): string {
    return `${percent}%`;
}

/**
 * Get a motivational message based on progress
 */
export function getProgressMessage(percent: number): string {
    if (percent < 10) return "Fresh start! The year is just beginning 🌱";
    if (percent < 25) return "Great momentum! Keep building 💪";
    if (percent < 50) return "Almost halfway there! Stay focused 🎯";
    if (percent < 75) return "More than halfway! Keep pushing 🚀";
    if (percent < 90) return "Final stretch! Finish strong 🏁";
    return "Year almost complete! Reflect and celebrate 🎉";
}
