/**
 * Core Types for the Content Posting Application
 * These types are designed to be reusable across different content types
 * (year progress, horoscope, quotes, etc.)
 */

// ============================================
// Content Generation Types
// ============================================

/**
 * Interface for content generators.
 * Implement this interface to create new content types (e.g., horoscope, quote-of-the-day)
 */
export interface ContentGenerator {
    /** Unique identifier for this content type */
    readonly contentType: string;

    /** Generate content and return the result */
    generate(): Promise<GeneratedContent>;

    /** Check if new content should be generated (prevents duplicates) */
    shouldGenerate(lastState: StateData | null): Promise<boolean>;

    /** Get the unique identifier for the current content (e.g., percentage, date) */
    getCurrentIdentifier(): string | number;
}

/**
 * Result of content generation
 */
export interface GeneratedContent {
    /** Path to the generated video file */
    videoPath: string;

    /** Caption text for social media post */
    caption: string;

    /** Hashtags to append to the caption */
    hashtags: string[];

    /** Additional metadata about the generated content */
    metadata: ContentMetadata;
}

/**
 * Metadata about generated content
 */
export interface ContentMetadata {
    /** The content type (e.g., 'year-progress', 'horoscope') */
    contentType: string;

    /** Unique identifier for this content (e.g., percentage, zodiac sign) */
    identifier: string | number;

    /** Background image used */
    background: string;

    /** Audio track used */
    audio: string;

    /** Generation timestamp */
    generatedAt: string;

    /** Additional custom metadata */
    [key: string]: unknown;
}

// ============================================
// State Management Types
// ============================================

/**
 * State data stored in GitHub Gist
 */
export interface StateData {
    /** Last posted value/identifier */
    lastValue: string | number;

    /** ISO timestamp of last post */
    lastDate: string;

    /** Content type this state belongs to */
    contentType: string;

    /** Year (for year-based content) */
    year?: number;

    /** Additional custom state data */
    [key: string]: unknown;
}

// ============================================
// Upload Types
// ============================================

/**
 * Platform identifiers
 */
export type Platform = 'instagram' | 'facebook' | 'youtube' | 'tiktok';

/**
 * Result of a single platform upload
 */
export interface UploadResult {
    /** Whether the upload was successful */
    success: boolean;

    /** Platform identifier */
    platform: Platform;

    /** Platform-specific response data (e.g., post ID) */
    result?: Record<string, unknown>;

    /** Error message if failed */
    error?: string;
}

/**
 * Aggregated results from multi-platform upload
 */
export interface MultiUploadResult {
    /** Whether at least one platform succeeded */
    success: boolean;

    /** Results for each platform */
    results: {
        successful: UploadResult[];
        failed: UploadResult[];
    };
}

/**
 * Options for upload with retry
 */
export interface UploadOptions {
    /** Maximum number of retry attempts */
    maxRetries?: number;

    /** Base delay in ms for exponential backoff */
    baseDelay?: number;

    /** Whether to run in dry-run mode (no actual upload) */
    dryRun?: boolean;
}

// ============================================
// Progress Calculation Types
// ============================================

/**
 * Year progress data
 */
export interface YearProgress {
    /** Current year */
    year: number;

    /** Percentage of year completed (0-100) */
    percent: number;

    /** Current day of year (1-365/366) */
    dayOfYear: number;

    /** Total days in the year */
    totalDays: number;

    /** Whether it's a leap year */
    isLeapYear: boolean;

    /** Current date ISO string */
    date: string;
}

// ============================================
// Video Rendering Types
// ============================================

/**
 * Configuration for video rendering
 */
export interface RenderConfig {
    /** Video width in pixels */
    width: number;

    /** Video height in pixels */
    height: number;

    /** Frames per second */
    fps: number;

    /** Minimum video duration in seconds */
    minDuration: number;

    /** Animation speed (percent per second) */
    animationSpeed: number;

    /** Seconds to hold at the end */
    pauseDuration: number;

    /** Font family for text overlay */
    fontFamily: string;

    /** Font size for main text */
    fontSize: number;
}

/**
 * Result of video rendering
 */
export interface RenderResult {
    /** Path to the rendered video */
    videoPath: string;

    /** Caption used in the video */
    caption: string;

    /** Render metadata */
    metadata: {
        background: string;
        audio: string;
        duration: number;
        resolution: string;
    };
}

// ============================================
// Configuration Types
// ============================================

/**
 * Application configuration
 */
export interface AppConfig {
    /** GitHub Gist configuration */
    gist: {
        id: string;
        token: string;
    };

    /** Meta (Facebook/Instagram) configuration */
    meta: {
        pageAccessToken: string;
        instagramId: string;
        pageId: string;
    };

    /** YouTube configuration */
    youtube: {
        clientId: string;
        clientSecret: string;
        refreshToken: string;
    };

    /** Application settings */
    app: {
        dryRun: boolean;
        logLevel: LogLevel;
        timezone: string;
        contentType: string;
    };
}

/**
 * Log levels
 */
export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

/**
 * Log entry structure
 */
export interface LogEntry {
    timestamp: string;
    level: LogLevel;
    message: string;
    data?: Record<string, unknown>;
}

// ============================================
// Asset Types
// ============================================

/**
 * Asset file information
 */
export interface AssetInfo {
    path: string;
    name: string;
    type: 'background' | 'audio' | 'font';
}

/**
 * Asset validation result
 */
export interface AssetValidationResult {
    valid: boolean;
    errors: string[];
    assets: {
        backgrounds: number;
        audio: number;
        fonts: number;
    };
}
