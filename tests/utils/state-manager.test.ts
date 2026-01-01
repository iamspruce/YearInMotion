import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Octokit } from '@octokit/rest';

// Mock Octokit
vi.mock('@octokit/rest', () => ({
    Octokit: vi.fn().mockImplementation(() => ({
        gists: {
            get: vi.fn(),
            update: vi.fn(),
        },
    })),
}));

// Mock logger to prevent console output during tests
vi.mock('../../src/utils/logger.js', () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
    },
}));

describe('state-manager', () => {
    let mockOctokit: {
        gists: {
            get: ReturnType<typeof vi.fn>;
            update: ReturnType<typeof vi.fn>;
        };
    };

    beforeEach(() => {
        vi.clearAllMocks();
        mockOctokit = {
            gists: {
                get: vi.fn(),
                update: vi.fn(),
            },
        };
        (Octokit as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => mockOctokit);
    });

    describe('getLastPosted', () => {
        it('should return state when gist exists', async () => {
            const mockState = {
                lastValue: 50,
                lastDate: '2025-01-01T00:00:00.000Z',
                contentType: 'year-progress',
                year: 2025,
            };

            mockOctokit.gists.get.mockResolvedValue({
                data: {
                    files: {
                        'last_posted.json': {
                            content: JSON.stringify(mockState),
                        },
                    },
                },
            });

            const { getLastPosted } = await import('../../src/utils/state-manager.js');
            const result = await getLastPosted('gist-id', 'token');

            expect(result).toEqual(mockState);
        });

        it('should return null when gist file does not exist', async () => {
            mockOctokit.gists.get.mockResolvedValue({
                data: {
                    files: {},
                },
            });

            const { getLastPosted } = await import('../../src/utils/state-manager.js');
            const result = await getLastPosted('gist-id', 'token');

            expect(result).toBeNull();
        });

        it('should return null on error', async () => {
            mockOctokit.gists.get.mockRejectedValue(new Error('API Error'));

            const { getLastPosted } = await import('../../src/utils/state-manager.js');
            const result = await getLastPosted('gist-id', 'token');

            expect(result).toBeNull();
        });
    });

    describe('updateLastPosted', () => {
        it('should update gist with new state', async () => {
            mockOctokit.gists.update.mockResolvedValue({});

            const { updateLastPosted } = await import('../../src/utils/state-manager.js');
            const state = {
                lastValue: 60,
                lastDate: '2025-01-01T00:00:00.000Z',
                contentType: 'year-progress',
                year: 2025,
            };

            const result = await updateLastPosted('gist-id', 'token', state);

            expect(mockOctokit.gists.update).toHaveBeenCalledWith({
                gist_id: 'gist-id',
                files: {
                    'last_posted.json': {
                        content: expect.any(String),
                    },
                },
            });

            expect(result.lastValue).toBe(60);
            expect(result.contentType).toBe('year-progress');
        });

        it('should throw error on update failure', async () => {
            mockOctokit.gists.update.mockRejectedValue(new Error('Update failed'));

            const { updateLastPosted } = await import('../../src/utils/state-manager.js');
            const state = {
                lastValue: 60,
                lastDate: '2025-01-01T00:00:00.000Z',
                contentType: 'year-progress',
            };

            await expect(updateLastPosted('gist-id', 'token', state)).rejects.toThrow('Update failed');
        });
    });

    describe('shouldPost', () => {
        it('should return true when no previous state', async () => {
            mockOctokit.gists.get.mockResolvedValue({
                data: { files: {} },
            });

            const { shouldPost } = await import('../../src/utils/state-manager.js');
            const result = await shouldPost('gist-id', 'token', 50, 'year-progress', 2025);

            expect(result).toBe(true);
        });

        it('should return true when percentage changed', async () => {
            mockOctokit.gists.get.mockResolvedValue({
                data: {
                    files: {
                        'last_posted.json': {
                            content: JSON.stringify({
                                lastValue: 49,
                                lastDate: '2025-01-01T00:00:00.000Z',
                                contentType: 'year-progress',
                                year: 2025,
                            }),
                        },
                    },
                },
            });

            const { shouldPost } = await import('../../src/utils/state-manager.js');
            const result = await shouldPost('gist-id', 'token', 50, 'year-progress', 2025);

            expect(result).toBe(true);
        });

        it('should return false when percentage unchanged', async () => {
            mockOctokit.gists.get.mockResolvedValue({
                data: {
                    files: {
                        'last_posted.json': {
                            content: JSON.stringify({
                                lastValue: 50,
                                lastDate: '2025-01-01T00:00:00.000Z',
                                contentType: 'year-progress',
                                year: 2025,
                            }),
                        },
                    },
                },
            });

            const { shouldPost } = await import('../../src/utils/state-manager.js');
            const result = await shouldPost('gist-id', 'token', 50, 'year-progress', 2025);

            expect(result).toBe(false);
        });

        it('should return true when year changed', async () => {
            mockOctokit.gists.get.mockResolvedValue({
                data: {
                    files: {
                        'last_posted.json': {
                            content: JSON.stringify({
                                lastValue: 99,
                                lastDate: '2024-12-31T00:00:00.000Z',
                                contentType: 'year-progress',
                                year: 2024,
                            }),
                        },
                    },
                },
            });

            const { shouldPost } = await import('../../src/utils/state-manager.js');
            const result = await shouldPost('gist-id', 'token', 1, 'year-progress', 2025);

            expect(result).toBe(true);
        });
    });

    describe('createInitialState', () => {
        it('should create state with all fields', async () => {
            const { createInitialState } = await import('../../src/utils/state-manager.js');
            const state = createInitialState('year-progress', 50, 2025);

            expect(state.contentType).toBe('year-progress');
            expect(state.lastValue).toBe(50);
            expect(state.year).toBe(2025);
            expect(state.lastDate).toBeDefined();
        });

        it('should create state without year when not provided', async () => {
            const { createInitialState } = await import('../../src/utils/state-manager.js');
            const state = createInitialState('horoscope', 'aries_2025-01-01');

            expect(state.contentType).toBe('horoscope');
            expect(state.lastValue).toBe('aries_2025-01-01');
            expect(state.year).toBeUndefined();
        });
    });
});
