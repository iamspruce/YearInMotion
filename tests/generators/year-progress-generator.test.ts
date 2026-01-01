import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { StateData } from '../../src/types/index.js';

// Mock dependencies
vi.mock('../../src/utils/progress-calculator.js', () => ({
    calculateYearProgress: vi.fn().mockReturnValue({
        year: 2025,
        percent: 50,
        dayOfYear: 182,
        totalDays: 365,
        isLeapYear: false,
        date: '2025-07-01T00:00:00.000Z',
    }),
}));

vi.mock('../../src/utils/asset-picker.js', () => ({
    getRandomText: vi.fn().mockReturnValue('2025 is 50% complete 🔥'),
    getHashtags: vi.fn().mockReturnValue(['#yearProgress', '#2025']),
}));

vi.mock('../../src/utils/logger.js', () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
    },
}));

vi.mock('../../src/render/index.js', () => ({
    renderVideo: vi.fn().mockResolvedValue({
        videoPath: '/path/to/video.mp4',
        caption: '2025 is 50% complete 🔥',
        metadata: {
            background: 'bg1.jpg',
            audio: 'audio1.mp3',
            duration: 5,
            resolution: '1080x1920',
        },
    }),
}));

describe('YearProgressGenerator', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('contentType', () => {
        it('should have correct content type', async () => {
            const { YearProgressGenerator } = await import(
                '../../src/generators/year-progress-generator.js'
            );
            const generator = new YearProgressGenerator();

            expect(generator.contentType).toBe('year-progress');
        });
    });

    describe('getCurrentIdentifier', () => {
        it('should return current percentage', async () => {
            const { YearProgressGenerator } = await import(
                '../../src/generators/year-progress-generator.js'
            );
            const generator = new YearProgressGenerator();

            expect(generator.getCurrentIdentifier()).toBe(50);
        });
    });

    describe('getYearProgress', () => {
        it('should return year progress data', async () => {
            const { YearProgressGenerator } = await import(
                '../../src/generators/year-progress-generator.js'
            );
            const generator = new YearProgressGenerator();
            const progress = generator.getYearProgress();

            expect(progress.year).toBe(2025);
            expect(progress.percent).toBe(50);
            expect(progress.dayOfYear).toBe(182);
        });
    });

    describe('shouldGenerate', () => {
        it('should return true when no previous state', async () => {
            const { YearProgressGenerator } = await import(
                '../../src/generators/year-progress-generator.js'
            );
            const generator = new YearProgressGenerator();

            const result = await generator.shouldGenerate(null);
            expect(result).toBe(true);
        });

        it('should return true when content type differs', async () => {
            const { YearProgressGenerator } = await import(
                '../../src/generators/year-progress-generator.js'
            );
            const generator = new YearProgressGenerator();

            const lastState: StateData = {
                lastValue: 50,
                lastDate: '2025-01-01T00:00:00.000Z',
                contentType: 'horoscope',
            };

            const result = await generator.shouldGenerate(lastState);
            expect(result).toBe(true);
        });

        it('should return true when year changed', async () => {
            const { YearProgressGenerator } = await import(
                '../../src/generators/year-progress-generator.js'
            );
            const generator = new YearProgressGenerator();

            const lastState: StateData = {
                lastValue: 99,
                lastDate: '2024-12-31T00:00:00.000Z',
                contentType: 'year-progress',
                year: 2024,
            };

            const result = await generator.shouldGenerate(lastState);
            expect(result).toBe(true);
        });

        it('should return true when percentage changed', async () => {
            const { YearProgressGenerator } = await import(
                '../../src/generators/year-progress-generator.js'
            );
            const generator = new YearProgressGenerator();

            const lastState: StateData = {
                lastValue: 49,
                lastDate: '2025-06-30T00:00:00.000Z',
                contentType: 'year-progress',
                year: 2025,
            };

            const result = await generator.shouldGenerate(lastState);
            expect(result).toBe(true);
        });

        it('should return false when percentage unchanged', async () => {
            const { YearProgressGenerator } = await import(
                '../../src/generators/year-progress-generator.js'
            );
            const generator = new YearProgressGenerator();

            const lastState: StateData = {
                lastValue: 50,
                lastDate: '2025-07-01T00:00:00.000Z',
                contentType: 'year-progress',
                year: 2025,
            };

            const result = await generator.shouldGenerate(lastState);
            expect(result).toBe(false);
        });
    });

    describe('generate', () => {
        it('should generate content with correct structure', async () => {
            const { YearProgressGenerator } = await import(
                '../../src/generators/year-progress-generator.js'
            );
            const generator = new YearProgressGenerator();

            const content = await generator.generate();

            expect(content.videoPath).toBe('/path/to/video.mp4');
            expect(content.caption).toBe('2025 is 50% complete 🔥');
            expect(content.hashtags).toEqual(['#yearProgress', '#2025']);
            expect(content.metadata.contentType).toBe('year-progress');
            expect(content.metadata.identifier).toBe(50);
        });
    });
});
