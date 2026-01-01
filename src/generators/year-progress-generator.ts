import type { StateData } from '../types/index.js';
import { BaseContentGenerator } from './base-generator.js';
import { calculateYearProgress } from '../utils/progress-calculator.js';
import { getRandomText, getHashtags } from '../utils/asset-picker.js';
import { logger } from '../utils/logger.js';

/**
 * Year Progress Content Generator
 * Generates daily year progress videos showing percentage of year completed
 */
export class YearProgressGenerator extends BaseContentGenerator {
    readonly contentType = 'year-progress';

    private yearProgress = calculateYearProgress();

    /**
     * Recalculate year progress (useful if instance is long-lived)
     */
    refresh(): void {
        this.yearProgress = calculateYearProgress();
    }

    protected getText(): string {
        const daysLeft = this.yearProgress.totalDays - this.yearProgress.dayOfYear;
        const mainText = getRandomText('yearProgress', {
            percent: this.yearProgress.percent,
            year: this.yearProgress.year,
            dayOfYear: this.yearProgress.dayOfYear,
        });

        return `${mainText}\n${daysLeft} days left`;
    }

    protected getPercent(): number {
        return this.yearProgress.percent;
    }

    protected getHashtags(): string[] {
        return getHashtags('yearProgress');
    }

    override getCurrentIdentifier(): number {
        return this.yearProgress.percent;
    }

    protected override getAdditionalMetadata(): Record<string, unknown> {
        return {
            year: this.yearProgress.year,
            dayOfYear: this.yearProgress.dayOfYear,
            totalDays: this.yearProgress.totalDays,
            isLeapYear: this.yearProgress.isLeapYear,
        };
    }

    override async shouldGenerate(lastState: StateData | null): Promise<boolean> {
        // No previous state - should generate
        if (!lastState) {
            logger.info('No previous state - should generate');
            return true;
        }

        // Different content type - should generate
        if (lastState.contentType !== this.contentType) {
            logger.info('Different content type - should generate');
            return true;
        }

        // New year - should generate
        if (lastState.year !== this.yearProgress.year) {
            logger.info('New year detected - should generate', {
                lastYear: lastState.year,
                currentYear: this.yearProgress.year,
            });
            return true;
        }

        // Different percentage - should generate
        const shouldGenerate = lastState.lastValue !== this.yearProgress.percent;

        logger.info('Checked if should generate', {
            lastPercent: lastState.lastValue,
            currentPercent: this.yearProgress.percent,
            shouldGenerate,
        });

        return shouldGenerate;
    }

    /**
     * Get the current year progress data
     */
    getYearProgress(): typeof this.yearProgress {
        return { ...this.yearProgress };
    }
}

/**
 * Factory function to create a YearProgressGenerator instance
 */
export function createYearProgressGenerator(): YearProgressGenerator {
    return new YearProgressGenerator();
}
