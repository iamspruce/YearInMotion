import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    calculateYearProgress,
    isLeapYear,
    getDaysInYear,
    formatPercent,
    getProgressMessage,
} from '../../src/utils/progress-calculator.js';

describe('progress-calculator', () => {
    describe('calculateYearProgress', () => {
        it('should calculate progress for the start of year', () => {
            const date = new Date(2025, 0, 1); // January 1, 2025
            const result = calculateYearProgress(date);

            expect(result.year).toBe(2025);
            expect(result.dayOfYear).toBe(1);
            expect(result.percent).toBe(0);
            expect(result.totalDays).toBe(365);
            expect(result.isLeapYear).toBe(false);
        });

        it('should calculate progress for mid-year', () => {
            const date = new Date(2025, 6, 1); // July 1, 2025
            const result = calculateYearProgress(date);

            expect(result.year).toBe(2025);
            expect(result.dayOfYear).toBe(182);
            expect(result.percent).toBe(49); // ~49.8%
        });

        it('should calculate progress for end of year', () => {
            const date = new Date(2025, 11, 31); // December 31, 2025
            const result = calculateYearProgress(date);

            expect(result.year).toBe(2025);
            expect(result.dayOfYear).toBe(365);
            expect(result.percent).toBe(100);
        });

        it('should handle leap year correctly', () => {
            const date = new Date(2024, 0, 1); // 2024 is a leap year
            const result = calculateYearProgress(date);

            expect(result.year).toBe(2024);
            expect(result.totalDays).toBe(366);
            expect(result.isLeapYear).toBe(true);
        });

        it('should use current date when no date provided', () => {
            const result = calculateYearProgress();

            expect(result.year).toBe(new Date().getFullYear());
            expect(result.dayOfYear).toBeGreaterThan(0);
            expect(result.percent).toBeGreaterThanOrEqual(0);
            expect(result.percent).toBeLessThanOrEqual(100);
        });

        it('should include ISO date string', () => {
            const date = new Date(2025, 5, 15);
            const result = calculateYearProgress(date);

            expect(result.date).toMatch(/^\d{4}-\d{2}-\d{2}T/);
        });
    });

    describe('isLeapYear', () => {
        it('should return true for year divisible by 4 but not 100', () => {
            expect(isLeapYear(2024)).toBe(true);
            expect(isLeapYear(2028)).toBe(true);
        });

        it('should return false for year divisible by 100 but not 400', () => {
            expect(isLeapYear(1900)).toBe(false);
            expect(isLeapYear(2100)).toBe(false);
        });

        it('should return true for year divisible by 400', () => {
            expect(isLeapYear(2000)).toBe(true);
            expect(isLeapYear(2400)).toBe(true);
        });

        it('should return false for regular years', () => {
            expect(isLeapYear(2025)).toBe(false);
            expect(isLeapYear(2023)).toBe(false);
        });
    });

    describe('getDaysInYear', () => {
        it('should return 365 for non-leap year', () => {
            expect(getDaysInYear(2025)).toBe(365);
        });

        it('should return 366 for leap year', () => {
            expect(getDaysInYear(2024)).toBe(366);
        });
    });

    describe('formatPercent', () => {
        it('should format percentage with symbol', () => {
            expect(formatPercent(50)).toBe('50%');
            expect(formatPercent(100)).toBe('100%');
            expect(formatPercent(0)).toBe('0%');
        });
    });

    describe('getProgressMessage', () => {
        it('should return appropriate message for different progress levels', () => {
            expect(getProgressMessage(5)).toContain('beginning');
            expect(getProgressMessage(20)).toContain('momentum');
            expect(getProgressMessage(45)).toContain('halfway');
            expect(getProgressMessage(60)).toContain('halfway');
            expect(getProgressMessage(85)).toContain('stretch');
            expect(getProgressMessage(95)).toContain('complete');
        });
    });
});
