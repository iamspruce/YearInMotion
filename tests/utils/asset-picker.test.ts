import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';

// Mock fs and path for testing
vi.mock('fs');
vi.mock('path', async () => {
    const actual = await vi.importActual<typeof import('path')>('path');
    return {
        ...actual,
        join: vi.fn((...args: string[]) => args.join('/')),
    };
});

// We need to import after mocking
const mockFs = vi.mocked(fs);

describe('asset-picker', () => {
    beforeEach(() => {
        vi.resetModules();
        vi.clearAllMocks();
    });

    describe('getRandomFile', () => {
        it('should return a random file from directory', async () => {
            mockFs.existsSync.mockReturnValue(true);
            mockFs.readdirSync.mockReturnValue(['file1.jpg', 'file2.jpg', 'file3.jpg'] as any);

            const { getRandomFile } = await import('../../src/utils/asset-picker.js');

            // Mock Math.random to return predictable value
            const originalRandom = Math.random;
            Math.random = () => 0.5;

            try {
                const result = getRandomFile('assets/backgrounds');
                expect(result).toContain('file');
                expect(result).toContain('.jpg');
            } finally {
                Math.random = originalRandom;
            }
        });

        it('should throw error when directory is empty', async () => {
            mockFs.existsSync.mockReturnValue(true);
            mockFs.readdirSync.mockReturnValue([]);

            const { getRandomFile } = await import('../../src/utils/asset-picker.js');

            expect(() => getRandomFile('assets/backgrounds')).toThrow('No files found');
        });

        it('should exclude hidden files', async () => {
            mockFs.existsSync.mockReturnValue(true);
            mockFs.readdirSync.mockReturnValue(['.DS_Store', 'file1.jpg'] as any);

            const { getRandomFile } = await import('../../src/utils/asset-picker.js');

            const result = getRandomFile('assets/backgrounds');
            expect(result).not.toContain('.DS_Store');
        });
    });

    describe('validateAssets', () => {
        it('should return valid when all assets present', async () => {
            mockFs.existsSync.mockReturnValue(true);
            mockFs.readdirSync.mockImplementation((dirPath) => {
                const pathStr = String(dirPath);
                if (pathStr.includes('backgrounds')) {
                    return ['bg1.jpg'] as any;
                }
                if (pathStr.includes('audio')) {
                    return ['audio1.mp3'] as any;
                }
                if (pathStr.includes('fonts')) {
                    return ['font.ttf'] as any;
                }
                return [];
            });

            const { validateAssets } = await import('../../src/utils/asset-picker.js');
            const result = validateAssets();

            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
            expect(result.assets.backgrounds).toBe(1);
            expect(result.assets.audio).toBe(1);
            expect(result.assets.fonts).toBe(1);
        });

        it('should return errors when assets missing', async () => {
            mockFs.existsSync.mockImplementation((p) => {
                return !String(p).includes('texts.json');
            });
            mockFs.readdirSync.mockReturnValue([]);

            const { validateAssets } = await import('../../src/utils/asset-picker.js');
            const result = validateAssets();

            expect(result.valid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
        });
    });

    describe('getRandomText', () => {
        it('should return text with variables replaced', async () => {
            const mockConfig = {
                yearProgress: {
                    templates: ['Year is {percent}% complete'],
                    hashtags: ['#test'],
                },
            };

            mockFs.existsSync.mockReturnValue(true);
            mockFs.readFileSync.mockReturnValue(JSON.stringify(mockConfig));

            const { getRandomText } = await import('../../src/utils/asset-picker.js');
            const result = getRandomText('yearProgress', { percent: 50 });

            expect(result).toBe('Year is 50% complete');
        });

        it('should throw error for unknown content type', async () => {
            mockFs.existsSync.mockReturnValue(true);
            mockFs.readFileSync.mockReturnValue(JSON.stringify({}));

            const { getRandomText } = await import('../../src/utils/asset-picker.js');

            expect(() => getRandomText('unknown', {})).toThrow('No templates found');
        });
    });
});
