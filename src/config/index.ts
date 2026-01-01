import { z } from 'zod';
import dotenv from 'dotenv';
import type { AppConfig, LogLevel } from '../types/index.js';

// Load environment variables
dotenv.config();

/**
 * Environment variable schema with validation
 */
const envSchema = z.object({
    // State Management
    GIST_ID: z.string().min(1, 'GIST_ID is required'),
    GITHUB_TOKEN: z.string().min(1, 'GITHUB_TOKEN is required'),

    // Meta API
    META_PAGE_ACCESS_TOKEN: z.string().min(1, 'META_PAGE_ACCESS_TOKEN is required'),
    META_INSTAGRAM_ID: z.string().min(1, 'META_INSTAGRAM_ID is required'),
    META_PAGE_ID: z.string().min(1, 'META_PAGE_ID is required'),

    // YouTube API
    YOUTUBE_CLIENT_ID: z.string().min(1, 'YOUTUBE_CLIENT_ID is required'),
    YOUTUBE_CLIENT_SECRET: z.string().min(1, 'YOUTUBE_CLIENT_SECRET is required'),
    YOUTUBE_REFRESH_TOKEN: z.string().min(1, 'YOUTUBE_REFRESH_TOKEN is required'),

    // Application Settings
    DRY_RUN: z.string().optional().default('false'),
    LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).optional().default('info'),
    TIMEZONE: z.string().optional().default('UTC'),
    CONTENT_TYPE: z.string().optional().default('year-progress'),
});

/**
 * Parse and validate environment variables
 */
function parseEnv(): z.infer<typeof envSchema> {
    const result = envSchema.safeParse(process.env);

    if (!result.success) {
        const errors = result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
        throw new Error(`Environment validation failed:\n${errors.join('\n')}`);
    }

    return result.data;
}

/**
 * Get validated application configuration
 */
export function getConfig(): AppConfig {
    const env = parseEnv();

    return {
        gist: {
            id: env.GIST_ID,
            token: env.GITHUB_TOKEN,
        },
        meta: {
            pageAccessToken: env.META_PAGE_ACCESS_TOKEN,
            instagramId: env.META_INSTAGRAM_ID,
            pageId: env.META_PAGE_ID,
        },
        youtube: {
            clientId: env.YOUTUBE_CLIENT_ID,
            clientSecret: env.YOUTUBE_CLIENT_SECRET,
            refreshToken: env.YOUTUBE_REFRESH_TOKEN,
        },
        app: {
            dryRun: env.DRY_RUN.toLowerCase() === 'true',
            logLevel: env.LOG_LEVEL as LogLevel,
            timezone: env.TIMEZONE,
            contentType: env.CONTENT_TYPE,
        },
    };
}

/**
 * Check if running in dry-run mode
 */
export function isDryRun(): boolean {
    return process.env.DRY_RUN?.toLowerCase() === 'true';
}

/**
 * Get log level from environment
 */
export function getLogLevel(): LogLevel {
    const level = process.env.LOG_LEVEL?.toLowerCase();
    if (level === 'error' || level === 'warn' || level === 'info' || level === 'debug') {
        return level;
    }
    return 'info';
}

/**
 * Video rendering configuration
 */
export const RENDER_CONFIG = {
    width: 1080,
    height: 1920,
    fps: 30,
    minDuration: 3, // Minimum video length
    animationSpeed: 20, // Percent per second (e.g., 20% = 5 seconds for 100%)
    pauseDuration: 2, // Seconds to hold at the end
    fontFamily: 'Primary',
    fontSize: 80,
} as const;

/**
 * Default retry configuration
 */
export const RETRY_CONFIG = {
    maxRetries: 3,
    baseDelay: 1000, // ms
} as const;

/**
 * Asset paths (relative to project root)
 */
export const ASSET_PATHS = {
    backgrounds: 'assets/backgrounds',
    audio: 'assets/audio',
    fonts: 'assets/fonts',
    texts: 'config/texts.json',
    videos: 'videos',
    logs: 'logs',
} as const;

/**
 * Minimum required assets
 */
export const ASSET_REQUIREMENTS = {
    backgrounds: 1, // Can work with 1, but 6+ recommended
    audio: 1, // Can work with 1, but 6+ recommended
    fonts: 1,
} as const;
