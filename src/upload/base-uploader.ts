import type { UploadResult, UploadOptions, Platform } from '../types/index.js';
import { logger } from '../utils/logger.js';
import { RETRY_CONFIG } from '../config/index.js';

/**
 * Abstract base class for platform uploaders
 * Extend this class to add support for new platforms
 */
export abstract class BaseUploader {
    abstract readonly platform: Platform;

    /**
     * Upload the video to the platform
     * Implement this method in subclasses
     */
    protected abstract uploadImpl(videoPath: string, caption: string): Promise<Record<string, unknown>>;

    /**
     * Verify platform credentials are valid
     */
    abstract verifyCredentials(): Promise<boolean>;

    /**
     * Upload with retry logic
     */
    async upload(
        videoPath: string,
        caption: string,
        options: UploadOptions = {}
    ): Promise<UploadResult> {
        const maxRetries = options.maxRetries ?? RETRY_CONFIG.maxRetries;
        const baseDelay = options.baseDelay ?? RETRY_CONFIG.baseDelay;

        // Handle dry run
        if (options.dryRun) {
            logger.info(`[DRY RUN] Would upload to ${this.platform}`, {
                videoPath,
                captionLength: caption.length,
            });
            return {
                success: true,
                platform: this.platform,
                result: { dryRun: true },
            };
        }

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                logger.info(`Uploading to ${this.platform}`, {
                    attempt,
                    maxRetries,
                    videoPath,
                });

                const result = await this.uploadImpl(videoPath, caption);

                logger.info(`✓ ${this.platform} upload successful`, {
                    platform: this.platform,
                    result,
                });

                return {
                    success: true,
                    platform: this.platform,
                    result,
                };
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Unknown error';

                logger.error(`✗ ${this.platform} upload failed (attempt ${attempt}/${maxRetries})`, {
                    error: message,
                    platform: this.platform,
                });

                if (attempt === maxRetries) {
                    return {
                        success: false,
                        platform: this.platform,
                        error: message,
                    };
                }

                // Exponential backoff
                const delay = Math.pow(2, attempt - 1) * baseDelay;
                logger.info(`Retrying ${this.platform} in ${delay}ms...`);
                await this.sleep(delay);
            }
        }

        // This shouldn't be reached, but TypeScript needs it
        return {
            success: false,
            platform: this.platform,
            error: 'Max retries exceeded',
        };
    }

    /**
     * Sleep for a specified duration
     */
    protected sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    /**
     * Format caption with hashtags
     */
    protected formatCaption(caption: string, hashtags: string[]): string {
        if (hashtags.length === 0) return caption;
        return `${caption}\n\n${hashtags.join(' ')}`;
    }

    /**
     * Validate video file exists and is readable
     */
    protected validateVideoFile(videoPath: string): void {
        const fs = require('fs');
        if (!fs.existsSync(videoPath)) {
            throw new Error(`Video file not found: ${videoPath}`);
        }
    }
}
