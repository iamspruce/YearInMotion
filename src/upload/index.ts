import type { MultiUploadResult, UploadOptions, UploadResult } from '../types/index.js';
import { BaseUploader } from './base-uploader.js';
import { InstagramUploader, createInstagramUploader } from './instagram-uploader.js';
import { FacebookUploader, createFacebookUploader } from './facebook-uploader.js';
import { YouTubeUploader, createYouTubeUploader } from './youtube-uploader.js';
import { logger } from '../utils/logger.js';

/**
 * Upload orchestrator that manages uploads to multiple platforms
 */
export class UploadOrchestrator {
    private uploaders: BaseUploader[];

    constructor(uploaders?: BaseUploader[]) {
        this.uploaders = uploaders ?? [
            createInstagramUploader(),
            createFacebookUploader(),
            createYouTubeUploader(),
        ];
    }

    /**
     * Add an uploader to the orchestrator
     */
    addUploader(uploader: BaseUploader): void {
        this.uploaders.push(uploader);
    }

    /**
     * Remove an uploader by platform
     */
    removeUploader(platform: string): void {
        this.uploaders = this.uploaders.filter((u) => u.platform !== platform);
    }

    /**
     * Upload to all configured platforms
     *
     * @param videoPath - Path to the video file
     * @param caption - Caption for the post
     * @param options - Upload options
     * @returns Results for all platforms
     */
    async uploadToAll(
        videoPath: string,
        caption: string,
        options: UploadOptions = {}
    ): Promise<MultiUploadResult> {
        logger.info('Starting multi-platform upload', {
            videoPath,
            platforms: this.uploaders.map((u) => u.platform),
            dryRun: options.dryRun,
        });

        // Upload to all platforms concurrently
        const uploadPromises = this.uploaders.map((uploader) =>
            uploader.upload(videoPath, caption, options)
        );

        const results = await Promise.allSettled(uploadPromises);

        // Process results
        const successful: UploadResult[] = [];
        const failed: UploadResult[] = [];

        results.forEach((result, index) => {
            if (result.status === 'fulfilled') {
                if (result.value.success) {
                    successful.push(result.value);
                } else {
                    failed.push(result.value);
                }
            } else {
                const uploader = this.uploaders[index];
                failed.push({
                    success: false,
                    platform: uploader?.platform ?? 'unknown' as 'instagram',
                    error: result.reason instanceof Error ? result.reason.message : 'Unknown error',
                });
            }
        });

        // Log summary
        logger.info('Multi-platform upload complete', {
            total: this.uploaders.length,
            successful: successful.length,
            failed: failed.length,
        });

        if (failed.length > 0) {
            logger.warn('Some uploads failed', {
                failures: failed.map((f) => ({
                    platform: f.platform,
                    error: f.error,
                })),
            });
        }

        return {
            success: successful.length > 0,
            results: {
                successful,
                failed,
            },
        };
    }

    /**
     * Upload to specific platforms only
     *
     * @param videoPath - Path to the video file
     * @param caption - Caption for the post
     * @param platforms - Platforms to upload to
     * @param options - Upload options
     */
    async uploadTo(
        videoPath: string,
        caption: string,
        platforms: string[],
        options: UploadOptions = {}
    ): Promise<MultiUploadResult> {
        const filteredUploaders = this.uploaders.filter((u) => platforms.includes(u.platform));

        if (filteredUploaders.length === 0) {
            logger.warn('No matching uploaders found for specified platforms', { platforms });
            return {
                success: false,
                results: {
                    successful: [],
                    failed: [],
                },
            };
        }

        const tempOrchestrator = new UploadOrchestrator(filteredUploaders);
        return tempOrchestrator.uploadToAll(videoPath, caption, options);
    }

    /**
     * Get list of configured platforms
     */
    getPlatforms(): string[] {
        return this.uploaders.map((u) => u.platform);
    }
}

/**
 * Create upload orchestrator with default uploaders
 */
export function createUploadOrchestrator(): UploadOrchestrator {
    return new UploadOrchestrator();
}

/**
 * Convenience function to upload to all platforms
 */
export async function uploadToAllPlatforms(
    videoPath: string,
    caption: string,
    options: UploadOptions = {}
): Promise<MultiUploadResult> {
    const orchestrator = createUploadOrchestrator();
    return orchestrator.uploadToAll(videoPath, caption, options);
}

// Export uploaders for individual use
export { InstagramUploader, FacebookUploader, YouTubeUploader };
export { createInstagramUploader, createFacebookUploader, createYouTubeUploader };
