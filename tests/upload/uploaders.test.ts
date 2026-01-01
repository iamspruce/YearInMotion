import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock config
vi.mock('../../src/config/index.js', () => ({
    getConfig: vi.fn().mockReturnValue({
        gist: { id: 'test-gist', token: 'test-token' },
        meta: {
            pageAccessToken: 'test-meta-token',
            instagramId: 'test-ig-id',
            pageId: 'test-page-id',
        },
        youtube: {
            clientId: 'test-client-id',
            clientSecret: 'test-client-secret',
            refreshToken: 'test-refresh-token',
        },
        app: {
            dryRun: false,
            logLevel: 'info',
            timezone: 'UTC',
            contentType: 'year-progress',
        },
    }),
    RETRY_CONFIG: { maxRetries: 3, baseDelay: 100 },
}));

// Mock logger
vi.mock('../../src/utils/logger.js', () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
    },
}));

// Mock axios
vi.mock('axios', () => ({
    default: {
        post: vi.fn(),
        get: vi.fn(),
        put: vi.fn(),
    },
}));

// Mock fs
vi.mock('fs', () => ({
    default: {
        existsSync: vi.fn().mockReturnValue(true),
        readFileSync: vi.fn().mockReturnValue(Buffer.from('video content')),
        statSync: vi.fn().mockReturnValue({ size: 1000 }),
        createReadStream: vi.fn().mockReturnValue('stream'),
    },
}));

describe('Upload Clients', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('UploadOrchestrator', () => {
        it('should create with default uploaders', async () => {
            const { UploadOrchestrator } = await import('../../src/upload/index.js');
            const orchestrator = new UploadOrchestrator();

            const platforms = orchestrator.getPlatforms();
            expect(platforms).toContain('instagram');
            expect(platforms).toContain('facebook');
            expect(platforms).toContain('youtube');
        });

        it('should handle dry run mode', async () => {
            const { UploadOrchestrator } = await import('../../src/upload/index.js');
            const orchestrator = new UploadOrchestrator();

            const results = await orchestrator.uploadToAll('/path/to/video.mp4', 'Test caption', {
                dryRun: true,
            });

            expect(results.success).toBe(true);
            expect(results.results.successful).toHaveLength(3);
            results.results.successful.forEach((r) => {
                expect(r.result).toEqual({ dryRun: true });
            });
        });

        it('should filter platforms with uploadTo', async () => {
            const { UploadOrchestrator } = await import('../../src/upload/index.js');
            const orchestrator = new UploadOrchestrator();

            const results = await orchestrator.uploadTo(
                '/path/to/video.mp4',
                'Test caption',
                ['youtube'],
                { dryRun: true }
            );

            expect(results.results.successful).toHaveLength(1);
            expect(results.results.successful[0]?.platform).toBe('youtube');
        });

        it('should return empty results for unknown platforms', async () => {
            const { UploadOrchestrator } = await import('../../src/upload/index.js');
            const orchestrator = new UploadOrchestrator();

            const results = await orchestrator.uploadTo('/path/to/video.mp4', 'Test caption', [
                'unknown',
            ]);

            expect(results.success).toBe(false);
            expect(results.results.successful).toHaveLength(0);
        });
    });

    describe('BaseUploader', () => {
        it('should handle successful upload', async () => {
            const { createYouTubeUploader } = await import('../../src/upload/index.js');
            const uploader = createYouTubeUploader();

            const result = await uploader.upload('/path/to/video.mp4', 'Test caption', { dryRun: true });

            expect(result.success).toBe(true);
            expect(result.platform).toBe('youtube');
        });
    });
});
